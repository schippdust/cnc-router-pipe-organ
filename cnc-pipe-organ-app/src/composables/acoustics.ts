/**
 * acoustics.ts
 *
 * Pure, framework-free helpers for the open-pipe organ model. Kept side-effect
 * free so they can be reused by both pipes and unit-tested in isolation.
 *
 * Open organ pipe (open at both ends) fundamental:
 *   f = v / (2 * Leff)
 * where v is the temperature-dependent speed of sound and Leff is the pipe
 * length plus an end correction that accounts for the pipe's diameter.
 */

const FEET_TO_METERS = 0.3048
const INCHES_PER_FOOT = 12

/**
 * End-correction factor (× diameter) for a pipe open at both ends. Each open
 * end behaves ~0.6·radius longer than it measures (≈0.3·diameter); two ends
 * give ≈0.6·diameter total. Wider pipe → longer effective length → lower pitch.
 */
const END_CORRECTION_PER_DIAMETER = 0.6

/** Allowable input ranges, shared by the sliders and the achievable-note math. */
export const PIPE_LENGTH_FT = { min: 5, max: 10 } as const
export const PIPE_DIAMETER_IN = { min: 2, max: 12 } as const
export const AIR_TEMP_F = { min: 40, max: 120 } as const

function clamp (value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Convert Fahrenheit to Celsius. */
export function fahrenheitToCelsius (f: number): number {
  return (f - 32) * 5 / 9
}

/** Convert feet to meters. */
export function feetToMeters (ft: number): number {
  return ft * FEET_TO_METERS
}

/**
 * Speed of sound in dry air (m/s) for a given temperature in Celsius.
 *   v = 331.3 * sqrt(1 + Tc / 273.15)
 */
export function speedOfSound (tempC: number): number {
  return 331.3 * Math.sqrt(1 + tempC / 273.15)
}

/**
 * Acoustic (effective) length in feet: the physical length plus the
 * end correction for a pipe of the given diameter (inches).
 */
export function effectiveLengthFt (lengthFt: number, diameterInches = 0): number {
  return lengthFt + END_CORRECTION_PER_DIAMETER * (diameterInches / INCHES_PER_FOOT)
}

/**
 * Open-pipe fundamental frequency (Hz) for a pipe length in feet at an air
 * temperature in Fahrenheit, optionally including the end correction for a
 * pipe diameter in inches (pass 0 / omit for the idealised f = v / 2L).
 */
export function openPipeFrequency (
  lengthFt: number,
  tempF: number,
  diameterInches = 0,
): number {
  const v = speedOfSound(fahrenheitToCelsius(tempF))
  const lengthM = feetToMeters(effectiveLengthFt(lengthFt, diameterInches))
  if (lengthM <= 0) return 0
  return v / (2 * lengthM)
}

/**
 * Inverse of {@link openPipeFrequency}: the physical pipe length (feet) needed
 * to sound a target frequency at the given temperature and diameter.
 */
export function lengthForFrequency (
  freq: number,
  tempF: number,
  diameterInches = 0,
): number {
  if (freq <= 0) return Number.POSITIVE_INFINITY
  const v = speedOfSound(fahrenheitToCelsius(tempF))
  const effLengthFt = (v / (2 * freq)) / FEET_TO_METERS
  return effLengthFt - END_CORRECTION_PER_DIAMETER * (diameterInches / INCHES_PER_FOOT)
}

/** True if a frequency can be reached by length alone at this temp/diameter. */
export function isReachableByLength (
  freq: number,
  tempF: number,
  diameterInches = 0,
): boolean {
  const lengthFt = lengthForFrequency(freq, tempF, diameterInches)
  return lengthFt >= PIPE_LENGTH_FT.min - 1e-6 && lengthFt <= PIPE_LENGTH_FT.max + 1e-6
}

const NOTE_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const

export interface NoteInfo {
  /** Note name, e.g. "A". */
  name: string
  /** Scientific-pitch octave number, e.g. 2 for A2. */
  octave: number
  /** Cents away from the exact equal-tempered note (-50..50). */
  cents: number
  /** Convenience label, e.g. "A2 +12¢". */
  label: string
}

/**
 * Nearest equal-tempered note to a frequency (A4 = 440 Hz). Display only — the
 * pipe sounds its true frequency, this just names the closest musical note.
 */
export function frequencyToNote (freq: number): NoteInfo {
  if (!Number.isFinite(freq) || freq <= 0) {
    return { name: '—', octave: 0, cents: 0, label: '—' }
  }
  // Semitones from A4.
  const semitonesFromA4 = 12 * Math.log2(freq / 440)
  const nearest = Math.round(semitonesFromA4)
  const cents = Math.round((semitonesFromA4 - nearest) * 100)

  // MIDI note number (A4 = 69), then map to name/octave.
  const midi = nearest + 69
  const name = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1

  const sign = cents > 0 ? '+' : ''
  const label = `${name}${octave} ${sign}${cents}¢`
  return { name, octave, cents, label }
}

/** Frequency (Hz) of an equal-tempered MIDI note number (A4 = 69 = 440 Hz). */
export function midiToFrequency (midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

/** Fractional MIDI note number for a frequency (inverse of midiToFrequency). */
export function midiFromFrequency (freq: number): number {
  return 69 + 12 * Math.log2(freq / 440)
}

/** Plain note label for a MIDI number, e.g. "A2". */
export function midiToLabel (midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

export interface AchievableNote {
  midi: number
  freq: number
  label: string
}

/**
 * Every chromatic ("half-step") note whose pitch is achievable somewhere within
 * the full allowable ranges of length, diameter and temperature. The widest the
 * instrument can ever go: longest+widest+coldest = lowest note; shortest+
 * narrowest+hottest = highest note.
 */
export function achievableNotes (): AchievableNote[] {
  const fMin = openPipeFrequency(PIPE_LENGTH_FT.max, AIR_TEMP_F.min, PIPE_DIAMETER_IN.max)
  const fMax = openPipeFrequency(PIPE_LENGTH_FT.min, AIR_TEMP_F.max, PIPE_DIAMETER_IN.min)
  const loMidi = Math.ceil(midiFromFrequency(fMin))
  const hiMidi = Math.floor(midiFromFrequency(fMax))

  const notes: AchievableNote[] = []
  for (let midi = loMidi; midi <= hiMidi; midi++) {
    notes.push({ midi, freq: midiToFrequency(midi), label: midiToLabel(midi) })
  }
  return notes
}

export interface Harmony {
  /** Physical length (feet) Pipe B should take, clamped to its range. */
  lengthFt: number
  /** The frequency that length actually produces. */
  freq: number
  /** Human label for the interval chosen, e.g. "5th". */
  intervalLabel: string
}

// Consonant intervals to try, in order of preference (semitones above partner).
const HARMONY_INTERVALS: ReadonlyArray<{ semitones: number, label: string }> = [
  { semitones: 7, label: '5th' },
  { semitones: 12, label: 'octave' },
  { semitones: 5, label: '4th' },
  { semitones: 4, label: 'major 3rd' },
  { semitones: 3, label: 'minor 3rd' },
  { semitones: 9, label: '6th' },
  { semitones: -5, label: '4th below' },
  { semitones: -7, label: '5th below' },
  { semitones: -12, label: 'octave below' },
]

/**
 * Pick a consonant interval relative to a partner pitch that Pipe B can reach by
 * length alone at its current temperature/diameter. Falls back to a clamped
 * perfect fifth if nothing lands exactly in range.
 */
export function chooseHarmony (
  partnerFreq: number,
  tempF: number,
  diameterInches = 0,
): Harmony {
  for (const interval of HARMONY_INTERVALS) {
    const freq = partnerFreq * 2 ** (interval.semitones / 12)
    const lengthFt = lengthForFrequency(freq, tempF, diameterInches)
    if (lengthFt >= PIPE_LENGTH_FT.min && lengthFt <= PIPE_LENGTH_FT.max) {
      return { lengthFt, freq, intervalLabel: interval.label }
    }
  }
  // Nothing fit — clamp a perfect fifth to the length range, best effort.
  const wanted = lengthForFrequency(partnerFreq * 2 ** (7 / 12), tempF, diameterInches)
  const lengthFt = clamp(wanted, PIPE_LENGTH_FT.min, PIPE_LENGTH_FT.max)
  return {
    lengthFt,
    freq: openPipeFrequency(lengthFt, tempF, diameterInches),
    intervalLabel: '5th (approx)',
  }
}
