import type {
  AgeBand,
  Bookmark,
  ChildProfile,
  DailyGoalMinutes,
  EarnedBadge,
  LearningProgress,
  PersistedAppState,
  PracticeHistoryEntry,
  SlokaProgress,
  StarCount,
  StoryChapterProgress,
  SupportedLanguage,
  UserPreferences,
} from '../types'
import { SUPPORTED_LANGUAGES } from '../types'
import { AGE_BANDS, DAILY_GOAL_OPTIONS } from '../types/state'

export const SCHEMA_VERSION = 2 as const
export const STORAGE_KEY = 'sloka-steps:v2'
export const LEGACY_STORAGE_KEY = 'sloka-steps:v1'

export interface ProgressRepository {
  load(): Promise<PersistedAppState>
  save(state: PersistedAppState): Promise<void>
  /** Must be called only after explicit parent confirmation. */
  reset(): Promise<void>
}

const LEGACY_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  mr: 'mr-IN',
}

export function createDefaultPreferences(): UserPreferences {
  return {
    defaultLanguage: 'en-IN',
    displayLanguage: 'en-IN',
    narrationLanguage: 'en-IN',
    narrationLinked: true,
    scriptPreference: 'regional-and-transliteration',
    calmMode: false,
    reducedMotion: false,
    voicePrivacy: {
      allowMicrophone: true,
      allowCloudEvaluation: false,
      retainPracticeRecordings: false,
      allowModelTraining: false,
      onDeviceChantCheck: false,
    },
    allowFutureCommunityFeatures: false,
  }
}

export function createDefaultProgress(): LearningProgress {
  return {
    totalXp: 0,
    streak: { current: 0, lastQualifyingDate: null },
    slokas: {},
    storyChapters: {},
    badges: [],
    bookmarks: [],
    lastMode: 'slokas',
    dailyProgress: { date: '', estimatedMinutes: 0 },
    practiceHistory: [],
  }
}

export function createDefaultPersistedState(): PersistedAppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: null,
    preferences: createDefaultPreferences(),
    progress: createDefaultProgress(),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function language(value: unknown, fallback: SupportedLanguage): SupportedLanguage {
  if (typeof value !== 'string') return fallback
  if (SUPPORTED_LANGUAGES.includes(value as SupportedLanguage)) {
    return value as SupportedLanguage
  }
  return LEGACY_LANGUAGE_MAP[value] ?? fallback
}

function dailyGoal(value: unknown): DailyGoalMinutes {
  return DAILY_GOAL_OPTIONS.includes(value as DailyGoalMinutes)
    ? (value as DailyGoalMinutes)
    : 10
}

function ageBand(value: unknown): AgeBand | null {
  return typeof value === 'string' && AGE_BANDS.includes(value as AgeBand)
    ? (value as AgeBand)
    : null
}

function sanitizeProfile(value: unknown): ChildProfile | null {
  if (!isRecord(value)) return null
  const nickname =
    typeof value.nickname === 'string'
      ? value.nickname
      : typeof value.displayName === 'string'
        ? value.displayName
        : ''
  const band = ageBand(value.ageBand ?? value.ageRange)
  if (!nickname.trim() || !band) return null
  return {
    nickname: nickname.trim().slice(0, 48),
    ageBand: band,
    dailyGoalMinutes: dailyGoal(value.dailyGoalMinutes),
  }
}

