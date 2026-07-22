export interface AudioPlaybackService {
  isSupported(): boolean
  playText(
    text: string,
    options?: {
      rate?: number
      language?: string
    },
  ): Promise<void>
  pause(): void
  resume(): void
  stop(): void
}

/**
 * Participation-oriented feedback only. Version 1 has no validated Sanskrit
 * pronunciation model, so no implementation may claim accuracy or scores.
 */
export interface PronunciationFeedback {
  kind: 'participation'
  /** Translation key of an encouraging message (resolved via t()). */
  messageKey: string
  /** Always false in Version 1 — this is not a real evaluation. */
  authoritative: false
}

export interface PronunciationEvaluationService {
  evaluate(
    audioBlob: Blob,
    expectedText: string,
    language: string,
  ): Promise<PronunciationFeedback>
}
