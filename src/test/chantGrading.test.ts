// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import mfccGolden from './fixtures/chant/mfcc-golden.json'
import {
  decodeReference,
  gradeChantAttempt,
} from '../services/chantAnalysis/chantGrading'
import {
  InMemoryChantReferenceStore,
  type StoredChantReference,
} from '../services/chantAnalysis/chantReferenceStore'

function b64ToF32(b64: string): Float32Array {
  const bytes = Buffer.from(b64, 'base64')
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Float32Array(copy.buffer)
}
const REAL = b64ToF32((mfccGolden as { audioB64: string }).audioB64)

function decodeReturning(samples: Float32Array, durationMs = 2000) {
  return vi.fn().mockResolvedValue({ samples, durationMs })
}

function reference(samples: Float32Array): StoredChantReference {
  return {
    slokaId: 's1',
    samples,
    sampleRate: 16000,
    durationMs: 2000,
    createdAt: '2026-09-18T00:00:00Z',
  }
}

describe('reference store (in-memory)', () => {
  it('round-trips, lists, and deletes references', async () => {
    const store = new InMemoryChantReferenceStore()
    expect(await store.get('s1')).toBeNull()
    await store.set(reference(REAL))
    expect((await store.get('s1'))?.samples.length).toBe(REAL.length)
    expect(await store.listIds()).toEqual(['s1'])
    await store.delete('s1')
    expect(await store.get('s1')).toBeNull()
    expect(await store.listIds()).toEqual([])
  })
})

describe('decodeReference', () => {
  it('produces a stored reference from a usable recording', async () => {
    const ref = await decodeReference('s1', new Blob(['x']), () => 'NOW', decodeReturning(REAL))
    expect(ref).not.toBeNull()
    expect(ref?.slokaId).toBe('s1')
    expect(ref?.samples.length).toBe(REAL.length)
    expect(ref?.createdAt).toBe('NOW')
  })

  it('refuses a too-short or silent recording', async () => {
    expect(
      await decodeReference('s1', new Blob(['x']), undefined, decodeReturning(REAL, 300)),
    ).toBeNull()
    const silence = new Float32Array(REAL.length)
    expect(
      await decodeReference('s1', new Blob(['x']), undefined, decodeReturning(silence)),
    ).toBeNull()
  })

  it('refuses an undecodable recording', async () => {
    const decode = vi.fn().mockRejectedValue(new Error('bad'))
    expect(await decodeReference('s1', new Blob(['x']), undefined, decode)).toBeNull()
  })
})

describe('gradeChantAttempt', () => {
  it('returns no-reference when the learner has not set one', async () => {
    const outcome = await gradeChantAttempt(new Blob(['x']), null, decodeReturning(REAL))
    expect(outcome.status).toBe('no-reference')
  })

  it('passes an attempt that matches the learner’s own reference', async () => {
    const outcome = await gradeChantAttempt(new Blob(['x']), reference(REAL), decodeReturning(REAL))
    expect(outcome.status).toBe('graded')
    if (outcome.status !== 'graded') throw new Error('unreachable')
    expect(outcome.result.passed).toBe(true)
    expect(outcome.result.grade).toBe('excellent')
    expect(outcome.result.scorePercent).toBe(100)
  })

  it('fails a different recitation against the reference', async () => {
    // Reverse the samples: same energy, different content -> low similarity.
    const reversed = Float32Array.from(REAL).reverse()
    const outcome = await gradeChantAttempt(
      new Blob(['x']),
      reference(REAL),
      decodeReturning(reversed),
    )
    expect(outcome.status).toBe('graded')
    if (outcome.status !== 'graded') throw new Error('unreachable')
    expect(outcome.result.passed).toBe(false)
  })

  it('reports too-quiet for silence and too-short for a blip', async () => {
    const silence = new Float32Array(REAL.length)
    expect(
      (await gradeChantAttempt(new Blob(['x']), reference(REAL), decodeReturning(silence))).status,
    ).toBe('too-quiet')
    expect(
      (await gradeChantAttempt(new Blob(['x']), reference(REAL), decodeReturning(REAL, 300))).status,
    ).toBe('too-short')
  })

  it('reports undecodable rather than throwing', async () => {
    const decode = vi.fn().mockRejectedValue(new Error('bad container'))
    expect(
      (await gradeChantAttempt(new Blob(['x']), reference(REAL), decode)).status,
    ).toBe('undecodable')
  })
})
