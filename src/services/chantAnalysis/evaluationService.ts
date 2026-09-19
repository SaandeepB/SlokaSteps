/**
 * The on-device chant evaluation service: the first implementation allowed
 * to return a scored (`verified`) result, and only ever that shape — it
 * compares the recording against the sloka's reference TEXT, abstains
 * per-akshara where decode consensus is absent, and refuses whole inputs
 * through the coverage gate before any per-segment verdict exists
 * (research/pronunciation-ai/10: wrong-text input scored without a gate
 * produced 32/32 false deviations).
 *
 * Failure policy is fail-closed in one direction only: every error path
 * returns an UNSCORED result with an enumerated reason. No path invents a
 * score, and no path throws at the caller.
 */

import type {
  ChantEvaluationRequest,
  ChantEvaluationResult,
  ChantEvaluationService,
  DimensionScore,
  SegmentScore,
  UnavailableReason,
  UnscoredChantEvaluation,
  VerifiedChantEvaluation,
} from '../../types/chant'
import {
  measureVoicedMs,
  type DecodedRecording,
} from './audioInput'
import { DefaultChantCoverageGate, computeCoverageAssessment } from './coverage'
import {
  decodeAksharas,
  referenceAksharas,
  scoreAgainstText,
  summarise,
} from './scoreAgainstText'
import {
  alignRefToHypIndices,
  evenFrameSpans,
  frameSpansForDecode,
  referenceSegmentTimes,
} from './segmentTiming'
import type { ChantAnalysisBackend } from './workerProtocol'

export const VERIFIED_EVALUATION_VERSION = 'verified-web-v1'
const MIN_RECORDING_MS = 800
/**
 * Longest audio the encoder is fed. Conformer self-attention grows
 * quadratically with frames; beyond this the browser session's memory is
 * not trustworthy on modest devices. Longer recordings are analysed from
 * the start and the un-analysed tail abstains — for a long ashtakam the
 * guided per-verse flow is the scoring path, not one giant take.
 */
const MAX_ANALYSIS_MS = 60_000

export type ChantLocalize = (
  key: string,
  params?: Record<string, string | number>,
) => string

export interface OnDeviceServiceDeps {
  backend: ChantAnalysisBackend
  decodeBlob: (blob: Blob) => Promise<DecodedRecording>
  localize: ChantLocalize
}

const CHILD_MESSAGE_KEY_BY_REASON: Record<UnavailableReason, string> = {
  'no-speech-detected': 'chantCoachNoSpeechNotice',
  'recording-too-short': 'chantCoachTooShortNotice',
  'audio-unclear': 'chantCoachAudioUnclearNotice',
  'expected-text-not-heard': 'chantCoachDifferentTextNotice',
  'analyzer-unavailable': 'chantCoachUnavailableNotice',
}

const PARENT_EXPLANATION_BY_REASON: Record<UnavailableReason, string> = {
  'no-speech-detected': 'no voiced audio was detected in the recording',
  'recording-too-short': 'the recording was too short to attempt a check',
  'audio-unclear': 'no coherent recitation could be made out',
  'expected-text-not-heard':
    'clear speech was heard, but it did not correspond to the expected sloka text',
  'analyzer-unavailable': 'the on-device analyzer was not available',
}

export class OnDeviceChantEvaluationService implements ChantEvaluationService {
  private readonly gate = new DefaultChantCoverageGate()

  constructor(private readonly deps: OnDeviceServiceDeps) {}

  async evaluate(request: ChantEvaluationRequest): Promise<ChantEvaluationResult> {
    try {
      return await this.evaluateInner(request)
    } catch {
      // Unexpected failures degrade to an unscored result, never to a throw
      // and never to a fabricated score.
      return this.unavailable(request, 'analyzer-unavailable')
    }
  }

