import type {
  AppState,
  ChildProfile,
  LessonProgress,
  PracticeHistoryEntry,
  UserSettings,
} from '../types'
import { getSlokaById, SLOKAS } from '../content/slokas'
import { createDefaultPersistedState } from '../services/persistence'
import {
  improveBestStars,
  starsForIncorrectAttempts,
  XP_PER_LESSON,
} from '../utils/rewards'
import { updateStreak } from '../utils/streak'
import { canEnterLesson, getLessonAvailability } from '../utils/progression'

export type AppAction =
  | { type: 'CREATE_PROFILE'; profile: ChildProfile }
  | { type: 'UPDATE_PROFILE'; updates: Partial<ChildProfile> }
  | { type: 'UPDATE_SETTINGS'; updates: Partial<UserSettings> }
  | { type: 'START_LESSON'; slokaId: string }
  | {
      type: 'ADVANCE_ACTIVITY'
      slokaId: string
      activityIndex: number
      estimatedMinutes: number
      today: string
    }
  | { type: 'RECORD_INCORRECT_ATTEMPT'; slokaId: string }
  | { type: 'RECORD_RECORDING_ATTEMPTED'; slokaId: string }
  | { type: 'COMPLETE_LESSON'; slokaId: string; today: string; nowIso: string }
  | { type: 'CLEAR_LAST_COMPLETION' }
  | { type: 'RESET_ALL' }

export function createDefaultAppState(): AppState {
  return { ...createDefaultPersistedState(), lastCompletion: null }
}

function createLessonProgress(slokaId: string): LessonProgress {
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

function withLesson(
  state: AppState,
  slokaId: string,
  update: (progress: LessonProgress) => LessonProgress,
): AppState {
  const current = state.lessons[slokaId] ?? createLessonProgress(slokaId)
  return {
    ...state,
    lessons: { ...state.lessons, [slokaId]: update(current) },
  }
}

/** True when the lesson is implemented and reachable (not locked/preview). */
function isLessonEnterable(state: AppState, slokaId: string): boolean {
  const sloka = getSlokaById(slokaId)
  if (!sloka || sloka.implementationStatus !== 'complete') return false
  return canEnterLesson(getLessonAvailability(sloka, state.lessons, SLOKAS))
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'CREATE_PROFILE':
      return { ...state, profile: action.profile }

    case 'UPDATE_PROFILE':
      if (!state.profile) return state
      return { ...state, profile: { ...state.profile, ...action.updates } }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.updates } }

    case 'START_LESSON': {
      if (!isLessonEnterable(state, action.slokaId)) return state
      return withLesson(state, action.slokaId, (progress) => ({
        ...progress,
        status: 'in-progress',
        currentActivityIndex: 0,
        incorrectAttempts: 0,
        recordingAttempted: false,
      }))
    }

    case 'ADVANCE_ACTIVITY': {
      if (!isLessonEnterable(state, action.slokaId)) return state
      const next = withLesson(state, action.slokaId, (progress) => ({
        ...progress,
        status: 'in-progress',
        // Revisiting an earlier step must never move the saved place backwards.
        currentActivityIndex: Math.max(
          progress.currentActivityIndex,
          action.activityIndex,
        ),
      }))
      const sameDay = state.dailyProgress.date === action.today
      return {
        ...next,
        dailyProgress: {
          date: action.today,
          estimatedMinutes:
            (sameDay ? state.dailyProgress.estimatedMinutes : 0) +
            action.estimatedMinutes,
        },
      }
    }

    case 'RECORD_INCORRECT_ATTEMPT':
      if (!isLessonEnterable(state, action.slokaId)) return state
      return withLesson(state, action.slokaId, (progress) => ({
        ...progress,
        incorrectAttempts: progress.incorrectAttempts + 1,
      }))

    case 'RECORD_RECORDING_ATTEMPTED':
      if (!isLessonEnterable(state, action.slokaId)) return state
      return withLesson(state, action.slokaId, (progress) => ({
        ...progress,
        recordingAttempted: true,
      }))

    case 'COMPLETE_LESSON': {
      const sloka = getSlokaById(action.slokaId)
      // Coming-soon and locked lessons can never complete or award anything,
      // even via a manually crafted URL or action.
      if (!sloka || !isLessonEnterable(state, action.slokaId)) return state

      const progress =
        state.lessons[action.slokaId] ?? createLessonProgress(action.slokaId)
      const stars = starsForIncorrectAttempts(progress.incorrectAttempts)
      const isFirstCompletion = !progress.xpAwarded

      const historyEntry: PracticeHistoryEntry = {
        id: `${action.nowIso}:${action.slokaId}`,
        slokaId: action.slokaId,
        completedAt: action.nowIso,
        kind: isFirstCompletion ? 'first-completion' : 'practice',
        stars,
      }

      const badges =
        isFirstCompletion && !state.badges.includes(sloka.badge.id)
          ? [...state.badges, sloka.badge.id]
          : state.badges

      return {
        ...state,
        lessons: {
          ...state.lessons,
          [action.slokaId]: {
            ...progress,
            status: 'completed',
            currentActivityIndex: 0,
            incorrectAttempts: 0,
            bestStars: improveBestStars(progress.bestStars, stars),
            xpAwarded: true,
            firstCompletedOn: progress.firstCompletedOn ?? action.today,
          },
        },
        totalXp: state.totalXp + (isFirstCompletion ? XP_PER_LESSON : 0),
        badges,
        streak: updateStreak(state.streak, action.today),
        practiceHistory: [historyEntry, ...state.practiceHistory].slice(0, 100),
        lastCompletion: {
          slokaId: action.slokaId,
          stars,
          xpEarned: isFirstCompletion ? XP_PER_LESSON : 0,
          badgeUnlockedId: isFirstCompletion ? sloka.badge.id : null,
          isFirstCompletion,
        },
      }
    }

    case 'CLEAR_LAST_COMPLETION':
      if (!state.lastCompletion) return state
      return { ...state, lastCompletion: null }

    case 'RESET_ALL':
      return createDefaultAppState()

    default:
      return state
  }
}
