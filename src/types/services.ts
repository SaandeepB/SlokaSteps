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

// Pronunciation and chant feedback share one contract in `./chant`:
// ChantEvaluationService, whose result can only carry scores when a validated
// analyzer produced them.
