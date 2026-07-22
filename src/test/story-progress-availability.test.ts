import { describe, expect, it } from 'vitest'
import {
  createAppReducer,
  createDefaultAppState,
  type AppAction,
} from '../context/reducer'
import {
  STORY_AVAILABILITY_POLICIES,
  ayodhyaAndDasharathaChapter,
} from '../content/stories'
import type { AppState } from '../types'

const chapter = ayodhyaAndDasharathaChapter

const developmentReducer = createAppReducer({
  storyAvailabilityPolicy: STORY_AVAILABILITY_POLICIES.development,
})
const productionReducer = createAppReducer({
  storyAvailabilityPolicy: STORY_AVAILABILITY_POLICIES.production,
})

function run(
  reducer: (state: AppState, action: AppAction) => AppState,
  state: AppState,
  ...actions: AppAction[]
): AppState {
  return actions.reduce(reducer, state)
}

describe('story progress availability invariant', () => {
  it('rejects every editorial-review progress mutation in production', () => {
    const untouched = createDefaultAppState()
    const startedInDevelopment = developmentReducer(untouched, {
      type: 'START_STORY_CHAPTER',
      chapterId: chapter.id,
    })
    const mutations: Array<{ state: AppState; action: AppAction }> = [
      {
        state: untouched,
        action: { type: 'START_STORY_CHAPTER', chapterId: chapter.id },
      },
      {
        state: startedInDevelopment,
        action: {
          type: 'ADVANCE_STORY_ACTIVITY',
          chapterId: chapter.id,
          activityId: chapter.activities[0].id,
        },
      },
      {
        state: startedInDevelopment,
        action: {
          type: 'RECORD_STORY_INCORRECT_ATTEMPT',
          chapterId: chapter.id,
        },
      },
      {
        state: startedInDevelopment,
        action: {
          type: 'COMPLETE_STORY_CHAPTER',
          chapterId: chapter.id,
          completedAt: '2026-07-21T10:00:00.000Z',
          xpEarned: chapter.completionReward.xp,
        },
      },
    ]

    for (const mutation of mutations) {
      expect(productionReducer(mutation.state, mutation.action)).toBe(
        mutation.state,
      )
    }
  })

  it('keeps the editorial demo usable in development and counts active time', () => {
    const completedAt = '2026-07-21T10:00:00.000Z'
    const state = run(
      developmentReducer,
      createDefaultAppState(),
      { type: 'START_STORY_CHAPTER', chapterId: chapter.id },
      {
        type: 'ADVANCE_STORY_ACTIVITY',
        chapterId: chapter.id,
        activityId: chapter.activities[0].id,
        completedActivityId: chapter.activities[0].id,
      },
      { type: 'RECORD_STORY_INCORRECT_ATTEMPT', chapterId: chapter.id },
      {
        type: 'COMPLETE_STORY_CHAPTER',
        chapterId: chapter.id,
        completedAt,
        xpEarned: chapter.completionReward.xp,
      },
    )

    expect(state.progress.storyChapters[chapter.id].status).toBe('completed')
    expect(state.progress.totalXp).toBe(chapter.completionReward.xp)
    expect(state.progress.dailyProgress).toEqual({
      date: '2026-07-21',
      estimatedMinutes: chapter.estimatedMinutes,
    })
  })

  it('rejects unknown chapter ids under both explicit policies', () => {
    const initial = createDefaultAppState()
    const action: AppAction = {
      type: 'START_STORY_CHAPTER',
      chapterId: 'unknown-story-chapter',
    }

    expect(developmentReducer(initial, action)).toBe(initial)
    expect(productionReducer(initial, action)).toBe(initial)
  })
})
