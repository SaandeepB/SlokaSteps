/**
 * Self-referenced audio-match scoring: how closely a chant attempt matches the
 * SAME speaker's own reference recording. Chosen over cross-speaker audio
 * matching because that was measured to overlap (a different recitation could
 * outscore a correct one across voices); same-speaker retakes separate cleanly
 * (research/pronunciation-ai/test_self_reference.py: retakes 0.81–0.92 vs
 * different recitations ≤0.58, so a pass bar near 0.64 rejects no good retake
 * and accepts no wrong one on that data).
 *
 * Pipeline (a faithful port of test_audio_similarity.py, held to it by
 * `chantSimilarity` parity fixtures): 16 kHz mono → log-mel (the same frontend
 * the ASR uses, via committed licence-free mel constants — no model download)
 * → MFCC (DCT-II, 13 coeffs) → per-utterance cepstral mean/variance
 * normalisation → DTW with a Sakoe-Chiba band and a cosine frame cost →
 * length-normalised path distance → similarity = exp(-dist / scale).
 *
 * Nothing here needs the Su-śrotā weights or a worker; it is fast enough to run
 * on the main thread for a full chant.
 */

import melConstants from './melConstants.json'
import { computeLogMelFeatures, type MelFrontendConfig } from './melFrontend'

interface MelConstants {
  nFft: number
  winLength: number
  hopLength: number
  nMels: number
  preemph: number
  logZeroGuard: number
  normalizeStdEps: number
  magPower: number
  padTo: number
  nMfcc: number
  dtwScale: number
  windowB64: string
  melFilterbankB64: string
}

const CONST = melConstants as unknown as MelConstants

function b64ToF32(b64: string): Float32Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Float32Array(bytes.buffer)
}

const WINDOW = b64ToF32(CONST.windowB64)
const FILTERBANK = b64ToF32(CONST.melFilterbankB64)
const FRONTEND_CONFIG: MelFrontendConfig = {
  nFft: CONST.nFft,
  winLength: CONST.winLength,
  hopLength: CONST.hopLength,
  nMels: CONST.nMels,
  preemph: CONST.preemph,
  logZeroGuard: CONST.logZeroGuard,
  normalizeStdEps: CONST.normalizeStdEps,
  magPower: CONST.magPower,
  padTo: CONST.padTo,
}

export const DTW_BAND = 0.2
export const DTW_SCALE = CONST.dtwScale
const N_MFCC = CONST.nMfcc

/** DCT-II matrix [nOut][nIn], matching common_text's dct_ii_matrix. */
function dctMatrix(nOut: number, nIn: number): Float64Array[] {
  const rows: Float64Array[] = []
  const scale = Math.sqrt(2 / nIn)
  for (let k = 0; k < nOut; k++) {
    const row = new Float64Array(nIn)
    const rowScale = k === 0 ? scale / Math.SQRT2 : scale
    for (let n = 0; n < nIn; n++) {
      row[n] = Math.cos((Math.PI * k * (2 * n + 1)) / (2 * nIn)) * rowScale
    }
    rows.push(row)
  }
  return rows
}

const DCT = dctMatrix(N_MFCC, CONST.nMels)

/**
 * Compute the CMVN-normalised MFCC frame sequence for a recording. Each row is
 * a unit-normalised 13-dim frame ready for the cosine DTW cost.
 */
export function computeMfccSequence(samples: Float32Array): Float64Array[] {
  const mel = computeLogMelFeatures(samples, FRONTEND_CONFIG, {
    window: WINDOW,
    filterbank: FILTERBANK,
  })
  const { data, frames, featLen } = mel
  if (featLen === 0) return []

  // logMel is mel-major [nMels][frames]; take valid frames, DCT to MFCC.
  const mfcc: Float64Array[] = []
  for (let t = 0; t < featLen; t++) {
    const out = new Float64Array(N_MFCC)
    for (let k = 0; k < N_MFCC; k++) {
      const dctRow = DCT[k]
      let acc = 0
      for (let m = 0; m < CONST.nMels; m++) {
        acc += data[m * frames + t] * dctRow[m]
      }
      out[k] = acc
    }
    mfcc.push(out)
  }

  // Per-utterance cepstral mean/variance normalisation.
  const mean = new Float64Array(N_MFCC)
  for (const frame of mfcc) for (let k = 0; k < N_MFCC; k++) mean[k] += frame[k]
  for (let k = 0; k < N_MFCC; k++) mean[k] /= mfcc.length
  const std = new Float64Array(N_MFCC)
  for (const frame of mfcc) {
    for (let k = 0; k < N_MFCC; k++) {
      const d = frame[k] - mean[k]
      std[k] += d * d
    }
  }
  for (let k = 0; k < N_MFCC; k++) std[k] = Math.sqrt(std[k] / mfcc.length) + 1e-8
  for (const frame of mfcc) {
    for (let k = 0; k < N_MFCC; k++) frame[k] = (frame[k] - mean[k]) / std[k]
  }
  return mfcc
}

