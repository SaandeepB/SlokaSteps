// @vitest-environment node
import { describe, expect, it } from 'vitest'
import mfccGolden from './fixtures/chant/mfcc-golden.json'
import {
  audioSimilarityFromSamples,
  computeMfccSequence,
  gradeFromSimilarity,
  starsForGrade,
  CHANT_PASS_BAR,
} from '../services/chantAnalysis/audioSimilarity'

function b64ToF32(b64: string): Float32Array {
  const bytes = Buffer.from(b64, 'base64')
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Float32Array(copy.buffer)
}

interface MfccGolden {
  audioB64: string
  mfccShape: [number, number]
  mfccB64: string
}
const golden = mfccGolden as unknown as MfccGolden

describe('MFCC parity with the Python grader', () => {
  it('reproduces the checkpoint-frontend MFCC+CMVN on real audio', () => {
    const audio = b64ToF32(golden.audioB64)
    const expected = b64ToF32(golden.mfccB64)
    const [frames, coeffs] = golden.mfccShape
    const seq = computeMfccSequence(audio)
    expect(seq.length).toBe(frames)
    expect(seq[0].length).toBe(coeffs)
    let maxAbs = 0
    for (let t = 0; t < frames; t++) {
      for (let k = 0; k < coeffs; k++) {
        const diff = Math.abs(seq[t][k] - expected[t * coeffs + k])
        if (diff > maxAbs) maxAbs = diff
      }
    }
    // Only float32-vs-float64 accumulation order may differ.
    expect(maxAbs).toBeLessThan(2e-3)
  })
})

describe('self-referenced similarity behaviour', () => {
  const audio = b64ToF32(golden.audioB64)

  it('scores an identical recording at ~1.0', () => {
    expect(audioSimilarityFromSamples(audio, audio)).toBeGreaterThan(0.999)
  })

  it('stays high for a realistic retake (gain + light noise + small stretch)', () => {
    // Simulate a same-speaker retake the way the Python validation did.
    const gain = 1.2
    const stretched = new Float32Array(Math.round(audio.length / 1.04))
    for (let i = 0; i < stretched.length; i++) {
      const src = (i * (audio.length - 1)) / (stretched.length - 1)
      const lo = Math.floor(src)
      const hi = Math.min(audio.length - 1, lo + 1)
      const frac = src - lo
      const rms = 0.02
      stretched[i] =
        gain * (audio[lo] * (1 - frac) + audio[hi] * frac) +
        (Math.sin(i * 12.9898) * 43758.5453 % 1) * rms
    }
    const sim = audioSimilarityFromSamples(audio, stretched)
    expect(sim).toBeGreaterThan(CHANT_PASS_BAR)
  })

  it('scores silence and noise against real audio well below the pass bar', () => {
    const silence = new Float32Array(audio.length)
    expect(audioSimilarityFromSamples(audio, silence)).toBeLessThan(CHANT_PASS_BAR)
    const noise = new Float32Array(audio.length)
    let seed = 1
    for (let i = 0; i < noise.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      noise[i] = (seed / 0x7fffffff) * 2 - 1
    }
    expect(audioSimilarityFromSamples(audio, noise)).toBeLessThan(CHANT_PASS_BAR)
  })

  it('returns 0 for empty input rather than throwing', () => {
    expect(audioSimilarityFromSamples(audio, new Float32Array(0))).toBe(0)
    expect(audioSimilarityFromSamples(new Float32Array(0), audio)).toBe(0)
  })
})

describe('grading', () => {
  it('maps similarity to grades and a pass/fail with sane stars', () => {
    expect(gradeFromSimilarity(0.95)).toMatchObject({ grade: 'excellent', passed: true })
    expect(gradeFromSimilarity(0.8)).toMatchObject({ grade: 'great', passed: true })
    expect(gradeFromSimilarity(0.66)).toMatchObject({ grade: 'good', passed: true })
    expect(gradeFromSimilarity(0.5)).toMatchObject({ grade: 'keep-practising', passed: false })
    expect(starsForGrade(gradeFromSimilarity(0.95))).toBe(3)
    expect(starsForGrade(gradeFromSimilarity(0.8))).toBe(2)
    expect(starsForGrade(gradeFromSimilarity(0.66))).toBe(1)
    expect(starsForGrade(gradeFromSimilarity(0.5))).toBe(0)
  })

  it('clamps out-of-range similarity', () => {
    expect(gradeFromSimilarity(1.5).scorePercent).toBe(100)
    expect(gradeFromSimilarity(-0.2).scorePercent).toBe(0)
  })
})
