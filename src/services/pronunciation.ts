import type {
  ChantEvaluationRequest,
  ChantEvaluationService,
  UnscoredChantEvaluation,
} from '../types/chant'

export const PARTICIPATION_EVALUATION_VERSION = 'participation-only-v2'

/**
 * The only evaluator wired into the learner experience.
 *
 * Sloka Steps must never invent pronunciation scores, percentages, or "perfect
 * pronunciation" claims. This service performs no analysis at all: it returns
 * rotating encouragement regardless of what the child recorded, and its result
 * type cannot express a score.
 *
 * FUTURE INTEGRATION POINT: a validated Sanskrit analyzer implements this same
 * ChantEvaluationService interface and returns an AnalyzedChantEvaluation with
 * per-segment detail. It would run on-device or with explicit, separately
 * obtained parental consent. Until such a service exists and has been reviewed
 * by qualified Sanskrit educators, this remains the registered implementation.
 */
export class ParticipationEvaluationService implements ChantEvaluationService {
  private readonly messageKeys = [
    'feedbackGreatEffort',
    'feedbackNiceChanting',
    'feedbackTryOnceMore',
    'feedbackListenedCarefully',
  ] as const

  private nextIndex = 0

  evaluate(request: ChantEvaluationRequest): Promise<UnscoredChantEvaluation> {
    // Rotate through encouragements so repeat attempts feel varied.
    const messageKey = this.messageKeys[this.nextIndex % this.messageKeys.length]
    this.nextIndex += 1
    return Promise.resolve({
      provenance: 'participation-only',
      evaluationVersion: PARTICIPATION_EVALUATION_VERSION,
      referenceId: request.referenceId,
      childMessageKey: messageKey,
      parentSummary:
        'Participation only: no audio analysis was performed and no scores were produced.',
    })
  }
}

const participationService = new ParticipationEvaluationService()

export function getEvaluationService(): ChantEvaluationService {
  return participationService
}
