import type { SupportedLanguage } from './content'

export type AgeBand = '4-6' | '7-8' | '9-10'
export const AGE_BANDS: AgeBand[] = ['4-6', '7-8', '9-10']

/** @deprecated V1 compatibility name. Use AgeBand. */
export type AgeRange = AgeBand
/** @deprecated V1 compatibility constant. Use AGE_BANDS. */
export const AGE_RANGES = AGE_BANDS

export type DailyGoalMinutes = 5 | 10 | 15
export const DAILY_GOAL_OPTIONS: DailyGoalMinutes[] = [5, 10, 15]

export interface ChildProfile {
  /** A local nickname only; Sloka Steps never asks for a legal name. */
  nickname: string
  ageBand: AgeBand
  dailyGoalMinutes: DailyGoalMinutes
}

export type SlokaScriptPreference =
  | 'regional'
  | 'devanagari'
  | 'roman-transliteration'
  | 'regional-and-transliteration'

export interface VoicePrivacyPreferences {
  allowMicrophone: boolean
  allowCloudEvaluation: boolean
  retainPracticeRecordings: boolean
  allowModelTraining: false
}

export interface UserPreferences {
  /** The single language selected during first-run setup. */
  defaultLanguage: SupportedLanguage
  displayLanguage: SupportedLanguage
  narrationLanguage: SupportedLanguage
  /** When true, changing display language also changes narration language. */
  narrationLinked: boolean
  scriptPreference: SlokaScriptPreference
  calmMode: boolean
  reducedMotion: boolean
  voicePrivacy: VoicePrivacyPreferences
  /** Parent-controlled opt-in gate. The product feature flag is also off. */
  allowFutureCommunityFeatures: boolean
}

/** @deprecated V1 compatibility name. */
export type UserSettings = UserPreferences

export type LessonStatus = 'not-started' | 'in-progress' | 'completed'
export type StarCount = 0 | 1 | 2 | 3

export interface SlokaProgress {
  slokaId: string
  status: LessonStatus
  /** Index into the sloka's activities for the current/next activity. */
  currentActivityIndex: number
  /** Stable activity id used when curricula are reordered in a later version. */
  currentActivityId?: string
  incorrectAttempts: number
  recordingAttempted: boolean
  bestStars: StarCount
  xpAwarded: boolean
  firstCompletedOn: string | null
  lastPracticedAt?: string
}

/** @deprecated V1 compatibility name. */
export type LessonProgress = SlokaProgress

export interface StoryChapterProgress {
  chapterId: string
  status: LessonStatus
  currentActivityId: string | null
  completedActivityIds: string[]
  incorrectAttempts: number
  xpAwarded: boolean
  firstCompletedOn: string | null
  lastSceneId?: string
}

export interface StreakState {
  current: number
  lastQualifyingDate: string | null
}

export interface DailyProgress {
  date: string
  estimatedMinutes: number
}

export interface PracticeHistoryEntry {
  id: string
  contentType: 'sloka' | 'story'
  contentId: string
  completedAt: string
  kind: 'first-completion' | 'practice'
  stars: StarCount
}

export interface EarnedBadge {
  id: string
  earnedAt: string
}

export type BookmarkType =
  | 'sloka'
  | 'sloka-line'
  | 'story-chapter'
  | 'story-scene'

export interface Bookmark {
  id: string
  type: BookmarkType
  contentId: string
  parentContentId?: string
  createdAt: string
}

export interface LearningProgress {
  totalXp: number
  streak: StreakState
  slokas: Record<string, SlokaProgress>
  storyChapters: Record<string, StoryChapterProgress>
  badges: EarnedBadge[]
  bookmarks: Bookmark[]
  lastMode: 'slokas' | 'stories'
  dailyProgress: DailyProgress
  practiceHistory: PracticeHistoryEntry[]
}

export interface PersistedAppState {
  schemaVersion: 2
  profile: ChildProfile | null
  preferences: UserPreferences
  progress: LearningProgress
}

/** Result of the most recent completion; transient, never persisted. */
export interface LastCompletion {
  contentType: 'sloka' | 'story'
  contentId: string
  stars: StarCount
  xpEarned: number
  badgeUnlockedId: string | null
  isFirstCompletion: boolean
}

export interface AppState extends PersistedAppState {
  lastCompletion: LastCompletion | null
}
