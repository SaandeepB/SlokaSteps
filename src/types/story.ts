import type { ContentStatus, SupportedLanguage } from './content'
import type { AgeBand } from './state'

/** A complete text value for every language supported by Version 2. */
export interface LocalizedText {
  'en-IN': string
  'hi-IN': string
  'te-IN': string
  'kn-IN': string
  'ta-IN': string
  'mr-IN': string
}

/** Keeps this model tied to the application's canonical language union. */
export type StoryLanguage = SupportedLanguage & keyof LocalizedText

export interface CharacterReference {
  id: string
  name: LocalizedText
  description: LocalizedText
  role: LocalizedText
  imageUrl?: string
  imageAlt?: LocalizedText
}

export interface StorySceneTiming {
  sentenceIndex: number
  startMs: number
  endMs: number
}

export interface StoryScene {
  id: string
  order: number
  text: LocalizedText
  imagePrompt?: string
  imageUrl?: string
  imageAlt?: LocalizedText
  narrationKey: string
  /** Optional timing seam for future read-with-me highlighting. */
  timing?: StorySceneTiming[]
}

export interface StoryOrderingEvent {
  id: string
  order: number
  text: LocalizedText
}

export interface StoryOrderingActivity {
  id: string
  type: 'event-ordering'
  instruction: LocalizedText
  events: StoryOrderingEvent[]
}

export interface StoryQuizChoice {
  id: string
  text: LocalizedText
}

export interface StoryQuizQuestion {
  id: string
  prompt: LocalizedText
  choices: StoryQuizChoice[]
  correctChoiceId: string
  explanation: LocalizedText
}

export interface StoryComprehensionActivity {
  id: string
  type: 'comprehension-quiz'
  instruction: LocalizedText
  questions: StoryQuizQuestion[]
}

export interface StoryReflectionChoice {
  id: string
  text: LocalizedText
}

export interface StoryValuesReflectionActivity {
  id: string
  type: 'values-reflection'
  prompt: LocalizedText
  /** Guided choices avoid requiring free-text answers from young children. */
  choices: StoryReflectionChoice[]
  encouragement: LocalizedText
}

export type StoryActivity =
  | StoryOrderingActivity
  | StoryComprehensionActivity
  | StoryValuesReflectionActivity

export interface StoryCompletionReward {
  xp: number
  badgeId: string
  badgeTitle: LocalizedText
  message: LocalizedText
}

export interface StoryChapter {
  id: string
  bookId: string
  order: number
  title: LocalizedText
  summary: LocalizedText
  ageBand: AgeBand
  estimatedMinutes: number
  scenes: StoryScene[]
  characters: CharacterReference[]
  activities: StoryActivity[]
  values: LocalizedText[]
  recap: LocalizedText
  completionReward: StoryCompletionReward
  contentStatus: ContentStatus
  sourceNotes?: string[]
}

export interface StoryBook {
  id: string
  epicId: string
  title: LocalizedText
  order: number
  chapters: StoryChapter[]
}

export interface Epic {
  id: string
  title: LocalizedText
  description: LocalizedText
  coverImage?: string
  books: StoryBook[]
  contentStatus: ContentStatus
  sourceTradition?: string
  editorialNotes?: string[]
}
