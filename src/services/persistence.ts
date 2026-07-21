import type {
  AgeRange,
  ChildProfile,
  DailyGoalMinutes,
  DailyProgress,
  LessonProgress,
  PersistedAppState,
  PracticeHistoryEntry,
  StarCount,
  StreakState,
  SupportedLanguage,
  UserSettings,
} from '../types'
import { SUPPORTED_LANGUAGES } from '../types'
import { AGE_RANGES, DAILY_GOAL_OPTIONS } from '../types/state'

/** The only localStorage key Sloka Steps owns. Never touch other keys. */
export const STORAGE_KEY = 'sloka-steps:v1'

export function createDefaultPersistedState(): PersistedAppState {
  return {
    schemaVersion: 1,
    profile: null,
    settings: { language: 'en', dailyGoalMinutes: 10, reducedMotion: false },
    lessons: {},
    badges: [],
    totalXp: 0,
    streak: { current: 0, lastQualifyingDate: null },
    dailyProgress: { date: '', estimatedMinutes: 0 },
    practiceHistory: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeProfile(value: unknown): ChildProfile | null {
  if (!isRecord(value)) return null
  const { displayName, ageRange } = value
  if (typeof displayName !== 'string' || displayName.trim() === '') return null
  if (typeof ageRange !== 'string' || !AGE_RANGES.includes(ageRange as AgeRange)) {
    return null
  }
  return { displayName: displayName.slice(0, 48), ageRange: ageRange as AgeRange }
}

function sanitizeSettings(value: unknown): UserSettings {
  const defaults = createDefaultPersistedState().settings
  if (!isRecord(value)) return defaults
  const language = SUPPORTED_LANGUAGES.includes(value.language as SupportedLanguage)
    ? (value.language as SupportedLanguage)
    : defaults.language
  const dailyGoalMinutes = DAILY_GOAL_OPTIONS.includes(
    value.dailyGoalMinutes as DailyGoalMinutes,
  )
    ? (value.dailyGoalMinutes as DailyGoalMinutes)
    : defaults.dailyGoalMinutes
  const reducedMotion =
    typeof value.reducedMotion === 'boolean' ? value.reducedMotion : false
  return { language, dailyGoalMinutes, reducedMotion }
}

function sanitizeStars(value: unknown): StarCount {
  return value === 1 || value === 2 || value === 3 ? value : 0
}

function sanitizeLessonProgress(id: string, value: unknown): LessonProgress | null {
  if (!isRecord(value)) return null
  const status =
    value.status === 'in-progress' || value.status === 'completed'
      ? value.status
      : 'not-started'
  return {
    slokaId: id,
    status,
    currentActivityIndex:
      typeof value.currentActivityIndex === 'number' &&
      Number.isInteger(value.currentActivityIndex) &&
      value.currentActivityIndex >= 0
        ? value.currentActivityIndex
        : 0,
    incorrectAttempts:
      typeof value.incorrectAttempts === 'number' && value.incorrectAttempts >= 0
        ? value.incorrectAttempts
        : 0,
    recordingAttempted: value.recordingAttempted === true,
    bestStars: sanitizeStars(value.bestStars),
    xpAwarded: value.xpAwarded === true,
    firstCompletedOn:
      typeof value.firstCompletedOn === 'string' ? value.firstCompletedOn : null,
  }
}

function sanitizeStreak(value: unknown): StreakState {
  if (!isRecord(value)) return { current: 0, lastQualifyingDate: null }
  return {
    current:
      typeof value.current === 'number' && value.current >= 0
        ? Math.floor(value.current)
        : 0,
    lastQualifyingDate:
      typeof value.lastQualifyingDate === 'string' ? value.lastQualifyingDate : null,
  }
}

function sanitizeDailyProgress(value: unknown): DailyProgress {
  if (!isRecord(value)) return { date: '', estimatedMinutes: 0 }
  return {
    date: typeof value.date === 'string' ? value.date : '',
    estimatedMinutes:
      typeof value.estimatedMinutes === 'number' && value.estimatedMinutes >= 0
        ? value.estimatedMinutes
        : 0,
  }
}

function sanitizeHistory(value: unknown): PracticeHistoryEntry[] {
  if (!Array.isArray(value)) return []
  const entries: PracticeHistoryEntry[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    if (
      typeof item.id === 'string' &&
      typeof item.slokaId === 'string' &&
      typeof item.completedAt === 'string' &&
      (item.kind === 'first-completion' || item.kind === 'practice')
    ) {
      entries.push({
        id: item.id,
        slokaId: item.slokaId,
        completedAt: item.completedAt,
        kind: item.kind,
        stars: sanitizeStars(item.stars),
      })
    }
  }
  return entries.slice(0, 100)
}

/**
 * Rebuilds a safe state from unknown parsed JSON. Any missing, corrupted, or
 * unsupported portion falls back to defaults; the app must never crash on
 * manually edited or legacy storage.
 */
export function sanitizePersistedState(raw: unknown): PersistedAppState {
  const defaults = createDefaultPersistedState()
  if (!isRecord(raw) || raw.schemaVersion !== 1) return defaults

  const lessons: Record<string, LessonProgress> = {}
  if (isRecord(raw.lessons)) {
    for (const [id, value] of Object.entries(raw.lessons)) {
      const progress = sanitizeLessonProgress(id, value)
      if (progress) lessons[id] = progress
    }
  }

  return {
    schemaVersion: 1,
    profile: sanitizeProfile(raw.profile),
    settings: sanitizeSettings(raw.settings),
    lessons,
    badges: Array.isArray(raw.badges)
      ? raw.badges.filter((b): b is string => typeof b === 'string')
      : [],
    totalXp:
      typeof raw.totalXp === 'number' && raw.totalXp >= 0
        ? Math.floor(raw.totalXp)
        : 0,
    streak: sanitizeStreak(raw.streak),
    dailyProgress: sanitizeDailyProgress(raw.dailyProgress),
    practiceHistory: sanitizeHistory(raw.practiceHistory),
  }
}

export function loadPersistedState(): PersistedAppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return createDefaultPersistedState()
    return sanitizePersistedState(JSON.parse(raw))
  } catch {
    // Corrupted JSON or storage unavailable — recover with safe defaults.
    return createDefaultPersistedState()
  }
}

export function savePersistedState(state: PersistedAppState): void {
  try {
    const persisted: PersistedAppState = {
      schemaVersion: 1,
      profile: state.profile,
      settings: state.settings,
      lessons: state.lessons,
      badges: state.badges,
      totalXp: state.totalXp,
      streak: state.streak,
      dailyProgress: state.dailyProgress,
      practiceHistory: state.practiceHistory,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Sloka Steps: could not save progress to localStorage.', error)
    }
  }
}

/** Removes only the Sloka Steps key — never clears other storage. */
export function clearPersistedState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable — nothing to clear.
  }
}