function unitNormalise(frames: Float64Array[]): Float64Array[] {
  return frames.map((frame) => {
    let norm = 0
    for (const v of frame) norm += v * v
    norm = Math.sqrt(norm) + 1e-8
    const out = new Float64Array(frame.length)
    for (let i = 0; i < frame.length; i++) out[i] = frame[i] / norm
    return out
  })
}

/**
 * Length-normalised DTW distance between two MFCC sequences, cosine frame
 * cost, Sakoe-Chiba band. Lower is more similar.
 */
export function dtwDistance(
  aFrames: Float64Array[],
  bFrames: Float64Array[],
  band = DTW_BAND,
): number {
  const n = aFrames.length
  const m = bFrames.length
  if (n === 0 || m === 0) return Number.POSITIVE_INFINITY
  const a = unitNormalise(aFrames)
  const b = unitNormalise(bFrames)
  const w = Math.max(Math.floor(band * Math.max(n, m)), Math.abs(n - m)) + 1
  const INF = Number.POSITIVE_INFINITY

  let prev = new Float64Array(m + 1).fill(INF)
  prev[0] = 0
  for (let i = 1; i <= n; i++) {
    const cur = new Float64Array(m + 1).fill(INF)
    const ai = a[i - 1]
    const jLo = Math.max(1, i - w)
    const jHi = Math.min(m, i + w)
    for (let j = jLo; j <= jHi; j++) {
      const bj = b[j - 1]
      let dot = 0
      for (let k = 0; k < ai.length; k++) dot += ai[k] * bj[k]
      const cost = 1 - dot
      cur[j] = cost + Math.min(prev[j], cur[j - 1], prev[j - 1])
    }
    prev = cur
  }
  return prev[m] / (n + m)
}

/** 0..1 similarity between two 16 kHz mono recordings. 1 = identical. */
export function audioSimilarityFromSamples(
  reference: Float32Array,
  attempt: Float32Array,
): number {
  const ref = computeMfccSequence(reference)
  const att = computeMfccSequence(attempt)
  if (ref.length === 0 || att.length === 0) return 0
  const dist = dtwDistance(ref, att)
  if (!Number.isFinite(dist)) return 0
  return Math.exp(-dist / DTW_SCALE)
}

export type ChantGrade = 'excellent' | 'great' | 'good' | 'keep-practising'

export interface ChantGradeResult {
  /** 0..1 similarity to the learner's own reference. */
  similarity: number
  /** 0..100, for display. */
  scorePercent: number
  grade: ChantGrade
  passed: boolean
}

/**
 * Grade bands and the pass bar. Informed by the measured self-reference
 * distribution (good retakes cluster 0.81–0.92; different recitations ≤0.58),
 * so the pass bar sits in the empty middle and the "excellent/great" bands
 * match real good-take scores. These are tunable and, like the coverage-gate
 * thresholds, are provisional until a labelled corpus exists.
 */
export const CHANT_PASS_BAR = 0.64
export const CHANT_GRADE_BANDS: Array<{ min: number; grade: ChantGrade }> = [
  { min: 0.86, grade: 'excellent' },
  { min: 0.75, grade: 'great' },
  { min: CHANT_PASS_BAR, grade: 'good' },
  { min: 0, grade: 'keep-practising' },
]

export function gradeFromSimilarity(similarity: number): ChantGradeResult {
  const clamped = Math.max(0, Math.min(1, similarity))
  const band =
    CHANT_GRADE_BANDS.find((b) => clamped >= b.min) ??
    CHANT_GRADE_BANDS[CHANT_GRADE_BANDS.length - 1]
  return {
    similarity: clamped,
    scorePercent: Math.round(clamped * 100),
    grade: band.grade,
    passed: clamped >= CHANT_PASS_BAR,
  }
}

/** Stars for a passed test, from the grade. A failed test earns no stars. */
export function starsForGrade(result: ChantGradeResult): 0 | 1 | 2 | 3 {
  if (!result.passed) return 0
  if (result.grade === 'excellent') return 3
  if (result.grade === 'great') return 2
  return 1
}
