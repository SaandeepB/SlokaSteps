import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FEATURE_FLAGS } from '../config/featureFlags'
import { ChantLabPage } from '../pages/ChantLabPage'
import {
  ChantEvaluationUnavailableError,
  LOCAL_PITCH_EVALUATION_VERSION,
  LocalPitchEvaluationService,
  MockChantEvaluationService,
  SIMULATED_EVALUATION_VERSION,
  ServerChantEvaluationService,
} from '../services/chantEvaluation'
import {
  PARTICIPATION_EVALUATION_VERSION,
  ParticipationEvaluationService,
} from '../services/pronunciation'
import { translate } from '../content/translations'
import type { TranslationKey } from '../content/translations'
import {
  isAnalyzedEvaluation,
  isScoredEvaluation,
  isVerifiedEvaluation,
} from '../types/chant'
import type {
  ChantCoverageGate,
  ChantEvaluationRequest,
  ChantEvaluationResult,
  CoverageAssessment,
  EvaluationProvenance,
  ScoredProvenance,
  SegmentScore,
  UnscoredChantEvaluation,
  VerifiedChantEvaluation,
} from '../types/chant'

function makeRequest(
  evaluationModes: ChantEvaluationRequest['evaluationModes'] = [
    'completeness',
    'pronunciation',
    'rhythm',
    'melody',
  ],
): ChantEvaluationRequest {
  return {
    recording: new Blob(['local test audio'], { type: 'audio/webm' }),
    slokaId: 'saraswati-namastubhyam',
    referenceId: 'reference-under-review',
    expectedText: 'Saraswati Namastubhyam',
    language: 'sa-IN',
    ageBand: '7-8',
    evaluationModes,
  }
}

/**
 * The core safety property: anything that is not a validated analysis carries
 * no scores at all — not a dimension summary, not a segment, not a number.
 */
function expectNoScores(result: ChantEvaluationResult) {
  expect(result.provenance).not.toBe('analyzed')
  expect(result.dimensions).toBeUndefined()
  expect(result.segments).toBeUndefined()
  expect(JSON.stringify(result)).not.toMatch(/"(score|accuracy)"/)
  // Added alongside the four assertions above, never in place of them: a
  // second scored provenance must not be able to reach this helper unnoticed.
  expect(isScoredEvaluation(result)).toBe(false)
}

/**
 * The counterpart for a result that IS permitted to carry detail. It is
 * stricter than `expectNoScores`, not looser: comparing decodes against
 * reference text yields no scalar at all, so a verified result may never
 * contain an accuracy, and its abstentions must be empty in fact as well as
 * in type.
 */
function expectNoInventedScores(result: VerifiedChantEvaluation) {
  expect(JSON.stringify(result)).not.toMatch(/"(score|accuracy|percent)"/)
  for (const segment of result.segments) {
    if (segment.status !== 'unclear') continue
    expect(Object.keys(segment)).not.toContain('outcome')
    expect(Object.keys(segment)).not.toContain('accuracy')
    expect(Object.keys(segment)).not.toContain('observations')
  }
}

function childText(result: ChantEvaluationResult): string {
  expect(result.provenance).not.toBe('analyzed')
  if (isScoredEvaluation(result)) throw new Error('unreachable')
  return translate('en-IN', result.childMessageKey as TranslationKey)
}

describe('safety-sensitive feature flags', () => {
  it('keeps Chant Coach and community features disabled by default', () => {
    expect(FEATURE_FLAGS).toEqual({
      chantCoachEnabled: false,
      communityEnabled: false,
    })
    expect(Object.isFrozen(FEATURE_FLAGS)).toBe(true)
  })
})

describe('the evaluation contract', () => {
  it('cannot express a score on a result that was not analyzed', () => {
    // Compile-time guarantee, not a runtime one: the unscored variants type
    // `dimensions` and `segments` as `never`, so a placeholder implementation
    // cannot invent feedback even by mistake.
    const invalid = {
      provenance: 'participation-only',
      evaluationVersion: 'x',
      referenceId: null,
      childMessageKey: 'feedbackGreatEffort',
      parentSummary: 'no analysis',
      // @ts-expect-error an unscored result may not carry segment scores
      segments: [{ index: 0, label: 'sa', kind: 'syllable', startMs: 0, endMs: 1, accuracy: 1, confidence: 1, observations: [] }],
    } satisfies ChantEvaluationResult

    expect(invalid.provenance).toBe('participation-only')
  })

  it('does not let an unscored result claim a scored provenance', () => {
    const invalid = {
      // @ts-expect-error 'verified' may carry detail, so it is not unscored
      provenance: 'verified',
      evaluationVersion: 'x',
      referenceId: null,
      childMessageKey: 'feedbackGreatEffort',
      parentSummary: 'no analysis',
    } satisfies UnscoredChantEvaluation

    expect(invalid.evaluationVersion).toBe('x')
  })

  it('keeps every provenance classified as either scored or unscored', () => {
    const all: EvaluationProvenance[] = [
      'participation-only',
      'simulated',
      'unavailable',
      'analyzed',
      'verified',
    ]
    const scored: ScoredProvenance[] = ['analyzed', 'verified']

    expect(
      all.filter((provenance) => !scored.includes(provenance as ScoredProvenance)),
    ).toEqual(['participation-only', 'simulated', 'unavailable'])
  })
})

