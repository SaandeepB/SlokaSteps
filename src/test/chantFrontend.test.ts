// @vitest-environment node
import { describe, expect, it } from 'vitest'
import golden from './fixtures/chant/features-golden.json'
import {
  computeLogMelFeatures,
  type MelFrontendConfig,
} from '../services/chantAnalysis/melFrontend'

function b64ToF32(b64: string): Float32Array {
  const bytes = Buffer.from(b64, 'base64')
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Float32Array(copy.buffer)
}

interface FeaturesGolden {
  clipId: string
  sampleRate: number
  audioB64: string
  featLen: number
  featShape: [number, number]
  featuresB64: string
  windowB64: string
  melFilterbankShape: [number, number]
  melFilterbankB64: string
  preprocessor: MelFrontendConfig
}

const fixture = golden as unknown as FeaturesGolden

describe('mel frontend parity with the NeMo preprocessor', () => {
  const audio = b64ToF32(fixture.audioB64)
  const expected = b64ToF32(fixture.featuresB64)
  const constants = {
    window: b64ToF32(fixture.windowB64),
    filterbank: b64ToF32(fixture.melFilterbankB64),
  }

  it('fixture is internally consistent', () => {
    const [nMels, frames] = fixture.featShape
    expect(expected.length).toBe(nMels * frames)
    expect(constants.window.length).toBe(fixture.preprocessor.winLength)
    expect(constants.filterbank.length).toBe(
      fixture.melFilterbankShape[0] * fixture.melFilterbankShape[1],
    )
    // Real recorded audio, not a degenerate buffer.
    expect(audio.length).toBeGreaterThan(fixture.sampleRate)
  })

  it('produces the NeMo frame count and valid length', () => {
    const result = computeLogMelFeatures(audio, fixture.preprocessor, constants)
    expect(result.featLen).toBe(fixture.featLen)
    expect(result.frames).toBe(fixture.featShape[1])
    expect(result.data.length).toBe(expected.length)
  })

  it('matches the checkpoint preprocessor output on real audio', () => {
    const result = computeLogMelFeatures(audio, fixture.preprocessor, constants)
    let maxAbs = 0
    let sumAbs = 0
    for (let i = 0; i < expected.length; i++) {
      const diff = Math.abs(result.data[i] - expected[i])
      if (diff > maxAbs) maxAbs = diff
      sumAbs += diff
    }
    const meanAbs = sumAbs / expected.length
    // Normalised features are ~N(0,1); the only permitted difference is
    // float32-vs-float64 accumulation order. Anything larger than this is a
    // porting bug, not precision.
    expect(maxAbs).toBeLessThan(2e-3)
    expect(meanAbs).toBeLessThan(2e-4)
  })

  it('zeroes the masked tail frame beyond featLen', () => {
    const result = computeLogMelFeatures(audio, fixture.preprocessor, constants)
    const [nMels, frames] = fixture.featShape
    for (let m = 0; m < nMels; m++) {
      for (let t = fixture.featLen; t < frames; t++) {
        expect(result.data[m * frames + t]).toBe(0)
      }
    }
  })

  it('handles degenerate input without NaN', () => {
    const silent = new Float32Array(1600)
    const result = computeLogMelFeatures(silent, fixture.preprocessor, constants)
    expect(result.featLen).toBe(10)
    for (const value of result.data) {
      expect(Number.isFinite(value)).toBe(true)
    }
    const tiny = new Float32Array(200) // featLen 1: unbiased std is undefined
    const tinyResult = computeLogMelFeatures(tiny, fixture.preprocessor, constants)
    expect(tinyResult.featLen).toBe(1)
    for (const value of tinyResult.data) {
      expect(Number.isFinite(value)).toBe(true)
    }
    const empty = new Float32Array(0)
    const emptyResult = computeLogMelFeatures(empty, fixture.preprocessor, constants)
    expect(emptyResult.featLen).toBe(0)
    expect(emptyResult.frames).toBe(1)
  })
})
