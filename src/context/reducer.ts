import type {
  AppState,
  Bookmark,
  ChildProfile,
  DailyGoalMinutes,
  PracticeHistoryEntry,
  SlokaProgress,
  StarCount,
  StoryChapterProgress,
  SupportedLanguage,
  UserPreferences,
} from '../types'
import { getSlokaById, SLOKAS } from '../content/slokas'
import {
  getStoryChapterById,
  isStoryChapterAvailable,
  RUNTIME_STORY_AVAILABILITY_POLICY,
} from '../content/stories'
import type { StoryAvailabilityPolicy } from '../content/stories'
import { createDefaultPersistedState } from '../services/persistence'
import {
  improveBestStars,
  starsForIncorrectAttempts,
  XP_PER_LESSON,
} from '../utils/rewards'
import { updateStreak } from '../utils/streak'
import { canEnterLesson, getLessonAvailability } from '../utils/progression'

interface LegacySettingsUpdates {
  language?: SupportedLanguage
  dailyGoalMinutes?: DailyGoalMinutes
  reducedMotion?: boolean
}

export interface AppReducerOptions {
  /** Fixed when the reducer is created so actions cannot bypass availability. */
  storyAvailabilityPolicy?: StoryAvailabilityPolicy
}

export type AppAction =
  | { type: 'CREATE_PROFILE'; profile: ChildProfile }
  | { type: 'UPDATE_PROFILE'; updates: Partial<ChildProfile> }
  | { type: 'UPDATE_PREFERENCES'; updates: Partial<UserPreferences> }
  | { type: 'UPDATE_SETTINGS'; updates: LegacySettingsUpdates }
  | { type: 'SET_LEARNING_MODE'; mode: 'slokas' | 'stories' }
  | { type: 'START_LESSON'; slokaId: string }
  | {
      type: 'ADVANCE_ACTIVITY'
      slokaId: string
      activityIndex: number
      activityId?: string
      estimatedMinutes: number
      today: string
    }
  | { type: 'RECORD_INCORRECT_ATTEMPT'; slokaId: string }
  | { type: 'RECORD_RECORDING_ATTEMPTED'; slokaId: string }
  | {
      type: 'COMPLETE_LESSON'
      slokaId: string
      today: string
      nowIso: string
      /**
       * Stars from a graded chant test. When present it replaces the
       * puzzle-mistake stars, so completion reflects the recitation grade —
       * a lesson gated on passing the test carries its grade here.
       */
      testStars?: StarCount
    }
  | { type: 'START_STORY_CHAPTER'; chapterId: string }
  | {
      type: 'ADVANCE_STORY_ACTIVITY'
      chapterId: string
      activityId: string
      completedActivityId?: string
    }
  | { type: 'RECORD_STORY_INCORRECT_ATTEMPT'; chapterId: string }
  | {
      type: 'COMPLETE_STORY_CHAPTER'
      chapterId: string
      completedAt: string
      xpEarned: number
    }
  | { type: 'TOGGLE_BOOKMARK'; bookmark: Bookmark }
  | { type: 'CLEAR_LAST_COMPLETION' }
  | { type: 'RESET_ALL' }

export function createDefaultAppState(): AppState {
  return { ...createDefaultPersistedState(), lastCompletion: null }
}

function createSlokaProgress(slokaId: string): SlokaProgress {
  return {
    slokaId,
    status: 'not-started',
    currentActivityIndex: 0,
    incorrectAttempts: 0,
    recordingAttempted: false,
    bestStars: 0,
    xpAwarded: false,
    firstCompletedOn: null,
  }
}

function createStoryProgress(chapterId: string): StoryChapterProgress {
  return {
    chapterId,
    status: 'not-started',
    currentActivityId: null,
    completedActivityIds: [],
    incorrectAttempts: 0,
    xpAwarded: false,
    firstCompletedOn: null,
  }
}

function withSloka(
  state: AppState,
  slokaId: string,
  update: (progress: SlokaProgress) => SlokaProgress,
): AppState {
  const current = state.progress.slokas[slokaId] ?? createSlokaProgress(slokaId)
  return {
    ...state,
    progress: {
      ...state.progress,
      slokas: { ...state.progress.slokas, [slokaId]: update(current) },
    },
  }
}

