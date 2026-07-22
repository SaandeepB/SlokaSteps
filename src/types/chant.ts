import type { AgeBand } from './state'

/** A reference may represent spoken recitation or one of several melodic traditions. */
export type RecitationStyle =
  | 'plain-recitation'
  | 'melodic-sloka'
  | 'vedic-chant'
  | 'teacher-specific'

export interface ChantReference {
  id: string
  slokaId: string
  name: string
  teacherName?: string
  traditionLabel?: string
  recitationStyle: RecitationStyle
  audioUrl: string
  slowAudioUrl?: string
  waveformDataUrl?: string
  pitchContourUrl?: string
  alignmentDataUrl?: string
  version: number
  reviewStatus:
    | 'draft'
    | 'pronunciation-review'
    | 'cultural-review'
    | 'approved'
    | 'rejected'
}

export interface DimensionFeedback {
  score?: number
  confidence: number
  status: 'great' | 'good-practice' | 'try-again' | 'unable-to-evaluate'
  message: string
}

export interface ChantEvaluationResult {
  evaluationVersion: string
  referenceId: string
  recordingDurationMs: number
  audioQuality: DimensionFeedback
  completeness: DimensionFeedback
  pronunciation: DimensionFeedback
  rhythm: DimensionFeedback
  melody?: DimensionFeedback
  childFriendlySummary: string
  parentSummary?: string
}

export type ChantEvaluationMode =
  | 'completeness'
  | 'pronunciation'
  | 'rhythm'
  | 'melody'

export interface ChantEvaluationRequest {
  recording: Blob
  slokaId: string
  referenceId: string
  ageBand: AgeBand
  evaluationModes: ChantEvaluationMode[]
}

export interface ChantEvaluationService {
  evaluate(request: ChantEvaluationRequest): Promise<ChantEvaluationResult>
}
