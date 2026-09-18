// @vitest-environment node
/**
 * Edge-case tests for the on-device evaluation service orchestration, with
 * an injected backend (fixture decodes) and injected blob decoding — no
 * model, no DOM. The real-model pipeline is covered by chantModelParity;
 * these tests pin the CONTRACT behaviour: fail-closed reasons, the coverage
 * gate in front of scoring, and the structural honesty of results.
 */
import { describe, expect, it, vi } from 'vitest'
import verifyParity from './fixtures/chant/verify-parity.json'
import { OnDeviceChantEvaluationService } from '../services/chantAnalysis/evaluationService'
import type { ChantAnalysisBackend } from '../services/chantAnalysis/workerProtocol'
import type { DecodedRecording } from '../services/chantAnalysis/audioInput'
import {
  isScoredEvaluation,
  isVerifiedEvaluation,
  type ChantEvaluationRequest,
  type ChantEvaluationResult,
} from '../types/chant'

interface FixtureEntry {
  clipId: string
  kind: string
  expectedText: string
  decodes: string[]
}

const entries = (verifyParity as { entries: FixtureEntry[] }).entries
const correctEntry = entries.find(
  (e) => e.kind === 'correct-pair' && e.clipId === 'heldout_02_dur3.4s',
)!
const wrongTextEntry = entries.find((e) => e.kind === 'wrong-text')!
const deviationEntry = entries.find(
  (e) =>
    e.kind === 'correct-pair' && e.clipId === 'heldout_07_dur4.5s',
)!

function sineSamples(seconds: number): Float32Array {
  const samples = new Float32Array(Math.round(seconds * 16000))
  for (let i = 0; i < samples.length; i++) {
    samples[i] = 0.4 * Math.sin((2 * Math.PI * 220 * i) / 16000)
  }
  return samples
}

function fakeBackend(entry: FixtureEntry): ChantAnalysisBackend {
  const words = entry.decodes[0].split(' ').filter((w) => w.length > 0)
  return {
    analyzerVersion: 'fake-backend-v1',
    analyze: vi.fn().mockResolvedValue({
      decodes: entry.decodes,
      tokens0: words.map((word, i) => ({ piece: `▁${word}`, frame: i * 12 })),
      outFrames: Math.max(1, words.length * 15),
    }),
  }
}

function fakeDecode(recording: DecodedRecording) {
  return vi.fn().mockResolvedValue(recording)
}

const localize = vi.fn(
  (key: string, params?: Record<string, string | number>) =>
    params ? `${key}|${JSON.stringify(params)}` : key,
)

function makeRequest(
  expectedText: string,
  modes: ChantEvaluationRequest['evaluationModes'] = [],
): ChantEvaluationRequest {
  return {
    recording: new Blob(['x'], { type: 'audio/webm' }),
    slokaId: 'test-sloka',
    referenceId: null,
    expectedText,
    language: 'sa-IN',
    ageBand: '7-8',
    evaluationModes: modes,
  }
}

function service(
  backend: ChantAnalysisBackend,
  recording: DecodedRecording = { samples: sineSamples(3.4), durationMs: 3400 },
) {
  return new OnDeviceChantEvaluationService({
    backend,
    decodeBlob: fakeDecode(recording),
    localize,
  })
}

function expectUnscoredWithReason(
  result: ChantEvaluationResult,
  reason: string,
  childKey: string,
) {
  expect(result.provenance).toBe('unavailable')
  expect(isScoredEvaluation(result)).toBe(false)
  if (isScoredEvaluation(result)) throw new Error('unreachable')
  expect(result.unavailableReason).toBe(reason)
  expect(result.childMessageKey).toBe(childKey)
  expect(result.dimensions).toBeUndefined()
  expect(result.segments).toBeUndefined()
  expect(result.parentSummary).toContain('No scores were produced')
  expect(JSON.stringify(result)).not.toMatch(/"(score|accuracy)"/)
}

