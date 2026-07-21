import type { SupportedLanguage } from './content'

export type AgeRange = '4-6' | '7-8' | '9-10'
export const AGE_RANGES: AgeRange[] = ['4-6', '7-8', '9-10']

export type DailyGoalMinutes = 5 | 10 | 15
export const DAILY_GOAL_OPTIONS: DailyGoalMinutes[] = [5, 10, 15]

export interface ChildProfile {
  displayName: string
  ageRange: AgeRange
}

export interface UserSettings {
  language: SupportedLanguage
  dailyGoalMinutes: DailyGoalMinutes
  reducedMotion: boolean
}

export type LessonStatus = 'not-started' | 'in-progress' | 'completed'

export type StarCount = 0 | 1 | 2 | 3

export interface LessonProgress {
  slokaId: string
  status: LessonStatus
  /** Index into the sloka's activities for the current/next activity. */
  currentActivityIndex: number
  /** Incorrect scored attempts in the current run (drives stars). */
  incorrectAttempts: number
  recordingAttempted: boolean
  bestStars: StarCount
  /** True once first-completion XP has been granted (idempotency flag). */
  xpAwarded: boolean
  /** ISO calendar date (yyyy-mm-dd) of the first completion, or null. */
  firstCompletedOn: string | null
}

export interface StreakState {
  current: number
  /** ISO calendar date (yyyy-mm-dd) of the last qualifying completion. */
  lastQualifyingDate: string | null
}

export interface DailyProgress {
  /** ISO calendar date the minutes belong to ('' before first activity). */
  date: string
  estimatedMinutes: number
}

export interface PracticeHistoryEntry {
  id: string
  slokaId: string
  /** Full ISO timestamp of the completion. */
  completedAt: string
  kind: 'first-completion' | 'practice'
  stars: StarCount
}

export interface PersistedAppState {
  schemaVersion: 1
  profile: ChildProfile | null
  settings: UserSettings
  lessons: Record<string, LessonProgress>
  badges: string[]
  totalXp: number
  streak: StreakState
  dailyProgress: DailyProgress
  practiceHistory: PracticeHistoryEntry[]
}

/** Result of the most recent completion; transient, never persisted. */
export interface LastCompletion {
  slokaId: string
  stars: StarCount
  xpEarned: number
  badgeUnlockedId: string | null
  isFirstCompletion: boolean
}

export interface AppState extends PersistedAppState {
  lastCompletion: LastCompletion | null
}
