/** Languages selectable for the interface and meaning translations. */
export type SupportedLanguage = 'en' | 'hi' | 'te' | 'kn' | 'ta' | 'mr'

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'en',
  'hi',
  'te',
  'kn',
  'ta',
  'mr',
]

export interface LanguageInfo {
  code: SupportedLanguage
  /** Name of the language written in that language. */
  endonym: string
  englishName: string
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', endonym: 'English', englishName: 'English' },
  { code: 'hi', endonym: 'हिन्दी', englishName: 'Hindi' },
  { code: 'te', endonym: 'తెలుగు', englishName: 'Telugu' },
  { code: 'kn', endonym: 'ಕನ್ನಡ', englishName: 'Kannada' },
  { code: 'ta', endonym: 'தமிழ்', englishName: 'Tamil' },
  { code: 'mr', endonym: 'मराठी', englishName: 'Marathi' },
]

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
  /**
   * Regional-script renderings, added only when reviewed content exists.
   * When absent, the UI shows the transliteration with a fallback notice.
   */
  regionalScripts?: Partial<Record<SupportedLanguage, string>>
  /** Reviewed prerecorded audio, when it exists. Absent in Version 1. */
  audioUrl?: string
}

export interface SlokaMeaning {
  title: string
  simpleMeaning: string
  culturalNote: string
  /** One child-friendly meaning per sloka line, index-aligned with `lines`. */
  lineMeanings: string[]
  reviewStatus: 'prototype-draft' | 'prototype-reviewed'
}

export interface MatchPairDef {
  id: string
  /** Transliterated phrase shown on the left side. */
  phrase: string
  /** Index into `lines` / `lineMeanings` for the localized meaning. */
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
      /** Index of the removed word within the transliteration's words. */
      blankWordIndex: number
      /** Plausible wrong options (the correct word is added automatically). */
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
  contentReviewStatus: 'prototype' | 'reviewed'
  badge: Badge
  lines: SlokaLine[]
  meanings: Partial<Record<SupportedLanguage, SlokaMeaning>>
  activities: LessonActivity[]
}