describe('OnDeviceChantEvaluationService', () => {
  it('produces a verified result for a matching recitation', async () => {
    const result = await service(fakeBackend(correctEntry)).evaluate(
      makeRequest(correctEntry.expectedText),
    )

    expect(isVerifiedEvaluation(result)).toBe(true)
    if (!isVerifiedEvaluation(result)) throw new Error('unreachable')
    expect(result.referenceId).toBeNull()
    expect(result.analyzerId).toBe('fake-backend-v1+verify-v1')
    expect(result.recordingDurationMs).toBe(3400)
    expect(result.coverage.expectedSegments).toBeGreaterThan(0)
    expect(result.segments.length).toBe(result.coverage.expectedSegments)
    expect(result.childSummary.length).toBeGreaterThan(0)
    expect(result.parentSummary).toContain('nothing uploaded')
    expect(result.parentSummary).toContain("not a teacher's judgement")
  })

  it('never expresses a verdict or accuracy on an abstained segment', async () => {
    const result = await service(fakeBackend(correctEntry)).evaluate(
      makeRequest(correctEntry.expectedText),
    )
    if (!isVerifiedEvaluation(result)) throw new Error('expected verified')
    expect(JSON.stringify(result)).not.toMatch(/"accuracy"/)
    for (const segment of result.segments) {
      expect(segment.confidence).toBeGreaterThanOrEqual(0)
      expect(segment.confidence).toBeLessThanOrEqual(1)
      if (segment.status === 'unclear') {
        expect(Object.keys(segment)).not.toContain('outcome')
        expect(Object.keys(segment)).not.toContain('observations')
        expect(Object.keys(segment)).not.toContain('accuracy')
      }
    }
  })

  it('keeps segment times monotonic and within the recording', async () => {
    const result = await service(fakeBackend(correctEntry)).evaluate(
      makeRequest(correctEntry.expectedText),
    )
    if (!isVerifiedEvaluation(result)) throw new Error('expected verified')
    let cursor = 0
    for (const segment of result.segments) {
      expect(segment.startMs).toBeGreaterThanOrEqual(cursor)
      expect(segment.endMs).toBeGreaterThanOrEqual(segment.startMs)
      cursor = segment.endMs
    }
  })

  it('marks consistent substitutions as deviations with taxonomy observations', async () => {
    const result = await service(fakeBackend(deviationEntry)).evaluate(
      makeRequest(deviationEntry.expectedText),
    )
    if (!isVerifiedEvaluation(result)) throw new Error('expected verified')
    const deviations = result.segments.filter(
      (s) => s.status === 'assessed' && s.outcome === 'deviation',
    )
    // heldout_07 measured exactly one consistent substitution (report 10).
    expect(deviations.length).toBe(1)
    for (const segment of deviations) {
      if (segment.status !== 'assessed') continue
      expect(segment.observations[0]?.code).toBe('consistent-substitution')
      expect(segment.evidence?.heard.length).toBeGreaterThan(0)
      expect(segment.evidence?.matched).toBe(0)
    }
  })

  it('refuses wrong-text recordings before any per-segment verdict exists', async () => {
    const backend = fakeBackend(wrongTextEntry)
    const result = await service(backend).evaluate(
      makeRequest(wrongTextEntry.expectedText),
    )
    expectUnscoredWithReason(
      result,
      'expected-text-not-heard',
      'chantCoachDifferentTextNotice',
    )
  })

  it('reports silence as no speech without consulting decode content', async () => {
    const silent = { samples: new Float32Array(3 * 16000), durationMs: 3000 }
    const result = await service(fakeBackend(correctEntry), silent).evaluate(
      makeRequest(correctEntry.expectedText),
    )
    expectUnscoredWithReason(
      result,
      'no-speech-detected',
      'chantCoachNoSpeechNotice',
    )
  })

  it('rejects too-short recordings without running the model', async () => {
    const backend = fakeBackend(correctEntry)
    const tiny = { samples: sineSamples(0.3), durationMs: 300 }
    const result = await service(backend, tiny).evaluate(
      makeRequest(correctEntry.expectedText),
    )
    expectUnscoredWithReason(
      result,
      'recording-too-short',
      'chantCoachTooShortNotice',
    )
    expect(backend.analyze).not.toHaveBeenCalled()
  })

  it('treats an empty or unsegmentable expected text as analyzer-unavailable', async () => {
    const backend = fakeBackend(correctEntry)
    for (const text of ['', '   ', '123 456 || ॥']) {
      const result = await service(backend).evaluate(makeRequest(text))
      expectUnscoredWithReason(
        result,
        'analyzer-unavailable',
        'chantCoachUnavailableNotice',
      )
    }
    expect(backend.analyze).not.toHaveBeenCalled()
  })

  it('reports an unreadable recording as unclear audio', async () => {
    const failing = new OnDeviceChantEvaluationService({
      backend: fakeBackend(correctEntry),
      decodeBlob: vi.fn().mockRejectedValue(new Error('bad container')),
      localize,
    })
    const result = await failing.evaluate(makeRequest(correctEntry.expectedText))
    expectUnscoredWithReason(result, 'audio-unclear', 'chantCoachAudioUnclearNotice')
  })

  it('reports a crashed backend as analyzer-unavailable', async () => {
    const crashing: ChantAnalysisBackend = {
      analyzerVersion: 'crash-v1',
      analyze: vi.fn().mockRejectedValue(new Error('worker died')),
    }
    const result = await service(crashing).evaluate(
      makeRequest(correctEntry.expectedText),
    )
    expectUnscoredWithReason(
      result,
      'analyzer-unavailable',
      'chantCoachUnavailableNotice',
    )
  })

  it('never throws even when an internal dependency throws synchronously', async () => {
    const hostile = new OnDeviceChantEvaluationService({
      backend: fakeBackend(correctEntry),
      decodeBlob: fakeDecode({ samples: sineSamples(3.4), durationMs: 3400 }),
      localize: () => {
        throw new Error('broken localizer')
      },
    })
    const result = await hostile.evaluate(makeRequest(correctEntry.expectedText))
    expect(result.provenance).toBe('unavailable')
  })

  it('honours requested evaluation modes when filling dimensions', async () => {
    const completenessOnly = await service(fakeBackend(correctEntry)).evaluate(
      makeRequest(correctEntry.expectedText, ['completeness']),
    )
    if (!isVerifiedEvaluation(completenessOnly)) throw new Error('expected verified')
    expect(completenessOnly.dimensions.completeness).toBeDefined()
    expect(completenessOnly.dimensions.pronunciation).toBeUndefined()

    const defaulted = await service(fakeBackend(correctEntry)).evaluate(
      makeRequest(correctEntry.expectedText),
    )
    if (!isVerifiedEvaluation(defaulted)) throw new Error('expected verified')
    expect(defaulted.dimensions.completeness).toBeDefined()
    expect(defaulted.dimensions.pronunciation).toBeDefined()
    for (const dimension of Object.values(defaulted.dimensions)) {
      expect(dimension.score).toBeGreaterThanOrEqual(0)
      expect(dimension.score).toBeLessThanOrEqual(1)
      expect(dimension.confidence).toBeGreaterThanOrEqual(0)
      expect(dimension.confidence).toBeLessThanOrEqual(1)
    }
  })
})
