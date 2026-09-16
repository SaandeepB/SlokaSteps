/** BCP-47 language tags supported across interface, narration, and content. */
export type SupportedLanguage =
  | 'en-IN'
  | 'hi-IN'
  | 'te-IN'
  | 'kn-IN'
  | 'ta-IN'
  | 'mr-IN'

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'en-IN',
  'hi-IN',
  'te-IN',
  'kn-IN',
  'ta-IN',
  'mr-IN',
]

export interface LanguageInfo {
  code: SupportedLanguage
  /** Name of the language written in that language. */
  endonym: string
  englishName: string
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en-IN', endonym: 'English', englishName: 'English' },
  { code: 'hi-IN', endonym: 'हिन्दी', englishName: 'Hindi' },
  { code: 'te-IN', endonym: 'తెలుగు', englishName: 'Telugu' },
  { code: 'kn-IN', endonym: 'ಕನ್ನಡ', englishName: 'Kannada' },
  { code: 'ta-IN', endonym: 'தமிழ்', englishName: 'Tamil' },
  { code: 'mr-IN', endonym: 'मराठी', englishName: 'Marathi' },
]

export type ContentStatus = 'draft' | 'editorial-review' | 'approved'

export interface EditorialMetadata {
  status: ContentStatus
  reviewer?: string
  reviewedAt?: string
  sourceTradition?: string
  sourceReferences?: string[]
  variationNotes?: string[]
}

export type BadgeMotif = 'book' | 'sun' | 'bell' | 'heart' | 'lotus' | 'lamp'

export interface Badge {
  id: string
  name: string
  motif: BadgeMotif
}

export interface SlokaLine {
  id: string
  devanagari: string
  transliteration: string
  /** Reviewed regional-script renderings only. */
  regionalScripts?: Partial<Record<SupportedLanguage, string>>
  /** Legacy V1 line recording field; V2 resolves reviewed manifest assets first. */
  audioUrl?: string
}

export interface SlokaMeaning {
  title: string
  simpleMeaning: string
  culturalNote: string
  lineMeanings: string[]
  reviewStatus: 'prototype-draft' | 'prototype-reviewed'
}

export interface MatchPairDef {
  id: string
  phrase: string
  lineIndex: number
}

export type LessonActivity =
  | { id: string; type: 'introduction' }
  | { id: string; type: 'listen'; lineIndex: number }
  | { id: string; type: 'repeat'; lineIndex: number }
  | { id: string; type: 'meaning' }
  | { id: string; type: 'match'; pairs: MatchPairDef[] }
  | {
      id: string
      type: 'fillBlank'
      lineIndex: number
      blankWordIndex: number
      distractors: string[]
    }
  | { id: string; type: 'arrangeWords'; lineIndex: number }
  | { id: string; type: 'fullChant' }
  | { id: string; type: 'completion' }

export type LessonActivityType = LessonActivity['type']

export interface Sloka {
  id: string
  order: number
  level: number
  title: string
  theme: string
  estimatedMinutes: number
  implementationStatus: 'complete' | 'coming-soon'
  contentStatus: ContentStatus
  editorial: EditorialMetadata
  practiceStatus: 'not-started' | 'available'
  /** Retained while V1 content is incrementally moved through editorial review. */
  contentReviewStatus: 'prototype' | 'reviewed'
  badge: Badge
  lines: SlokaLine[]
  meanings: Partial<Record<SupportedLanguage, SlokaMeaning>>
  activities: LessonActivity[]
}