function sanitizePreferences(value: unknown): UserPreferences {
  const defaults = createDefaultPreferences()
  if (!isRecord(value)) return defaults
  const displayLanguage = language(value.displayLanguage, defaults.displayLanguage)
  const narrationLinked = value.narrationLinked !== false
  const voice = isRecord(value.voicePrivacy) ? value.voicePrivacy : {}
  const scriptPreference =
    value.scriptPreference === 'regional' ||
    value.scriptPreference === 'devanagari' ||
    value.scriptPreference === 'roman-transliteration' ||
    value.scriptPreference === 'regional-and-transliteration'
      ? value.scriptPreference
      : defaults.scriptPreference
  return {
    defaultLanguage: language(value.defaultLanguage, displayLanguage),
    displayLanguage,
    narrationLanguage: narrationLinked
      ? displayLanguage
      : language(value.narrationLanguage, displayLanguage),
    narrationLinked,
    scriptPreference,
    calmMode: value.calmMode === true,
    reducedMotion: value.reducedMotion === true,
    voicePrivacy: {
      allowMicrophone: voice.allowMicrophone !== false,
      allowCloudEvaluation: voice.allowCloudEvaluation === true,
      retainPracticeRecordings: voice.retainPracticeRecordings === true,
      allowModelTraining: false,
      onDeviceChantCheck: voice.onDeviceChantCheck === true,
    },
    allowFutureCommunityFeatures: value.allowFutureCommunityFeatures === true,
  }
}

function sanitizeStars(value: unknown): StarCount {
  return value === 1 || value === 2 || value === 3 ? value : 0
}

function sanitizeSlokaProgress(id: string, value: unknown): SlokaProgress | null {
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
    ...(typeof value.currentActivityId === 'string'
      ? { currentActivityId: value.currentActivityId }
      : {}),
    incorrectAttempts:
      typeof value.incorrectAttempts === 'number' && value.incorrectAttempts >= 0
        ? Math.floor(value.incorrectAttempts)
        : 0,
    recordingAttempted: value.recordingAttempted === true,
    bestStars: sanitizeStars(value.bestStars),
    xpAwarded: value.xpAwarded === true,
    firstCompletedOn:
      typeof value.firstCompletedOn === 'string' ? value.firstCompletedOn : null,
    ...(typeof value.lastPracticedAt === 'string'
      ? { lastPracticedAt: value.lastPracticedAt }
      : {}),
  }
}

function sanitizeStoryProgress(
  id: string,
  value: unknown,
): StoryChapterProgress | null {
  if (!isRecord(value)) return null
  return {
    chapterId: id,
    status:
      value.status === 'in-progress' || value.status === 'completed'
        ? value.status
        : 'not-started',
    currentActivityId:
      typeof value.currentActivityId === 'string' ? value.currentActivityId : null,
    completedActivityIds: Array.isArray(value.completedActivityIds)
      ? value.completedActivityIds.filter((item): item is string => typeof item === 'string')
      : [],
    incorrectAttempts:
      typeof value.incorrectAttempts === 'number' && value.incorrectAttempts >= 0
        ? Math.floor(value.incorrectAttempts)
        : 0,
    xpAwarded: value.xpAwarded === true,
    firstCompletedOn:
      typeof value.firstCompletedOn === 'string' ? value.firstCompletedOn : null,
    ...(typeof value.lastSceneId === 'string' ? { lastSceneId: value.lastSceneId } : {}),
  }
}

function sanitizeBadges(value: unknown): EarnedBadge[] {
  if (!Array.isArray(value)) return []
  const badges: EarnedBadge[] = []
  for (const badge of value) {
    if (typeof badge === 'string') badges.push({ id: badge, earnedAt: '' })
    else if (isRecord(badge) && typeof badge.id === 'string') {
      badges.push({
        id: badge.id,
        earnedAt: typeof badge.earnedAt === 'string' ? badge.earnedAt : '',
      })
    }
  }
  return badges
}

function sanitizeBookmarks(value: unknown): Bookmark[] {
  if (!Array.isArray(value)) return []
  const validTypes = ['sloka', 'sloka-line', 'story-chapter', 'story-scene']
  return value.flatMap((item): Bookmark[] => {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.contentId !== 'string' ||
      typeof item.type !== 'string' ||
      !validTypes.includes(item.type)
    ) {
      return []
    }
    return [
      {
        id: item.id,
        type: item.type as Bookmark['type'],
        contentId: item.contentId,
        ...(typeof item.parentContentId === 'string'
          ? { parentContentId: item.parentContentId }
          : {}),
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
      },
    ]
  })
}

