import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FEATURE_FLAGS } from '../config/featureFlags'
import { ChantLabPage } from '../pages/ChantLabPage'
import {
  ChantEvaluationUnavailableError,
  LocalPitchEvaluationService,
  MockChantEvaluationService,
  SIMULATED_EVALUATION_VERSION,
  ServerChantEvaluationService,
} from '../services/chantEvaluation'
import type {
  ChantEvaluationRequest,
  DimensionFeedback,
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
    ageBand: '7-8',
    evaluationModes,
  }
}

function expectNoScore(feedback: DimensionFeedback | undefined) {
  expect(feedback).toBeDefined()
  expect(feedback?.status).toBe('unable-to-evaluate')
  expect(feedback?.score).toBeUndefined()
  expect(feedback?.confidence).toBe(0)
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

describe('Chant Coach placeholder services', () => {
  it('marks mock output as simulated and never invents scores', async () => {
    const result = await new MockChantEvaluationService().evaluate(makeRequest())

    expect(result.evaluationVersion).toBe(SIMULATED_EVALUATION_VERSION)
    expect(result.childFriendlySummary.toLowerCase()).toContain('simulated')
    expect(result.parentSummary?.toLowerCase()).toContain('no audio analysis')
    expectNoScore(result.audioQuality)
    expectNoScore(result.completeness)
    expectNoScore(result.pronunciation)
    expectNoScore(result.rhythm)
    expectNoScore(result.melody)
  })

  it('returns unable-to-evaluate from the local pitch placeholder', async () => {
    const result = await new LocalPitchEvaluationService().evaluate(
      makeRequest(['rhythm']),
    )

    expect(result.evaluationVersion).toBe('local-pitch-placeholder-v1')
    expectNoScore(result.audioQuality)
    expectNoScore(result.completeness)
    expectNoScore(result.pronunciation)
    expectNoScore(result.rhythm)
    expect(result.melody).toBeUndefined()
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