/**
 * Coverage fixtures. The unit counts (32, 32, 32, 64) are the akshara counts
 * from the real-audio hard-negative probes in
 * `research/pronunciation-ai/10`; the coverage figures alongside them are
 * hand-built to express each signature, because those probes ran with no gate
 * in place and so measured verdict distributions, not coverage. These are
 * fixtures for the SHAPE. They are not thresholds and not a recommendation.
 */
const HARD_NEGATIVE_COVERAGE = {
  silence: {
    expectedSegments: 32,
    decodedSegments: 0,
    coveredSegments: 0,
    longestCoveredRun: 0,
    voicedMs: 0,
    expectedMinimumVoicedMs: 4000,
  },
  noise: {
    expectedSegments: 32,
    decodedSegments: 3,
    coveredSegments: 2,
    longestCoveredRun: 1,
    voicedMs: 3000,
    expectedMinimumVoicedMs: 4000,
  },
  wrongText: {
    expectedSegments: 32,
    decodedSegments: 31,
    coveredSegments: 0,
    longestCoveredRun: 0,
    voicedMs: 10200,
    expectedMinimumVoicedMs: 4000,
  },
  stoppedPartway: {
    expectedSegments: 64,
    decodedSegments: 8,
    coveredSegments: 8,
    longestCoveredRun: 8,
    voicedMs: 3600,
    expectedMinimumVoicedMs: 8000,
  },
} satisfies Record<string, CoverageAssessment>

function makeVerified(segments: SegmentScore[]): VerifiedChantEvaluation {
  return {
    provenance: 'verified',
    evaluationVersion: 'verified-fixture-v1',
    referenceId: null,
    analyzerId: 'fixture-analyzer',
    recordingDurationMs: 4200,
    coverage: {
      expectedSegments: 32,
      decodedSegments: 31,
      coveredSegments: 30,
      longestCoveredRun: 28,
      voicedMs: 9800,
      expectedMinimumVoicedMs: 4000,
    },
    segments,
    dimensions: {},
    childSummary: 'You chanted the whole sloka.',
    parentSummary:
      'Checked against the reference text only. No audio reference was used.',
  }
}

describe('the verified evaluation contract', () => {
  it('is a scored result that names no audio reference', () => {
    const result = makeVerified([])

    expect(isScoredEvaluation(result)).toBe(true)
    expect(isVerifiedEvaluation(result)).toBe(true)
    // It is not a forced-alignment measurement, and must not be mistaken for one.
    expect(isAnalyzedEvaluation(result)).toBe(false)
    expect(result.referenceId).toBeNull()
  })

  it('cannot express a verdict on a segment the analyzer abstained from', () => {
    // Deliberately built as a plain object first. Declaring the forbidden
    // fields `never` rather than merely omitting them is what blocks this:
    // omitting them only stops fresh object literals, and an analyzer that
    // assembles a record and narrows it afterwards would walk straight through.
    const smuggled = {
      index: 0,
      label: 'sa',
      kind: 'syllable' as const,
      startMs: 0,
      endMs: 120,
      confidence: 0.4,
      status: 'unclear' as const,
      accuracy: 0.9,
    }

    // @ts-expect-error an abstention may not carry an accuracy
    const abstained: SegmentScore = smuggled

    expect(abstained.status).toBe('unclear')
  })

  it('carries no scalar score, only categorical verdicts and integer evidence', () => {
    const result = makeVerified([
      {
        index: 0,
        label: 'sa',
        kind: 'syllable',
        startMs: 0,
        endMs: 120,
        confidence: 0.9,
        status: 'assessed',
        outcome: 'matched',
        observations: [],
        evidence: { decodes: 4, matched: 4, heard: [] },
      },
      {
        index: 1,
        label: 'ra',
        kind: 'syllable',
        startMs: 120,
        endMs: 260,
        confidence: 0.3,
        status: 'unclear',
        evidence: { decodes: 4, matched: 2, heard: ['la', 'la'] },
      },
    ])

    expectNoInventedScores(result)
  })
})

