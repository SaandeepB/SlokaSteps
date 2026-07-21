import { describe, expect, it } from 'vitest'
import {
  clearPersistedState,
  createDefaultPersistedState,
  loadPersistedState,
  sanitizePersistedState,
  savePersistedState,
  STORAGE_KEY,
} from '../services/persistence'

describe('persistence', () => {
  it('returns defaults when localStorage is empty', () => {
    const state = loadPersistedState()
    expect(state).toEqual(createDefaultPersistedState())
  })

  it('loads a valid saved state back correctly', () => {
    const state = createDefaultPersistedState()
    state.profile = { displayName: 'Anu', ageRange: '7-8' }
    state.settings.language = 'te'
    state.settings.dailyGoalMinutes = 15
    state.totalXp = 20
    state.badges = ['badge-wisdom']
    state.lessons['saraswati-namastubhyam'] = {
      slokaId: 'saraswati-namastubhyam',
      status: 'completed',
      currentActivityIndex: 0,
      incorrectAttempts: 0,
      recordingAttempted: true,
      bestStars: 3,
      xpAwarded: true,
      firstCompletedOn: '2026-07-14',
    }
    savePersistedState(state)

    const loaded = loadPersistedState()
    expect(loaded).toEqual(state)
  })

  it('recovers safe defaults from corrupted JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not valid json!!')
    expect(loadPersistedState()).toEqual(createDefaultPersistedState())
  })

  it('recovers safe defaults from an unsupported schema version', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 99, totalXp: 5000 }),
    )
    expect(loadPersistedState()).toEqual(createDefaultPersistedState())
  })

  it('sanitizes partially corrupted fields instead of crashing', () => {
    const state = sanitizePersistedState({
      schemaVersion: 1,
      profile: { displayName: 42 },
      settings: { language: 'xx', dailyGoalMinutes: 999 },
      lessons: { bad: null, ok: { status: 'completed', bestStars: 3 } },
      badges: ['a', 5, 'b'],
      totalXp: -10,
      streak: 'nope',
      dailyProgress: null,
      practiceHistory: 'nope',
    })
    expect(state.profile).toBeNull()
    expect(state.settings.language).toBe('en')
    expect(state.settings.dailyGoalMinutes).toBe(10)
    expect(state.lessons.ok?.status).toBe('completed')
    expect(state.lessons.bad).toBeUndefined()
    expect(state.badges).toEqual(['a', 'b'])
    expect(state.totalXp).toBe(0)
    expect(state.streak).toEqual({ current: 0, lastQualifyingDate: null })
    expect(state.practiceHistory).toEqual([])
  })

  it('reset removes only the Sloka Steps key', () => {
    window.localStorage.setItem('some-other-app', 'keep me')
    savePersistedState(createDefaultPersistedState())
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull()

    clearPersistedState()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem('some-other-app')).toBe('keep me')
  })
})
