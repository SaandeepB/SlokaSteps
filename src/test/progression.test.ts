import { describe, expect, it } from 'vitest'
import { SLOKAS, getSlokaById } from '../content/slokas'
import {
  getCompletionPercent,
  getLessonAvailability,
} from '../utils/progression'
import { appReducer, createDefaultAppState } from '../context/reducer'
import type { AppAction } from '../context/reducer'
import type { AppState } from '../types'

const LESSON_1 = 'saraswati-namastubhyam'
const LESSON_2 = 'vakratunda-mahakaya'
const LESSON_3 = 'guru-brahma'
const COMING_SOON = 'asato-ma'

function run(state: AppState, ...actions: AppAction[]): AppState {
  return actions.reduce(appReducer, state)
}

function complete(slokaId: string): AppAction {
  return {
    type: 'COMPLETE_LESSON',
    slokaId,
    today: '2026-07-14',
    nowIso: '2026-07-14T10:00:00.000Z',
  }
}

function availability(state: AppState, slokaId: string) {
  const sloka = getSlokaById(slokaId)
  if (!sloka) throw new Error(`unknown sloka ${slokaId}`)
  return getLessonAvailability(sloka, state.progress.slokas, SLOKAS)
}

describe('sequential unlocking', () => {
  it('only lesson 1 is available initially', () => {
    const state = createDefaultAppState()
    expect(availability(state, LESSON_1)).toBe('available')
    expect(availability(state, LESSON_2)).toBe('locked')
    expect(availability(state, LESSON_3)).toBe('locked')
  })

  it('completing lesson 1 unlocks lesson 2 (and only lesson 2)', () => {
    const state = run(
      createDefaultAppState(),
      { type: 'START_LESSON', slokaId: LESSON_1 },
      complete(LESSON_1),
    )
    expect(availability(state, LESSON_1)).toBe('completed')
    expect(availability(state, LESSON_2)).toBe('available')
    expect(availability(state, LESSON_3)).toBe('locked')
  })

  it('keeps completed lessons at their terminal position until replay starts', () => {
    const sloka = getSlokaById(LESSON_1)
    if (!sloka) throw new Error('missing lesson fixture')

    const completed = run(
      createDefaultAppState(),
      { type: 'START_LESSON', slokaId: LESSON_1 },
      {
        type: 'ADVANCE_ACTIVITY',
        slokaId: LESSON_1,
        activityIndex: sloka.activities.length - 1,
        activityId: sloka.activities.at(-1)?.id,
        estimatedMinutes: 1,
        today: '2026-07-14',
      },
      complete(LESSON_1),
    )

    expect(completed.progress.slokas[LESSON_1].currentActivityIndex).toBe(
      sloka.activities.length - 1,
    )

    const replaying = run(completed, {
      type: 'START_LESSON',
      slokaId: LESSON_1,
    })
    expect(replaying.progress.slokas[LESSON_1].currentActivityIndex).toBe(0)
  })

  it('sequential completion unlocks each next lesson', () => {
    let state = createDefaultAppState()
    for (const id of [LESSON_1, LESSON_2]) {
      state = run(state, { type: 'START_LESSON', slokaId: id }, complete(id))
    }
    expect(availability(state, LESSON_3)).toBe('available')
  })

  it('coming-soon lessons stay coming-soon even after everything else', () => {
    let state = createDefaultAppState()
    for (const sloka of SLOKAS.filter((s) => s.implementationStatus === 'complete')) {
      state = run(
        state,
        { type: 'START_LESSON', slokaId: sloka.id },
        complete(sloka.id),
      )
    }
    expect(availability(state, COMING_SOON)).toBe('coming-soon')
    expect(availability(state, 'sarve-bhavantu')).toBe('coming-soon')
  })
})

describe('lesson progress percentage', () => {
  it('counts only rendered activities at the final active step', () => {
    const sloka = getSlokaById(LESSON_1)
    if (!sloka) throw new Error('missing lesson fixture')

    expect(
      getCompletionPercent(sloka, {
        slokaId: sloka.id,
        status: 'in-progress',
        currentActivityIndex: sloka.activities.length - 2,
        incorrectAttempts: 0,
        recordingAttempted: false,
        bestStars: 0,
        xpAwarded: false,
        firstCompletedOn: null,
      }),
    ).toBe(99)
  })
})

describe('locked and preview lessons cannot award progress', () => {
  it('a locked lesson cannot be completed via a direct action/URL', () => {
    const before = createDefaultAppState()
    const after = run(before, complete(LESSON_3))
    expect(after).toEqual(before)
  })

  it('a coming-soon lesson cannot start, complete, or award anything', () => {
    const before = createDefaultAppState()
    const afterStart = run(before, { type: 'START_LESSON', slokaId: COMING_SOON })
    expect(afterStart).toEqual(before)

    const afterComplete = run(before, complete(COMING_SOON))
    expect(afterComplete).toEqual(before)
    expect(afterComplete.progress.totalXp).toBe(0)
    expect(afterComplete.progress.badges).toEqual([])
    expect(afterComplete.progress.streak.current).toBe(0)
  })
})