function sanitizeHistory(value: unknown): PracticeHistoryEntry[] {
  if (!Array.isArray(value)) return []
  const entries: PracticeHistoryEntry[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const contentId =
      typeof item.contentId === 'string'
        ? item.contentId
        : typeof item.slokaId === 'string'
          ? item.slokaId
          : ''
    if (
      typeof item.id === 'string' &&
      contentId &&
      typeof item.completedAt === 'string' &&
      (item.kind === 'first-completion' || item.kind === 'practice')
    ) {
      entries.push({
        id: item.id,
        contentType: item.contentType === 'story' ? 'story' : 'sloka',
        contentId,
        completedAt: item.completedAt,
        kind: item.kind,
        stars: sanitizeStars(item.stars),
      })
    }
  }
  return entries.slice(0, 100)
}

function sanitizeProgress(value: unknown): LearningProgress {
  const defaults = createDefaultProgress()
  if (!isRecord(value)) return defaults
  const slokas: Record<string, SlokaProgress> = {}
  if (isRecord(value.slokas)) {
    for (const [id, item] of Object.entries(value.slokas)) {
      const progress = sanitizeSlokaProgress(id, item)
      if (progress) slokas[id] = progress
    }
  }
  const storyChapters: Record<string, StoryChapterProgress> = {}
  if (isRecord(value.storyChapters)) {
    for (const [id, item] of Object.entries(value.storyChapters)) {
      const progress = sanitizeStoryProgress(id, item)
      if (progress) storyChapters[id] = progress
    }
  }
  const streak = isRecord(value.streak)
    ? {
        current:
          typeof value.streak.current === 'number' && value.streak.current >= 0
            ? Math.floor(value.streak.current)
            : 0,
        lastQualifyingDate:
          typeof value.streak.lastQualifyingDate === 'string'
            ? value.streak.lastQualifyingDate
            : null,
      }
    : defaults.streak
  const daily = isRecord(value.dailyProgress) ? value.dailyProgress : {}
  return {
    totalXp:
      typeof value.totalXp === 'number' && value.totalXp >= 0
        ? Math.floor(value.totalXp)
        : 0,
    streak,
    slokas,
    storyChapters,
    badges: sanitizeBadges(value.badges),
    bookmarks: sanitizeBookmarks(value.bookmarks),
    lastMode: value.lastMode === 'stories' ? 'stories' : 'slokas',
    dailyProgress: {
      date: typeof daily.date === 'string' ? daily.date : '',
      estimatedMinutes:
        typeof daily.estimatedMinutes === 'number' && daily.estimatedMinutes >= 0
          ? daily.estimatedMinutes
          : 0,
    },
    practiceHistory: sanitizeHistory(value.practiceHistory),
  }
}

export function sanitizePersistedState(raw: unknown): PersistedAppState {
  const defaults = createDefaultPersistedState()
  if (!isRecord(raw) || raw.schemaVersion !== SCHEMA_VERSION) return defaults
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: sanitizeProfile(raw.profile),
    preferences: sanitizePreferences(raw.preferences),
    progress: sanitizeProgress(raw.progress),
  }
}