describe('the coverage gate', () => {
  /** Refuses everything. Thresholds are a tuning problem, not a fixture. */
  const refusingGate: ChantCoverageGate = {
    assess: (_request, assessment) => ({
      status: 'insufficient',
      assessment,
      reason: 'expected-text-not-heard',
    }),
  }

  it('separates stopping partway from a whole-content mismatch', () => {
    // Both cover little of the expected text. Only one is safe to score, and
    // a contiguous run is what tells them apart.
    expect(HARD_NEGATIVE_COVERAGE.wrongText.longestCoveredRun).toBe(0)
    expect(HARD_NEGATIVE_COVERAGE.stoppedPartway.longestCoveredRun).toBeGreaterThan(0)
    // Clear speech that is simply the wrong text still decodes plenty.
    expect(HARD_NEGATIVE_COVERAGE.wrongText.decodedSegments).toBeGreaterThan(
      HARD_NEGATIVE_COVERAGE.silence.decodedSegments,
    )
  })

  it('can tell the measured hard-negative signatures apart', () => {
    const shapes = Object.values(HARD_NEGATIVE_COVERAGE).map((coverage) =>
      JSON.stringify(coverage),
    )

    expect(new Set(shapes).size).toBe(shapes.length)
  })

  it('turns a refused check into an unscored result that carries no detail', () => {
    const decision = refusingGate.assess(
      makeRequest(),
      HARD_NEGATIVE_COVERAGE.wrongText,
    )
    expect(decision.status).toBe('insufficient')
    if (decision.status !== 'insufficient') throw new Error('unreachable')

    const result: ChantEvaluationResult = {
      provenance: 'unavailable',
      evaluationVersion: 'coverage-gate-fixture-v1',
      referenceId: null,
      childMessageKey: 'chantCoachUnavailableNotice',
      parentSummary:
        'Unavailable: the recording did not match the expected text. No audio analysis was performed and no scores were produced.',
      unavailableReason: decision.reason,
    }

    expectNoScores(result)
  })
})

describe('the shipping participation evaluator', () => {
  it('returns encouragement only, and never an analyzed result', async () => {
    const service = new ParticipationEvaluationService()
    const result = await service.evaluate(makeRequest())

    expect(result.provenance).toBe('participation-only')
    expect(result.evaluationVersion).toBe(PARTICIPATION_EVALUATION_VERSION)
    expect(result.parentSummary.toLowerCase()).toContain('no audio analysis')
    expectNoScores(result)
    expect(childText(result)).toBe('Great effort!')
  })

  it('rotates encouragement so repeat attempts stay varied', async () => {
    const service = new ParticipationEvaluationService()
    const messages = [
      childText(await service.evaluate(makeRequest())),
      childText(await service.evaluate(makeRequest())),
      childText(await service.evaluate(makeRequest())),
    ]

    expect(new Set(messages).size).toBe(3)
  })
})

describe('Chant Coach placeholder services', () => {
  it('marks mock output as simulated and never invents scores', async () => {
    const result = await new MockChantEvaluationService().evaluate(makeRequest())

    expect(result.provenance).toBe('simulated')
    expect(result.evaluationVersion).toBe(SIMULATED_EVALUATION_VERSION)
    expect(result.parentSummary.toLowerCase()).toContain('no audio analysis')
    expectNoScores(result)
    // The child-facing text must itself say the preview is not real analysis.
    expect(childText(result).toLowerCase()).toContain('simulated')
  })

  it('returns an unavailable result from the local pitch placeholder', async () => {
    const result = await new LocalPitchEvaluationService().evaluate(
      makeRequest(['rhythm']),
    )

    expect(result.provenance).toBe('unavailable')
    expect(result.evaluationVersion).toBe(LOCAL_PITCH_EVALUATION_VERSION)
    expectNoScores(result)
    expect(childText(result).toLowerCase()).toContain('could not check')
  })

  it('does not upload and rejects from the server placeholder', async () => {
    const service = new ServerChantEvaluationService()

    await expect(service.evaluate(makeRequest())).rejects.toEqual(
      expect.objectContaining<Partial<ChantEvaluationUnavailableError>>({
        code: 'unable-to-evaluate',
        message: expect.stringContaining('no recording was uploaded'),
      }),
    )
  })
})

describe('Chant Lab', () => {
  it('is visibly a disabled development prototype with no genuine analysis', () => {
    render(<ChantLabPage />)

    expect(screen.getByRole('heading', { name: 'Chant Lab' })).toBeInTheDocument()
    expect(screen.getByText('Feature flag: off')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record test audio' })).toBeDisabled()
    expect(screen.getByLabelText(/Upload local test audio/)).toHaveAttribute(
      'accept',
      'audio/*',
    )
    expect(screen.getByLabelText('Waveform placeholder')).toBeInTheDocument()
    expect(screen.getByLabelText('Pitch contour placeholder')).toBeInTheDocument()

    const preview = screen.getByTestId('chant-evaluation-json')
    expect(preview).toHaveTextContent('"simulated": true')
    expect(preview).toHaveTextContent('"scores": null')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