function withStory(
  state: AppState,
  chapterId: string,
  update: (progress: StoryChapterProgress) => StoryChapterProgress,
): AppState {
  const current =
    state.progress.storyChapters[chapterId] ?? createStoryProgress(chapterId)
  return {
    ...state,
    progress: {
      ...state.progress,
      storyChapters: {
        ...state.progress.storyChapters,
        [chapterId]: update(current),
      },
    },
  }
}

function isLessonEnterable(state: AppState, slokaId: string): boolean {
  const sloka = getSlokaById(slokaId)
  if (!sloka || sloka.implementationStatus !== 'complete') return false
  return canEnterLesson(
    getLessonAvailability(sloka, state.progress.slokas, SLOKAS),
  )
}

function getAvailableStoryChapter(
  chapterId: string,
  policy: StoryAvailabilityPolicy,
) {
  const chapter = getStoryChapterById(chapterId)
  return isStoryChapterAvailable(chapter, policy) ? chapter : undefined
}

function updatePreferences(
  current: UserPreferences,
  updates: Partial<UserPreferences>,
): UserPreferences {
  const next = { ...current, ...updates }
  if (updates.narrationLinked === true) {
    next.narrationLanguage = next.displayLanguage
  } else if (
    updates.displayLanguage !== undefined &&
    current.narrationLinked &&
    updates.narrationLanguage === undefined
  ) {
    next.narrationLanguage = updates.displayLanguage
  }
  next.voicePrivacy = {
    ...current.voicePrivacy,
    ...(updates.voicePrivacy ?? {}),
    allowModelTraining: false,
  }
  return next
}

export function createAppReducer(
  options: AppReducerOptions = {},
): (state: AppState, action: AppAction) => AppState {
  const storyAvailabilityPolicy =
    options.storyAvailabilityPolicy ?? RUNTIME_STORY_AVAILABILITY_POLICY
  return (state, action) =>
    reduceAppState(state, action, storyAvailabilityPolicy)
}

export function appReducer(state: AppState, action: AppAction): AppState {
  return reduceAppState(state, action, RUNTIME_STORY_AVAILABILITY_POLICY)
}