/** Migrates the frozen V1 DTO without changing or deleting its storage value. */
export function migrateV1State(raw: unknown): PersistedAppState {
  const defaults = createDefaultPersistedState()
  if (!isRecord(raw) || raw.schemaVersion !== 1) return defaults
  const legacySettings = isRecord(raw.settings) ? raw.settings : {}
  const migratedLanguage = language(legacySettings.language, 'en-IN')
  const profileValue = isRecord(raw.profile)
    ? { ...raw.profile, dailyGoalMinutes: dailyGoal(legacySettings.dailyGoalMinutes) }
    : raw.profile
  const slokas: Record<string, SlokaProgress> = {}
  if (isRecord(raw.lessons)) {
    for (const [id, value] of Object.entries(raw.lessons)) {
      const progress = sanitizeSlokaProgress(id, value)
      if (progress) slokas[id] = progress
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: sanitizeProfile(profileValue),
    preferences: sanitizePreferences({
      defaultLanguage: migratedLanguage,
      displayLanguage: migratedLanguage,
      narrationLanguage: migratedLanguage,
      narrationLinked: true,
      reducedMotion: legacySettings.reducedMotion === true,
    }),
    progress: sanitizeProgress({
      totalXp: raw.totalXp,
      streak: raw.streak,
      slokas,
      storyChapters: {},
      badges: raw.badges,
      bookmarks: [],
      lastMode: 'slokas',
      dailyProgress: raw.dailyProgress,
      practiceHistory: raw.practiceHistory,
    }),
  }
}

type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false }

function parse(value: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(value) as unknown }
  } catch {
    return { ok: false }
  }
}

function hasFutureSchema(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.schemaVersion === 'number' &&
    Number.isInteger(value.schemaVersion) &&
    value.schemaVersion > SCHEMA_VERSION
  )
}

function loadLegacyState(storage: Storage): PersistedAppState {
  const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY)
  if (legacyRaw === null) return createDefaultPersistedState()
  const legacy = parse(legacyRaw)
  return legacy.ok ? migrateV1State(legacy.value) : createDefaultPersistedState()
}

export class LocalStorageProgressRepository implements ProgressRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  async load(): Promise<PersistedAppState> {
    return this.loadSync()
  }

  loadSync(): PersistedAppState {
    try {
      const currentRaw = this.storage.getItem(STORAGE_KEY)
      if (currentRaw !== null) {
        const current = parse(currentRaw)
        // A malformed V2 write may be the result of an interrupted save. In that
        // case, recover from the still-preserved V1 value when possible. A valid
        // JSON value (including a newer schema) remains authoritative so that we
        // never silently downgrade data written by a newer app version.
        return current.ok
          ? sanitizePersistedState(current.value)
          : loadLegacyState(this.storage)
      }
      return loadLegacyState(this.storage)
    } catch {
      return createDefaultPersistedState()
    }
  }

  async save(state: PersistedAppState): Promise<void> {
    this.saveSync(state)
  }

  saveSync(state: PersistedAppState): boolean {
    const existingRaw = this.storage.getItem(STORAGE_KEY)
    if (existingRaw !== null) {
      const existing = parse(existingRaw)
      // An older app must never overwrite data written by a newer schema.
      // Explicit parent-confirmed reset remains the only supported escape hatch.
      if (existing.ok && hasFutureSchema(existing.value)) return false
    }
    this.storage.setItem(STORAGE_KEY, JSON.stringify(sanitizePersistedState(state)))
    return true
  }

  async reset(): Promise<void> {
    this.resetSync()
  }

  resetSync(): void {
    // Both keys belong to Sloka Steps. Removing V1 prevents re-migration after
    // an explicitly confirmed reset; unrelated localStorage is never touched.
    this.storage.removeItem(LEGACY_STORAGE_KEY)
    this.storage.removeItem(STORAGE_KEY)
  }
}

function browserRepository(): LocalStorageProgressRepository {
  return new LocalStorageProgressRepository(window.localStorage)
}

export function loadPersistedState(): PersistedAppState {
  try {
    return browserRepository().loadSync()
  } catch {
    // Accessing window.localStorage itself can throw when browser storage is
    // blocked. Startup must still reach a safe, usable in-memory state.
    return createDefaultPersistedState()
  }
}

export function savePersistedState(state: PersistedAppState): boolean {
  try {
    return browserRepository().saveSync(state)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Sloka Steps: could not save progress to localStorage.', error)
    }
    return false
  }
}

/** Call only after the parent confirms reset. */
export function clearPersistedState(): boolean {
  try {
    browserRepository().resetSync()
    return true
  } catch {
    return false
  }
}
