// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { measureVoicedMs } from '../services/chantAnalysis/audioInput'
import { decodeAksharas } from '../services/chantAnalysis/scoreAgainstText'
import {
  alignRefToHypIndices,
  evenFrameSpans,
  frameSpansForDecode,
  referenceSegmentTimes,
} from '../services/chantAnalysis/segmentTiming'
import type { DecodedToken } from '../services/chantAnalysis/ctcDecode'

function tone(seconds: number, amplitude: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * 16000))
  for (let i = 0; i < out.length; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * 220 * i) / 16000)
  }
  return out
}

describe('energy VAD', () => {
  it('reports zero voiced audio for digital silence', () => {
    const result = measureVoicedMs(new Float32Array(3 * 16000))
    expect(result.voicedMs).toBe(0)
    expect(result.totalMs).toBeCloseTo(3000, 0)
  })

  it('reports uninterrupted loud audio as voiced (no-pause chanting)', () => {
    const result = measureVoicedMs(tone(2, 0.4))
    expect(result.voicedMs).toBeGreaterThan(1500)
  })

  it('detects bursts against a quiet background', () => {
    const samples = new Float32Array(3 * 16000)
    const burst = tone(1, 0.3)
    samples.set(burst, 16000) // one voiced second in the middle
    const result = measureVoicedMs(samples)
    expect(result.voicedMs).toBeGreaterThan(700)
    expect(result.voicedMs).toBeLessThan(1500)
  })

  it('does not count faint constant noise as speech', () => {
    const result = measureVoicedMs(tone(2, 0.0006))
    expect(result.voicedMs).toBe(0)
  })

  it('handles buffers shorter than one analysis window', () => {
    const result = measureVoicedMs(new Float32Array(100))
    expect(result.voicedMs).toBe(0)
  })
})

describe('segment timing', () => {
  const text = 'गुरुर्ब्रह्मा गुरुर्विष्णुः'
  const tokens: DecodedToken[] = [
    { piece: '▁गुरुर्ब्र', frame: 0 },
    { piece: 'ह्मा', frame: 7 },
    { piece: '▁गुरुर्वि', frame: 15 },
    { piece: 'ष्णुः', frame: 22 },
  ]
  const hypAksharas = decodeAksharas(text)

  it('maps decode aksharas to token frame spans exactly', () => {
    const spans = frameSpansForDecode(tokens, hypAksharas)
    expect(spans).not.toBeNull()
    expect(spans!.length).toBe(hypAksharas.length)
    let cursor = 0
    for (const span of spans!) {
      expect(span.startFrame).toBeGreaterThanOrEqual(0)
      expect(span.endFrame).toBeGreaterThan(span.startFrame - 1)
      expect(span.startFrame).toBeGreaterThanOrEqual(cursor - 1)
      cursor = span.startFrame
    }
    // First akshara comes from the first token, last from the last token.
    expect(spans![0].startFrame).toBe(0)
    expect(spans![spans!.length - 1].endFrame).toBe(23)
  })

  it('tracks the word-final m-virama canonicalisation (2 chars -> anusvara)', () => {
    const spans = frameSpansForDecode(
      [
        { piece: '▁रा', frame: 2 },
        { piece: 'मम्', frame: 6 },
      ],
      decodeAksharas('रामम्'), // canonical form is 'रामं'
    )
    expect(spans).not.toBeNull()
    expect(spans!.length).toBe(2)
    expect(spans![1].startFrame).toBe(6)
  })

  it('drops danda and digits without losing frame attribution', () => {
    const spans = frameSpansForDecode(
      [
        { piece: '▁नमः', frame: 1 },
        { piece: '▁।', frame: 5 },
        { piece: '▁१', frame: 6 },
      ],
      decodeAksharas('नमः । १'),
    )
    expect(spans).not.toBeNull()
    expect(spans!.length).toBe(decodeAksharas('नमः').length)
  })

  it('returns null when the akshara lists disagree (caller falls back)', () => {
    expect(frameSpansForDecode(tokens, ['क'])).toBeNull()
  })

  it('returns empty spans for an empty decode', () => {
    expect(frameSpansForDecode([], [])).toEqual([])
    expect(frameSpansForDecode([], ['क'])).toBeNull()
  })

  it('distributes evenly in the fallback', () => {
    const spans = evenFrameSpans(tokens, 4)
    expect(spans.length).toBe(4)
    expect(spans[0].startFrame).toBe(0)
    expect(spans[3].endFrame).toBeGreaterThanOrEqual(23)
  })

  it('aligns reference indices to hyp indices with gaps', () => {
    const refToHyp = alignRefToHypIndices(['क', 'ख', 'ग'], ['क', 'ग'])
    expect(refToHyp[0]).toBe(0)
    expect(refToHyp[1]).toBeNull()
    expect(refToHyp[2]).toBe(1)
  })

  it('produces monotonic millisecond spans with zero-width gaps', () => {
    const times = referenceSegmentTimes(
      [0, null, 1],
      [
        { startFrame: 0, endFrame: 3 },
        { startFrame: 5, endFrame: 8 },
      ],
      40,
    )
    expect(times[0]).toEqual({ startMs: 0, endMs: 120 })
    expect(times[1]).toEqual({ startMs: 120, endMs: 120 })
    expect(times[2]).toEqual({ startMs: 200, endMs: 320 })
  })
})
