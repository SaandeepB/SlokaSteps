import { describe, expect, it } from 'vitest'
import { appReducer, createDefaultAppState } from '../context/reducer'
import type { AppAction } from '../context/reducer'
import type { AppState } from '../types'
import { SLOKAS } from '../content/slokas'

function run(state: AppState, ...actions: AppAction[]): AppState {
  return actions.reduce(appReducer, state)
}

describe('unified V2 progress', () => {
  it('keeps sloka and story records separate while sharing XP and streak', () => {
    const chapterId = 'ramayana-ayodhya-and-king-dasharatha'
    let state = run(
      createDefaultAppState(),
      { type: 'START_STORY_CHAPTER', chapterId },
      {
        type: 'COMPLETE_STORY_CHAPTER',
        chapterId,
        completedAt: '2026-07-21T10:00:00.000Z',
        xpEarned: 20,
      },
    )
    expect(state.progress.storyChapters[chapterId].status).toBe('completed')
    expect(state.progress.slokas).toEqual({})
    expect(state.progress.totalXp).toBe(20)

    state = run(
      state,
      { type: 'START_LESSON', slokaId: 'saraswati-namastubhyam' },
      {
        type: 'COMPLETE_LESSON',
        slokaId: 'saraswati-namastubhyam',
        today: '2026-07-22',
        nowIso: '2026-07-22T10:00:00.000Z',
      },
    )
    expect(state.progress.slokas['saraswati-namastubhyam'].status).toBe('completed')
    expect(state.progress.storyChapters[chapterId].status).toBe('completed')
    expect(state.progress.totalXp).toBe(30)
    expect(state.progress.streak.current).toBe(2)
  })

  it('does not award progress to a chapter that was never started', () => {
    const before = createDefaultAppState()
    const after = appReducer(before, {
      type: 'COMPLETE_STORY_CHAPTER',
      chapterId: 'locked-or-unknown-chapter',
      completedAt: '2026-07-21T10:00:00.000Z',
      xpEarned: 20,
    })
    expect(after).toEqual(before)
  })

  it('allows replay without awarding duplicate story XP', () => {
    const chapterId = 'mahabharata-the-kuru-family'
    const complete: AppAction = {
      type: 'COMPLETE_STORY_CHAPTER',
      chapterId,
      completedAt: '2026-07-21T10:00:00.000Z',
      xpEarned: 20,
    }
    let state = run(
      createDefaultAppState(),
      { type: 'START_STORY_CHAPTER', chapterId },
      complete,
    )
    state = run(
      state,
      { type: 'START_STORY_CHAPTER', chapterId },
      { ...complete, completedAt: '2026-07-22T10:00:00.000Z' },
    )
    expect(state.progress.totalXp).toBe(20)
    expect(state.progress.practiceHistory).toHaveLength(2)
    expect(state.progress.practiceHistory[0].kind).toBe('practice')
  })

  it('uses the Chant Test grade for stars when provided, over puzzle mistakes', () => {
    const slokaId = 'saraswati-namastubhyam'
    // Two puzzle mistakes would normally cap stars at 2; a passed test at 3
    // stars must win, because completion should reflect the recitation grade.
    let state = run(
      createDefaultAppState(),
      { type: 'START_LESSON', slokaId },
      { type: 'RECORD_INCORRECT_ATTEMPT', slokaId },
      { type: 'RECORD_INCORRECT_ATTEMPT', slokaId },
      {
        type: 'COMPLETE_LESSON',
        slokaId,
        today: '2026-09-18',
        nowIso: '2026-09-18T10:00:00.000Z',
        testStars: 3,
      },
    )
    expect(state.progress.slokas[slokaId].bestStars).toBe(3)
    expect(state.lastCompletion?.stars).toBe(3)

    // A replay that scores lower does not lower the best, but records the grade.
    state = run(
      state,
      { type: 'START_LESSON', slokaId },
      {
        type: 'COMPLETE_LESSON',
        slokaId,
        today: '2026-09-19',
        nowIso: '2026-09-19T10:00:00.000Z',
        testStars: 1,
      },
    )
    expect(state.progress.slokas[slokaId].bestStars).toBe(3)
    expect(state.progress.practiceHistory[0].stars).toBe(1)
  })

  it('falls back to participation stars when no test grade is given', () => {
    const slokaId = 'saraswati-namastubhyam'
    const state = run(
      createDefaultAppState(),
      { type: 'START_LESSON', slokaId },
      {
        type: 'COMPLETE_LESSON',
        slokaId,
        today: '2026-09-18',
        nowIso: '2026-09-18T10:00:00.000Z',
      },
    )
    // No mistakes, no test grade -> baseline completion still earns stars.
    expect(state.progress.slokas[slokaId].bestStars).toBe(3)
  })

  it('persists the last selected learning mode', () => {
    const stories = appReducer(createDefaultAppState(), {
      type: 'SET_LEARNING_MODE',
      mode: 'stories',
    })
    expect(stories.progress.lastMode).toBe('stories')
  })

  it('does not double-count daily minutes when replaying a cleared activity', () => {
    const started = appReducer(createDefaultAppState(), {
      type: 'START_LESSON',
      slokaId: 'saraswati-namastubhyam',
    })
    const advance: AppAction = {
      type: 'ADVANCE_ACTIVITY',
      slokaId: 'saraswati-namastubhyam',
      activityIndex: 1,
      activityId: 'saraswati-namastubhyam-listen-1',
      estimatedMinutes: 1,
      today: '2026-07-21',
    }
    const once = appReducer(started, advance)
    const replayed = appReducer(once, advance)
    expect(once.progress.dailyProgress.estimatedMinutes).toBe(1)
    expect(replayed.progress.dailyProgress.estimatedMinutes).toBe(1)
  })

  it('preserves all V1 slokas and adds Lokah Samastah to the active path', () => {
    expect(SLOKAS.map((sloka) => sloka.title)).toEqual(
      expect.arrayContaining([
        'Saraswati Namastubhyam',
        'Vakratunda Mahakaya',
        'Guru Brahma',
        'Tvameva Mata Cha Pita Tvameva',
        'Karagre Vasate Lakshmi',
        'Shubham Karoti Kalyanam',
        'Asato Ma Sadgamaya',
        'Sarve Bhavantu Sukhinah',
        'Lokah Samastah Sukhino Bhavantu',
      ]),
    )
  })
})
