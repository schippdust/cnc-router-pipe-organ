/**
 * voicing.ts
 *
 * Pure helpers for the *exciter* side of a flue pipe — the mouth/flue/jet that
 * actually turns steady wind into a tone. The resonator math lives in
 * `acoustics.ts`; this module answers "will it speak, and how should the mouth
 * be cut?".
 *
 * Centre of it all is Ising's number (Hartmut Ising, 1971): a dimensionless
 * measure of how hard a pipe is being blown relative to its mouth geometry.
 *   V  = jet velocity      = sqrt(2 P / rho)
 *   I  = (V / (f H)) * sqrt(D / H)
 * with P = wind (foot) pressure, rho = air density, f = pitch, H = cut-up
 * height, D = flue (windway) thickness. I ≈ 2 is well-voiced; below ~1.5 the
 * pipe is starved (breathy/won't speak), above ~3 it overblows to a higher mode.
 *
 * Inputs/outputs use shop-friendly units (inches, mm, °F, in. w.c., CFM);
 * conversions to SI happen internally.
 */
import { fahrenheitToCelsius } from './acoustics'

const PA_PER_INCH_WC = 249.0889
const M_PER_INCH = 0.0254
const M_PER_MM = 0.001
const M2_PER_IN2 = M_PER_INCH * M_PER_INCH
const CFM_PER_M3S = 2118.88
/** Dry-air density at 0 °C, 1 atm (kg/m³); scales with absolute temperature. */
const AIR_DENSITY_0C = 1.2922

/** Mouth width as a fraction of pipe circumference (classic ≈ 1/4). */
export const MOUTH_WIDTH_FRACTION = 0.25
/** Target Ising number for a recommended cut-up — the classic well-voiced value. */
export const TARGET_ISING = 2

/** Air density (kg/m³) at a given temperature, ~1.2 near room temperature. */
export function airDensity (tempF: number): number {
  const tc = fahrenheitToCelsius(tempF)
  return AIR_DENSITY_0C * (273.15 / (273.15 + tc))
}

/** Jet velocity (m/s) leaving the flue for a foot pressure in inches of water. */
export function jetVelocity (pressureInWc: number, tempF: number): number {
  const pa = Math.max(0, pressureInWc) * PA_PER_INCH_WC
  return Math.sqrt((2 * pa) / airDensity(tempF))
}

/** Mouth width (inches) ≈ a fraction of the pipe circumference. */
export function mouthWidthIn (diameterIn: number): number {
  return Math.PI * diameterIn * MOUTH_WIDTH_FRACTION
}

export interface VoicingInput {
  /** Pipe fundamental (Hz). */
  freq: number
  /** Wind/foot pressure (inches of water column). */
  pressureInWc: number
  /** Air temperature (°F). */
  tempF: number
  /** Flue / windway thickness (mm) — the small dimension of the jet. */
  flueDepthMm: number
  /** Cut-up: mouth height, lower lip to upper lip (inches). */
  cutUpIn: number
}

/** Ising's number for a given mouth geometry and wind. */
export function isingNumber (input: VoicingInput): number {
  const { freq, pressureInWc, tempF, flueDepthMm, cutUpIn } = input
  if (freq <= 0 || cutUpIn <= 0 || flueDepthMm <= 0) return 0
  const v = jetVelocity(pressureInWc, tempF)
  const h = cutUpIn * M_PER_INCH
  const d = flueDepthMm * M_PER_MM
  return (v / (freq * h)) * Math.sqrt(d / h)
}

/**
 * Cut-up height (inches) that yields the target Ising number for the current
 * pitch, pressure and flue — i.e. "how tall to cut the mouth".
 */
export function recommendedCutUpIn (
  input: Omit<VoicingInput, 'cutUpIn'>,
  targetIsing = TARGET_ISING,
): number {
  const { freq, pressureInWc, tempF, flueDepthMm } = input
  if (freq <= 0 || flueDepthMm <= 0) return 0
  const v = jetVelocity(pressureInWc, tempF)
  const d = flueDepthMm * M_PER_MM
  // I = V·sqrt(D)/(f·H^1.5)  →  H = ( V·sqrt(D) / (f·I) )^(2/3)
  const h15 = (v * Math.sqrt(d)) / (freq * targetIsing)
  const h = h15 ** (2 / 3)
  return h / M_PER_INCH
}

/** Flue opening area (in²) = mouth width × flue depth. */
export function flueAreaIn2 (diameterIn: number, flueDepthMm: number): number {
  return mouthWidthIn(diameterIn) * (flueDepthMm / 25.4)
}

/** Air the pipe actually consumes through its flue (CFM). */
export function flueDemandCfm (input: {
  diameterIn: number
  flueDepthMm: number
  pressureInWc: number
  tempF: number
}): number {
  const v = jetVelocity(input.pressureInWc, input.tempF)
  const areaM2 = flueAreaIn2(input.diameterIn, input.flueDepthMm) * M2_PER_IN2
  return v * areaM2 * CFM_PER_M3S
}

/** Starting toe-hole diameter (in): a round hole matched to the flue area. */
export function toeHoleDiameterIn (diameterIn: number, flueDepthMm: number): number {
  const area = flueAreaIn2(diameterIn, flueDepthMm)
  return Math.sqrt((4 * area) / Math.PI)
}

export type SpeechStatus = 'underblown' | 'soft' | 'ideal' | 'bright' | 'overblown'

export interface SpeechAssessment {
  status: SpeechStatus
  /** Vuetify colour token for chips/gauges. */
  color: string
  /** Short plain-English description. */
  message: string
}

/** Interpret an Ising number as a speech state with advice. */
export function assessSpeech (ising: number): SpeechAssessment {
  if (ising < 1.5) {
    return {
      status: 'underblown',
      color: 'orange',
      message: 'Starved — breathy or may not speak. Lower the cut-up, widen the flue, or raise wind.',
    }
  }
  if (ising < 2) {
    return {
      status: 'soft',
      color: 'info',
      message: 'Speaks gently. Fine for a soft, flutey voice.',
    }
  }
  if (ising <= 3) {
    return {
      status: 'ideal',
      color: 'success',
      message: 'Well-voiced — should speak clearly on the fundamental.',
    }
  }
  if (ising <= 4) {
    return {
      status: 'bright',
      color: 'warning',
      message: 'Bright and pushed — near overblowing. Raise the cut-up or ease the wind.',
    }
  }
  return {
    status: 'overblown',
    color: 'error',
    message: 'Overblown — likely jumps to the octave/twelfth or hisses. Raise the cut-up or cut the wind.',
  }
}

/**
 * Tonal "brightness" 0..1 from the cut-up : mouth-width ratio. Low cut-up →
 * bright/stringy (rich harmonics); high cut-up → mellow/flutey (purer).
 */
export function brightnessFromCutUp (cutUpIn: number, diameterIn: number): number {
  const ratio = cutUpIn / Math.max(mouthWidthIn(diameterIn), 1e-6)
  // ratio ~0.1 (very bright) .. ~0.4 (flutey)
  return Math.min(1, Math.max(0, (0.4 - ratio) / (0.4 - 0.1)))
}

/** Map brightness to a p5.sound oscillator waveform. */
export function waveformForBrightness (brightness: number): 'sine' | 'triangle' | 'sawtooth' {
  if (brightness > 0.66) return 'sawtooth'
  if (brightness > 0.33) return 'triangle'
  return 'sine'
}
