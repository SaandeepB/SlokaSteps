import type {
  ChantEvaluationRequest,
  ChantEvaluationResult,
  ChantEvaluationService,
  DimensionFeedback,
} from '../types/chant'

export const SIMULATED_EVALUATION_VERSION = 'simulated-prototype-v1'

function unableToEvaluate(message: string): DimensionFeedback {
  return {
    confidence: 0,
    status: 'unable-to-evaluate',
    message,
  }
}

function unavailableResult(
  request: ChantEvaluationRequest,
  evaluationVersion: string,
  explanation: string,
  simulated: boolean,
): ChantEvaluationResult {
  const prefix = simulated ? 'Simulated placeholder' : 'Unavailable'
  const feedback = () => unableToEvaluate(`${prefix}: ${explanation}`)

  return {
    evaluationVersion,
    referenceId: request.referenceId,
    // A Blob does not contain trustworthy duration metadata. Zero means unknown,
    // not that the child's recording was empty.
    recordingDurationMs: 0,
    audioQuality: feedback(),
    completeness: feedback(),
    pronunciation: feedback(),
    rhythm: feedback(),
    ...(request.evaluationModes.includes('melody') ? { melody: feedback() } : {}),
    childFriendlySummary: simulated
      ? 'Simulated preview only — Chant Coach did not listen to or analyze this recording.'
      : 'Chant Coach could not evaluate this recording yet.',
    parentSummary: `${prefix}: no audio analysis was performed and no scores were produced.`,
  }
}

/**
 * UI-development seam only. It never inspects audio or invents results, and
 * every returned field explicitly says that the result is simulated.
 */
export class MockChantEvaluationService implements ChantEvaluationService {
  readonly simulated = true

  evaluate(request: ChantEvaluationRequest): Promise<ChantEvaluationResult> {
    return Promise.resolve(
      unavailableResult(
        request,
        SIMULATED_EVALUATION_VERSION,
        'no audio analysis was performed',
        true,
      ),
    )
  }
}

/** Placeholder for future privacy-preserving, on-device pitch analysis. */
export class LocalPitchEvaluationService implements ChantEvaluationService {
  evaluate(request: ChantEvaluationRequest): Promise<ChantEvaluationResult> {
    return Promise.resolve(
      unavailableResult(
        request,
        'local-pitch-placeholder-v1',
        'local pitch evaluation is not implemented',
        false,
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
  evaluate(_request: ChantEvaluationRequest): Promise<ChantEvaluationResult> {
    return Promise.reject(
      new ChantEvaluationUnavailableError(
        'Server Chant Coach is unavailable; no recording was uploaded.',
      ),
    )
  }
}
