import type {
  PronunciationEvaluationService,
  PronunciationFeedback,
} from '../types'

/**
 * Version 1 MOCK implementation — intentionally non-authoritative.
 *
 * Sloka Steps must never invent pronunciation scores, percentages, or
 * "perfect pronunciation" claims. This mock only ever returns
 * participation-oriented encouragement, regardless of the audio content.
 *
 * FUTURE INTEGRATION POINT: a validated Sanskrit pronunciation service
 * (reviewed by qualified Sanskrit educators) could replace this class. It
 * would receive the audio blob and expected text, run on-device or with
 * explicit parental consent, and return real feedback. Until such a service
 * exists and is validated, keep feedback participation-only.
 */
export class MockPronunciationEvaluation implements PronunciationEvaluationService {
  private readonly messageKeys = [
    'feedbackGreatEffort',
    'feedbackNiceChanting',
    'feedbackTryOnceMore',
    'feedbackListenedCarefully',
  ] as const

  private nextIndex = 0

  evaluate(
    _audioBlob: Blob,
    _expectedText: string,
    _language: string,
  ): Promise<PronunciationFeedback> {
    // Rotate through encouragements so repeat attempts feel varied.
    const messageKey = this.messageKeys[this.nextIndex % this.messageKeys.length]
    this.nextIndex += 1
    return Promise.resolve({
      kind: 'participation',
      messageKey,
      authoritative: false,
    })
  }
}

const mockEvaluation = new MockPronunciationEvaluation()

export function getPronunciationService(): PronunciationEvaluationService {
  return mockEvaluation
}
