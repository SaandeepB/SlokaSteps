import { describe, expect, it } from 'vitest'
import {
  improveBestStars,
  starsForIncorrectAttempts,
  XP_PER_LESSON,
} from '../utils/rewards'
import { appReducer, createDefaultAppState } from '../context/reducer'
import type { AppAction } from '../context/reducer'
import type { AppState } from '../types'

const LESSON_1 = 'saraswati-namastubhyam'

function run(state: AppState, ...actions: AppAction[]): AppState {
  return actions.reduce(appReducer, state)
}

function complete(slokaId: string, day = '2026-07-14', time = 'T10:00:00'): AppAction {
  return {
    type: 'COMPLETE_LESSON',
    slokaId,
    today: day,
    nowIso: `${day}${time}.000Z`,
  }
}

describe('star calculation', () => {
  it('awards 3 stars for zero incorrect scored attempts', () => {
    expect(starsForIncorrectAttempts(0)).toBe(3)
  })
  it('awards 2 stars for one or two incorrect attempts', () => {
    expect(starsForIncorrectAttempts(1)).toBe(2)
    expect(starsForIncorrectAttempts(2)).toBe(2)
  })
  it('awards 1 star for more than two incorrect attempts', () => {
    expect(starsForIncorrectAttempts(3)).toBe(1)
    expect(starsForIncorrectAttempts(10)).toBe(1)
  })
  it('best stars never decrease', () => {
    expect(improveBestStars(3, 1)).toBe(3)
    expect(improveBestStars(1, 3)).toBe(3)
  })
})

describe('XP and badge rules', () => {
  it('awards 10 XP and the badge on first completion', () => {
    const state = run(
      createDefaultAppState(),
      { type: 'START_LESSON', slokaId: LESSON_1 },
      complete(LESSON_1),
    )
    expect(state.totalXp).toBe(XP_PER_LESSON)
    expect(state.badges).toEqual(['badge-wisdom'])
    expect(state.lessons[LESSON_1].status).toBe('completed')
    expect(state.lastCompletion?.xpEarned).toBe(XP_PER_LESSON)
  })

  it('does not duplicate XP or badges when repeating a lesson', () => {
    const state = run(
      createDefaultAppState(),
      { type: 'START_LESSON', slokaId: LESSON_1 },
      complete(LESSON_1),
      { type: 'START_LESSON', slokaId: LESSON_1 },
      complete(LESSON_1, '2026-07-14', 'T11:00:00'),
    )
    expect(state.totalXp).toBe(XP_PER_LESSON)
    expect(state.badges).toEqual(['badge-wisdom'])
    expect(state.lastCompletion?.xpEarned).toBe(0)
    expect(state.practiceHistory).toHaveLength(2)
    expect(state.practiceHistory[0].kind).toBe('practice')
    expect(state.practiceHistory[1].kind).toBe('first-completion')
  })

  it('practicing again may improve but never reduce best stars', () => {
    // First run: perfect → 3 stars.
    let state = run(
      createDefaultAppState(),
      { type: 'START_LESSON', slokaId: LESSON_1 },
      complete(LESSON_1),
    )
    expect(state.lessons[LESSON_1].bestStars).toBe(3)

    // Practice run with many mistakes → 1 star, best stays 3.
    state = run(
      state,
      { type: 'START_LESSON', slokaId: LESSON_1 },
      { type: 'RECORD_INCORRECT_ATTEMPT', slokaId: LESSON_1 },
      { type: 'RECORD_INCORRECT_ATTEMPT', slokaId: LESSON_1 },
      { type: 'RECORD_INCORRECT_ATTEMPT', slokaId: LESSON_1 },
      complete(LESSON_1, '2026-07-15'),
    )
    expect(state.lastCompletion?.stars).toBe(1)
    expect(state.lessons[LESSON_1].bestStars).toBe(3)
  })

  it('two incorrect attempts yield two stars on completion', () => {
    const state = run(
      createDefaultAppState(),
      { type: 'START_LESSON', slokaId: LESSON_1 },
      { type: 'RECORD_INCORRECT_ATTEMPT', slokaId: LESSON_1 },
      { type: 'RECORD_INCORRECT_ATTEMPT', slokaId: LESSON_1 },
      complete(LESSON_1),
    )
    expect(state.lastCompletion?.stars).toBe(2)
  })

  it('streak counts one qualifying day even with multiple completions', () => {
    const state = run(
      createDefaultAppState(),
      { type: 'START_LESSON', slokaId: LESSON_1 },
      complete(LESSON_1),
      { type: 'START_LESSON', slokaId: LESSON_1 },
      complete(LESSON_1, '2026-07-14', 'T12:00:00'),
    )
    expect(state.streak.current).toBe(1)
  })
})
