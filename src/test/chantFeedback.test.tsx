import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { ChantFeedback } from '../components/audio/ChantFeedback'
import { renderWithProviders } from './testUtils'
import type {
  SegmentScore,
  UnscoredChantEvaluation,
  VerifiedChantEvaluation,
} from '../types/chant'

function verified(segments: SegmentScore[]): VerifiedChantEvaluation {
  return {
    provenance: 'verified',
    evaluationVersion: 'verified-web-v1',
    referenceId: null,
    analyzerId: 'test+verify-v1',
    recordingDurationMs: 3400,
    coverage: {
      expectedSegments: segments.length,
      decodedSegments: segments.length,
      coveredSegments: segments.length,
      longestCoveredRun: segments.length,
      voicedMs: 3000,
      expectedMinimumVoicedMs: 480,
    },
    segments,
    dimensions: {},
    childSummary: 'Lovely chanting! Every sound I heard matched.',
    parentSummary: 'On-device text check (nothing uploaded): details for parents.',
  }
}

const base = { kind: 'syllable' as const, startMs: 0, endMs: 100, confidence: 0.9 }

describe('ChantFeedback child surface', () => {
  it('renders a matched segment as Matched and never the word "wrong"/"incorrect"', () => {
    renderWithProviders(
      <ChantFeedback
        result={verified([
          { ...base, index: 0, label: 'गु', status: 'assessed', outcome: 'matched', observations: [] },
        ])}
      />,
    )
    expect(screen.getByText('गु')).toBeInTheDocument()
    expect(screen.getAllByText('Matched').length).toBeGreaterThan(0)
    expect(document.body.textContent?.toLowerCase()).not.toMatch(/wrong|incorrect/)
  })

  it('folds a deviation into the same gentle "Practice" chip as an abstention (D5)', () => {
    renderWithProviders(
      <ChantFeedback
        result={verified([
          {
            ...base,
            index: 0,
            label: 'र',
            status: 'assessed',
            outcome: 'deviation',
            observations: [{ code: 'consistent-substitution', confidence: 0.75 }],
            evidence: { decodes: 4, matched: 0, heard: ['ल', 'ल', 'ल'] },
          },
          { ...base, index: 1, label: 'ब्रे', status: 'unclear' },
        ])}
      />,
    )
    // Both the deviation and the abstention read as "Practice" to the child —
    // a false positive can only under-claim, never accuse.
    expect(screen.getAllByText('Practice')).toHaveLength(2)
    // The wrong-heard aksharas ('ल') must not surface to the child at all.
    expect(document.body.textContent).not.toContain('ल')
  })

  it('always shows the on-device provenance note', () => {
    renderWithProviders(
      <ChantFeedback
        result={verified([
          { ...base, index: 0, label: 'गु', status: 'assessed', outcome: 'matched', observations: [] },
        ])}
      />,
    )
    expect(
      screen.getByText(/checked against the sloka text on this device/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/in family testing/i)).toBeInTheDocument()
  })

  it('shows a single calm sentence for an unavailable result, with no chips', () => {
    const unavailable: UnscoredChantEvaluation = {
      provenance: 'unavailable',
      evaluationVersion: 'verified-web-v1',
      referenceId: null,
      childMessageKey: 'chantCoachDifferentTextNotice',
      parentSummary: 'Unavailable: clear speech did not match the text.',
      unavailableReason: 'expected-text-not-heard',
    }
    renderWithProviders(<ChantFeedback result={unavailable} />)
    expect(screen.getByText(/different chant/i)).toBeInTheDocument()
    expect(screen.queryByText('Matched')).not.toBeInTheDocument()
    expect(screen.queryByText('Practice')).not.toBeInTheDocument()
  })
})
