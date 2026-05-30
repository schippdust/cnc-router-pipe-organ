/**
 * useOrganAudio.ts
 *
 * Thin p5.sound engine for the pipe organ. p5 v2 moved sound into the separate
 * `p5.sound` addon (a Tone.js wrapper) which attaches its classes onto a global
 * `p5` and references it as a free variable. In a bundler there is no global
 * `p5`, so we set `globalThis.p5` and then *dynamically* import the addon so the
 * side effect runs after the global exists.
 *
 * Exposes one shared engine (module singleton) with a reactive per-pipe
 * playing state, plus start/stop/setFrequency/setAmp controls. Audio must be
 * unlocked on a user gesture, so `start()` calls `userStartAudio()` first.
 */
import { reactive } from 'vue'
import p5 from 'p5'

/** Minimal slice of the p5.sound Oscillator API we rely on. */
interface Oscillator {
  start: () => void
  stop: () => void
  freq: (hz: number, rampSeconds?: number) => void
  amp: (level: number, rampSeconds?: number) => void
}
interface OscillatorCtor {
  new (freq: number, type?: string): Oscillator
}
/** p5 instance gains `userStartAudio()` from the addon. */
interface P5SoundInstance {
  userStartAudio: () => void
  remove: () => void
}

const FREQ_RAMP_SECONDS = 0.08
const AMP_RAMP_SECONDS = 0.1

const playing = reactive<Record<string, boolean>>({})

let sketch: P5SoundInstance | null = null
let OscillatorClass: OscillatorCtor | null = null
const oscillators = new Map<string, Oscillator>()
let initPromise: Promise<void> | null = null

/** Load p5.sound once and create the (canvas-less) p5 instance that owns audio. */
async function ensureInitialized (): Promise<void> {
  if (sketch && OscillatorClass) return
  if (!initPromise) {
    initPromise = (async () => {
      // Make p5 a global before the addon's side-effecting import runs.
      ;(globalThis as unknown as { p5: typeof p5 }).p5 = p5
      await import('p5.sound')

      OscillatorClass = (p5 as unknown as { Oscillator: OscillatorCtor }).Oscillator

      // Instance-mode sketch with no canvas — we only need it to own/resume
      // the audio context via userStartAudio().
      await new Promise<void>(resolve => {
        // eslint-disable-next-line no-new
        new p5(instance => {
          const p = instance as unknown as P5SoundInstance & {
            noCanvas: () => void
            setup: () => void
          }
          p.setup = () => {
            p.noCanvas()
            sketch = p
            resolve()
          }
        })
      })
    })()
  }
  await initPromise
}

function getOrCreate (pipeId: string, freq: number): Oscillator {
  let osc = oscillators.get(pipeId)
  if (!osc && OscillatorClass) {
    osc = new OscillatorClass(freq, 'sine')
    osc.amp(0)
    oscillators.set(pipeId, osc)
  }
  return osc!
}

export function useOrganAudio () {
  /** Start (or unmute) a pipe's drone. Must be called from a user gesture. */
  async function start (pipeId: string, freq: number, amp: number): Promise<void> {
    await ensureInitialized()
    sketch?.userStartAudio()
    const osc = getOrCreate(pipeId, freq)
    osc.freq(freq, FREQ_RAMP_SECONDS)
    osc.start()
    osc.amp(amp, AMP_RAMP_SECONDS)
    playing[pipeId] = true
  }

  /** Ramp a pipe down to silence and stop its oscillator. */
  function stop (pipeId: string): void {
    const osc = oscillators.get(pipeId)
    if (osc) {
      osc.amp(0, AMP_RAMP_SECONDS)
      // Let the amplitude ramp finish before stopping to avoid a click.
      setTimeout(() => osc.stop(), AMP_RAMP_SECONDS * 1000 + 20)
    }
    playing[pipeId] = false
  }

  /** Live-update pitch (used while dragging the length slider). */
  function setFrequency (pipeId: string, freq: number): void {
    oscillators.get(pipeId)?.freq(freq, FREQ_RAMP_SECONDS)
  }

  /** Update loudness (linear 0..1). */
  function setAmp (pipeId: string, amp: number): void {
    if (playing[pipeId]) oscillators.get(pipeId)?.amp(amp, AMP_RAMP_SECONDS)
  }

  function stopAll (): void {
    for (const id of oscillators.keys()) stop(id)
  }

  /** Tear down all oscillators and the owning p5 instance. */
  function dispose (): void {
    for (const osc of oscillators.values()) {
      try { osc.stop() } catch { /* already stopped */ }
    }
    oscillators.clear()
    for (const id of Object.keys(playing)) playing[id] = false
    sketch?.remove()
    sketch = null
    OscillatorClass = null
    initPromise = null
  }

  function isPlaying (pipeId: string): boolean {
    return !!playing[pipeId]
  }

  return { start, stop, setFrequency, setAmp, stopAll, dispose, isPlaying, playing }
}