function reduceAppState(
  state: AppState,
  action: AppAction,
  storyAvailabilityPolicy: StoryAvailabilityPolicy,
): AppState {
  switch (action.type) {
    case 'CREATE_PROFILE':
      return { ...state, profile: action.profile }

    case 'UPDATE_PROFILE':
      if (!state.profile) return state
      return { ...state, profile: { ...state.profile, ...action.updates } }

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: updatePreferences(state.preferences, action.updates),
      }

    case 'UPDATE_SETTINGS': {
      const displayLanguage = action.updates.language
      const preferences = updatePreferences(state.preferences, {
        ...(displayLanguage
          ? { displayLanguage, narrationLanguage: displayLanguage }
          : {}),
        ...(action.updates.reducedMotion !== undefined
          ? { reducedMotion: action.updates.reducedMotion }
          : {}),
      })
      const profile =
        state.profile && action.updates.dailyGoalMinutes
          ? { ...state.profile, dailyGoalMinutes: action.updates.dailyGoalMinutes }
          : state.profile
      return { ...state, profile, preferences }
    }

    case 'SET_LEARNING_MODE':
      return {
        ...state,
        progress: { ...state.progress, lastMode: action.mode },
      }

    case 'START_LESSON': {
      if (!isLessonEnterable(state, action.slokaId)) return state
      return withSloka(state, action.slokaId, (progress) => ({
        ...progress,
        status: 'in-progress',
        currentActivityIndex: 0,
        currentActivityId: getSlokaById(action.slokaId)?.activities[0]?.id,
        incorrectAttempts: 0,
        recordingAttempted: false,
      }))
    }

    case 'ADVANCE_ACTIVITY': {
      if (!isLessonEnterable(state, action.slokaId)) return state
      const current =
        state.progress.slokas[action.slokaId] ?? createSlokaProgress(action.slokaId)
      const movedForward = action.activityIndex > current.currentActivityIndex
      const next = withSloka(state, action.slokaId, (progress) => ({
        ...progress,
        status: 'in-progress',
        currentActivityIndex: Math.max(
          progress.currentActivityIndex,
          action.activityIndex,
        ),
        ...(movedForward && action.activityId
          ? { currentActivityId: action.activityId }
          : {}),
      }))
      if (!movedForward) return next
      const sameDay = state.progress.dailyProgress.date === action.today
      return {
        ...next,
        progress: {
          ...next.progress,
          dailyProgress: {
            date: action.today,
            estimatedMinutes:
              (sameDay ? state.progress.dailyProgress.estimatedMinutes : 0) +
              action.estimatedMinutes,
          },
        },
      }
    }

    case 'RECORD_INCORRECT_ATTEMPT':
      if (!isLessonEnterable(state, action.slokaId)) return state
      return withSloka(state, action.slokaId, (progress) => ({
        ...progress,
        incorrectAttempts: progress.incorrectAttempts + 1,
      }))

    case 'RECORD_RECORDING_ATTEMPTED':
      if (!isLessonEnterable(state, action.slokaId)) return state
      return withSloka(state, action.slokaId, (progress) => ({
        ...progress,
        recordingAttempted: true,
      }))

    case 'COMPLETE_LESSON': {
      const sloka = getSlokaById(action.slokaId)
      if (!sloka || !isLessonEnterable(state, action.slokaId)) return state
      const progress =
        state.progress.slokas[action.slokaId] ?? createSlokaProgress(action.slokaId)
      const stars =
        action.testStars ?? starsForIncorrectAttempts(progress.incorrectAttempts)
      const isFirstCompletion = !progress.xpAwarded
      const historyEntry: PracticeHistoryEntry = {
        id: `${action.nowIso}:${action.slokaId}`,
        contentType: 'sloka',
        contentId: action.slokaId,
        completedAt: action.nowIso,
        kind: isFirstCompletion ? 'first-completion' : 'practice',
        stars,
      }
      const hasBadge = state.progress.badges.some(
        (badge) => badge.id === sloka.badge.id,
      )
      const badges =
        isFirstCompletion && !hasBadge
          ? [
              ...state.progress.badges,
              { id: sloka.badge.id, earnedAt: action.nowIso },
            ]
          : state.progress.badges
      return {
        ...state,
        progress: {
          ...state.progress,
          slokas: {
            ...state.progress.slokas,
            [action.slokaId]: {
              ...progress,
              status: 'completed',
              // Keep the terminal position until START_LESSON explicitly
              // begins a replay. Resetting to zero here makes the still-mounted
              // ActivityPage treat its final step as an invalid deep link and
              // race the completion navigation back to the introduction.
              currentActivityIndex: Math.max(
                progress.currentActivityIndex,
                sloka.activities.length - 1,
              ),
              currentActivityId: undefined,
              incorrectAttempts: 0,
              bestStars: improveBestStars(progress.bestStars, stars),
              xpAwarded: true,
              firstCompletedOn: progress.firstCompletedOn ?? action.today,
              lastPracticedAt: action.nowIso,
            },
          },
          totalXp:
            state.progress.totalXp + (isFirstCompletion ? XP_PER_LESSON : 0),
          badges,
          streak: updateStreak(state.progress.streak, action.today),
          practiceHistory: [
            historyEntry,
            ...state.progress.practiceHistory,
          ].slice(0, 100),
        },
        lastCompletion: {
          contentType: 'sloka',
          contentId: action.slokaId,
          stars,
          xpEarned: isFirstCompletion ? XP_PER_LESSON : 0,
          badgeUnlockedId: isFirstCompletion ? sloka.badge.id : null,
          isFirstCompletion,
        },
      }
    }

    case 'START_STORY_CHAPTER':
      if (!getAvailableStoryChapter(action.chapterId, storyAvailabilityPolicy)) {
        return state
      }
      return withStory(state, action.chapterId, (progress) => ({
        ...progress,
        status: progress.status === 'completed' ? 'completed' : 'in-progress',
      }))

    case 'ADVANCE_STORY_ACTIVITY':
      if (!getAvailableStoryChapter(action.chapterId, storyAvailabilityPolicy)) {
        return state
      }
      return withStory(state, action.chapterId, (progress) => ({
        ...progress,
        status: 'in-progress',
        currentActivityId: action.activityId,
        completedActivityIds:
          action.completedActivityId &&
          !progress.completedActivityIds.includes(action.completedActivityId)
            ? [...progress.completedActivityIds, action.completedActivityId]
            : progress.completedActivityIds,
      }))

    case 'RECORD_STORY_INCORRECT_ATTEMPT':
      if (!getAvailableStoryChapter(action.chapterId, storyAvailabilityPolicy)) {
        return state
      }
      return withStory(state, action.chapterId, (progress) => ({
        ...progress,
        incorrectAttempts: progress.incorrectAttempts + 1,
      }))

    case 'COMPLETE_STORY_CHAPTER': {
      const storyChapter = getAvailableStoryChapter(
        action.chapterId,
        storyAvailabilityPolicy,
      )
      const chapter = state.progress.storyChapters[action.chapterId]
      if (!storyChapter || !chapter || chapter.status === 'not-started') return state
      const isFirstCompletion = !chapter.xpAwarded
      const xp = isFirstCompletion
        ? Math.min(
            storyChapter.completionReward.xp,
            Math.max(0, Math.floor(action.xpEarned)),
          )
        : 0
      const today = action.completedAt.slice(0, 10)
      const badgeId = storyChapter.completionReward.badgeId
      const hasBadge = state.progress.badges.some((badge) => badge.id === badgeId)
      const historyEntry: PracticeHistoryEntry = {
        id: `${action.completedAt}:${action.chapterId}`,
        contentType: 'story',
        contentId: action.chapterId,
        completedAt: action.completedAt,
        kind: isFirstCompletion ? 'first-completion' : 'practice',
        stars: starsForIncorrectAttempts(chapter.incorrectAttempts),
      }
      return {
        ...state,
        progress: {
          ...state.progress,
          storyChapters: {
            ...state.progress.storyChapters,
            [action.chapterId]: {
              ...chapter,
              status: 'completed',
              currentActivityId: null,
              incorrectAttempts: 0,
              xpAwarded: true,
              firstCompletedOn: chapter.firstCompletedOn ?? today,
            },
          },
          totalXp: state.progress.totalXp + xp,
          dailyProgress: {
            date: today,
            estimatedMinutes:
              (state.progress.dailyProgress.date === today
                ? state.progress.dailyProgress.estimatedMinutes
                : 0) + storyChapter.estimatedMinutes,
          },
          badges:
            isFirstCompletion && !hasBadge
              ? [...state.progress.badges, { id: badgeId, earnedAt: action.completedAt }]
              : state.progress.badges,
          streak: updateStreak(state.progress.streak, today),
          practiceHistory: [
            historyEntry,
            ...state.progress.practiceHistory,
          ].slice(0, 100),
        },
        lastCompletion: {
          contentType: 'story',
          contentId: action.chapterId,
          stars: historyEntry.stars,
          xpEarned: xp,
          badgeUnlockedId: isFirstCompletion ? badgeId : null,
          isFirstCompletion,
        },
      }
    }

    case 'TOGGLE_BOOKMARK': {
      const exists = state.progress.bookmarks.some(
        (bookmark) => bookmark.id === action.bookmark.id,
      )
      return {
        ...state,
        progress: {
          ...state.progress,
          bookmarks: exists
            ? state.progress.bookmarks.filter(
                (bookmark) => bookmark.id !== action.bookmark.id,
              )
            : [...state.progress.bookmarks, action.bookmark],
        },
      }
    }

    case 'CLEAR_LAST_COMPLETION':
      return state.lastCompletion ? { ...state, lastCompletion: null } : state

    case 'RESET_ALL':
      return createDefaultAppState()

    default:
      return state
  }
}
