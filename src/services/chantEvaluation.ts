import type {
  ChantEvaluationRequest,
  ChantEvaluationService,
  UnscoredChantEvaluation,
} from '../types/chant'

export const SIMULATED_EVALUATION_VERSION = 'simulated-prototype-v1'
export const LOCAL_PITCH_EVALUATION_VERSION = 'local-pitch-placeholder-v1'

function unscored(
  request: ChantEvaluationRequest,
  evaluationVersion: string,
  provenance: 'simulated' | 'unavailable',
  explanation: string,
): UnscoredChantEvaluation {
  const prefix = provenance === 'simulated' ? 'Simulated placeholder' : 'Unavailable'
  return {
    provenance,
    evaluationVersion,
    referenceId: request.referenceId,
    childMessageKey:
      provenance === 'simulated'
        ? 'chantCoachSimulatedNotice'
        : 'chantCoachUnavailableNotice',
    parentSummary: `${prefix}: ${explanation}. No audio analysis was performed and no scores were produced.`,
  }
}

/**
 * UI-development seam only. It never inspects audio, and its result is marked
 * `simulated` so nothing downstream can mistake it for analysis.
 */
export class MockChantEvaluationService implements ChantEvaluationService {
  readonly simulated = true

  evaluate(request: ChantEvaluationRequest): Promise<UnscoredChantEvaluation> {
    return Promise.resolve(
      unscored(
        request,
        SIMULATED_EVALUATION_VERSION,
        'simulated',
        'no audio analysis was performed',
      ),
    )
  }
}

/** Placeholder for future privacy-preserving, on-device pitch analysis. */
export class LocalPitchEvaluationService implements ChantEvaluationService {
  evaluate(request: ChantEvaluationRequest): Promise<UnscoredChantEvaluation> {
    return Promise.resolve(
      unscored(
        request,
        LOCAL_PITCH_EVALUATION_VERSION,
        'unavailable',
        'local pitch evaluation is not implemented',
      ),
    )
  }
}

export class ChantEvaluationUnavailableError extends Error {
  readonly code = 'unable-to-evaluate'

  constructor(message: string) {
    super(message)
    this.name = 'ChantEvaluationUnavailableError'
  }
}

/**
 * Placeholder for a future protected service. It deliberately performs no
 * request so recordings can never leave the browser by accident.
 */
export class ServerChantEvaluationService implements ChantEvaluationService {
  evaluate(_request: ChantEvaluationRequest): Promise<UnscoredChantEvaluation> {
    return Promise.reject(
      new ChantEvaluationUnavailableError(
        'Server Chant Coach is unavailable; no recording was uploaded.',
      ),
    )
  }
}