  private async evaluateInner(
    request: ChantEvaluationRequest,
  ): Promise<ChantEvaluationResult> {
    const refAksharas = referenceAksharas(request.expectedText)
    if (refAksharas.length === 0) {
      return this.unavailable(request, 'analyzer-unavailable')
    }

    let recording: DecodedRecording
    try {
      recording = await this.deps.decodeBlob(request.recording)
    } catch {
      return this.unavailable(request, 'audio-unclear')
    }
    if (
      recording.durationMs < MIN_RECORDING_MS ||
      recording.samples.length === 0
    ) {
      return this.unavailable(request, 'recording-too-short')
    }

    const vad = measureVoicedMs(recording.samples)

    const maxSamples = Math.floor((MAX_ANALYSIS_MS / 1000) * 16000)
    const analysedSamples =
      recording.samples.length > maxSamples
        ? recording.samples.subarray(0, maxSamples)
        : recording.samples
    const analysedMs = Math.min(recording.durationMs, MAX_ANALYSIS_MS)

    let analysis
    try {
      analysis = await this.deps.backend.analyze(analysedSamples)
    } catch {
      return this.unavailable(request, 'analyzer-unavailable')
    }

    const assessment = computeCoverageAssessment(
      request.expectedText,
      analysis.decodes,
      vad.voicedMs,
    )
    const decision = this.gate.assess(request, assessment)
    if (decision.status === 'insufficient') {
      return this.unavailable(request, decision.reason)
    }

    const results = scoreAgainstText(request.expectedText, analysis.decodes)
    const counts = summarise(results)

    // --- timing (coarse, for playback highlighting only) -------------------
    const frameMs = analysis.outFrames > 0 ? analysedMs / analysis.outFrames : 40
    const hyp0 = decodeAksharas(analysis.decodes[0] ?? '')
    const spans =
      frameSpansForDecode(analysis.tokens0, hyp0) ??
      evenFrameSpans(analysis.tokens0, hyp0.length)
    const refToHyp = alignRefToHypIndices(refAksharas, hyp0)
    const times = referenceSegmentTimes(refToHyp, spans, frameMs)

    const segments: SegmentScore[] = results.map((result, i) => {
      const alignedCount = result.evidence.heard.filter((g) => g !== '-').length
      const base = {
        index: result.index,
        label: result.akshara,
        kind: 'syllable' as const,
        startMs: times[i].startMs,
        endMs: times[i].endMs,
        // Alignment/timing reliability: how many decode passes delivered
        // anything at this position. NOT a pronunciation probability.
        confidence: alignedCount / Math.max(1, result.evidence.decodes),
        evidence: {
          decodes: result.evidence.decodes,
          matched: result.evidence.matched,
          heard: result.evidence.heard.filter(
            (g) => g !== '-' && g !== result.akshara,
          ),
        },
      }
      if (result.label === 'correct') {
        return {
          ...base,
          status: 'assessed',
          outcome: 'matched',
          observations: [],
        }
      }
      if (result.label === 'incorrect') {
        return {
          ...base,
          status: 'assessed',
          outcome: 'deviation',
          observations: [
            {
              // Analyzer-owned taxonomy code (versioned via analyzerId): the
              // decode passes consistently delivered a different akshara.
              code: 'consistent-substitution',
              confidence:
                base.evidence.heard.length /
                Math.max(1, result.evidence.decodes),
            },
          ],
        }
      }
      return { ...base, status: 'unclear' }
    })

    // --- dimensions ---------------------------------------------------------
    const requested =
      request.evaluationModes.length > 0
        ? request.evaluationModes
        : (['completeness', 'pronunciation'] as const)
    const dimensions: VerifiedChantEvaluation['dimensions'] = {}
    if (requested.includes('completeness')) {
      dimensions.completeness = this.completenessDimension(assessment, counts)
    }
    if (requested.includes('pronunciation')) {
      dimensions.pronunciation = this.pronunciationDimension(counts)
    }

    // --- summaries ----------------------------------------------------------
    const deviationSounds = results
      .filter((r) => r.label === 'incorrect')
      .slice(0, 3)
      .map((r) => r.akshara)
    const childSummary = this.childSummary(counts, deviationSounds)
    const parentSummary =
      `On-device text check (nothing uploaded): ${counts.correct} of ` +
      `${counts.aksharas} aksharas matched by all decode passes, ` +
      `${counts.unclear} unclear (abstained), ${counts.incorrect} flagged ` +
      `with consistent differences. Provisional analyzer in internal ` +
      `testing; thresholds are not yet educator-validated and this is not ` +
      `a teacher's judgement.`

    return {
      provenance: 'verified',
      evaluationVersion: VERIFIED_EVALUATION_VERSION,
      referenceId: null,
      analyzerId: `${this.deps.backend.analyzerVersion}+verify-v1`,
      recordingDurationMs: Math.round(recording.durationMs),
      coverage: assessment,
      segments,
      dimensions,
      childSummary,
      parentSummary,
    }
  }

  private completenessDimension(
    assessment: { coveredSegments: number; expectedSegments: number },
    counts: { unclear: number; aksharas: number },
  ): DimensionScore {
    const ratio =
      assessment.expectedSegments > 0
        ? assessment.coveredSegments / assessment.expectedSegments
        : 0
    return {
      status: ratio >= 0.9 ? 'great' : ratio >= 0.6 ? 'good-practice' : 'try-again',
      score: ratio,
      confidence:
        counts.aksharas > 0 ? 1 - counts.unclear / counts.aksharas : 0,
      message: this.deps.localize('chantCoachDimCompleteness', {
        covered: assessment.coveredSegments,
        expected: assessment.expectedSegments,
      }),
    }
  }

  private pronunciationDimension(counts: {
    aksharas: number
    correct: number
    incorrect: number
    unclear: number
  }): DimensionScore {
    const assessed = counts.correct + counts.incorrect
    const status =
      counts.incorrect === 0
        ? counts.unclear > counts.aksharas / 2
          ? 'good-practice'
          : 'great'
        : counts.incorrect <= 2
          ? 'good-practice'
          : 'try-again'
    return {
      status,
      score: assessed > 0 ? counts.correct / assessed : 0,
      confidence: counts.aksharas > 0 ? assessed / counts.aksharas : 0,
      message: this.deps.localize('chantCoachDimPronunciation', {
        matched: counts.correct,
        assessed,
      }),
    }
  }

  private childSummary(
    counts: { aksharas: number; correct: number; incorrect: number; unclear: number },
    deviationSounds: string[],
  ): string {
    if (counts.incorrect === 0 && counts.unclear <= counts.aksharas * 0.25) {
      return this.deps.localize('chantCoachSummaryLovely')
    }
    if (counts.incorrect > 0) {
      return this.deps.localize('chantCoachSummaryPractice', {
        sounds: deviationSounds.join(' · '),
      })
    }
    return this.deps.localize('chantCoachSummaryTryClearer')
  }

  private unavailable(
    request: ChantEvaluationRequest,
    reason: UnavailableReason,
  ): UnscoredChantEvaluation {
    return {
      provenance: 'unavailable',
      evaluationVersion: VERIFIED_EVALUATION_VERSION,
      referenceId: request.referenceId,
      childMessageKey: CHILD_MESSAGE_KEY_BY_REASON[reason],
      parentSummary:
        `Unavailable: ${PARENT_EXPLANATION_BY_REASON[reason]}. ` +
        `No scores were produced and no audio left this device.`,
      unavailableReason: reason,
    }
  }
}
