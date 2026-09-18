// @vitest-environment node
/**
 * Confirms the TS self-referenced grader reproduces the Python
 * MFCC+CMVN+DTW similarity on real audio. Reads the git-ignored research clips
 * (CC BY 4.0 prathoshap/sushrota-sanskrit-asr-data) and compares against the
 * committed similarity-parity fixture; skips cleanly when the clips are absent.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import parity from '../fixtures/chant/similarity-parity.json'
import { readWav16kMono } from '../helpers/readWav'
import { audioSimilarityFromSamples } from '../../services/chantAnalysis/audioSimilarity'

const CLIP_DIR = path.resolve(
  process.cwd(),
  'research',
  'pronunciation-ai',
  'scripts',
  'clips',
  'held_out',
)
const present = existsSync(CLIP_DIR)

interface ParityPair {
  a: string
  b: string
  similarity: number
}
const pairs = (parity as { pairs: ParityPair[] }).pairs

function clip(id: string): Float32Array {
  return readWav16kMono(path.join(CLIP_DIR, `${id}.wav`))
}

describe.skipIf(!present)('similarity parity on real clips', () => {
  it('reproduces Python similarity for every fixture pair', () => {
    const samples = new Map<string, Float32Array>()
    for (const p of pairs) {
      for (const id of [p.a, p.b]) {
        if (!samples.has(id)) samples.set(id, clip(id))
      }
    }
    for (const p of pairs) {
      const got = audioSimilarityFromSamples(samples.get(p.a)!, samples.get(p.b)!)
      // float32/float64 accumulation differences only.
      expect(Math.abs(got - p.similarity), `${p.a} vs ${p.b}`).toBeLessThan(0.01)
    }
  })

  it('ranks same-text pairs above different-text pairs', () => {
    const sim = (a: string, b: string) =>
      audioSimilarityFromSamples(clip(a), clip(b))
    const sameText = sim('heldout_10_dur6.2s', 'heldout_12_dur8.0s')
    const diffText = sim('heldout_00_dur2.0s', 'heldout_15_dur24.1s')
    expect(sameText).toBeGreaterThan(diffText)
  })
})

describe.skipIf(present)('similarity parity (clips absent)', () => {
  it('skips cleanly without the research clips', () => {
    expect(present).toBe(false)
  })
})
