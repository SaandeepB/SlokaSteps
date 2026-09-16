import { describe, expect, it, vi } from 'vitest'
import {
  clearPersistedState,
  createDefaultPersistedState,
  LEGACY_STORAGE_KEY,
  loadPersistedState,
  LocalStorageProgressRepository,
  migrateV1State,
  sanitizePersistedState,
  savePersistedState,
  STORAGE_KEY,
} from '../services/persistence'

describe('versioned persistence', () => {
  it('returns V2 defaults when storage is empty', () => {
    expect(loadPersistedState()).toEqual(createDefaultPersistedState())
  })

  it('returns safe defaults when the window.localStorage getter is blocked', () => {
    const storageGetter = vi
      .spyOn(window, 'localStorage', 'get')
      .mockImplementation(() => {
        throw new DOMException('Storage is blocked', 'SecurityError')
      })

    try {
      expect(loadPersistedState()).toEqual(createDefaultPersistedState())
    } finally {
      storageGetter.mockRestore()
    }
  })

  it('saves and loads a V2 state through the repository', async () => {
    const state = createDefaultPersistedState()
    state.profile = { nickname: 'Anu', ageBand: '7-8', dailyGoalMinutes: 15 }
    state.preferences.displayLanguage = 'te-IN'
    state.preferences.narrationLanguage = 'te-IN'
    state.progress.totalXp = 20
    state.progress.badges = [{ id: 'badge-wisdom', earnedAt: '2026-07-14T10:00:00Z' }]
    state.progress.slokas['saraswati-namastubhyam'] = {
      slokaId: 'saraswati-namastubhyam',
      status: 'completed',
      currentActivityIndex: 0,
      incorrectAttempts: 0,
      recordingAttempted: true,
      bestStars: 3,
      xpAwarded: true,
      firstCompletedOn: '2026-07-14',
    }
    const repository = new LocalStorageProgressRepository(window.localStorage)
    await repository.save(state)
    expect(await repository.load()).toEqual(state)
  })

  it('migrates V1 progress and language without deleting the V1 source', () => {
    const legacy = {
      schemaVersion: 1,
      profile: { displayName: 'Anu', ageRange: '7-8' },
      settings: { language: 'te', dailyGoalMinutes: 15, reducedMotion: true },
      lessons: {
        'saraswati-namastubhyam': {
          status: 'completed',
          currentActivityIndex: 4,
          incorrectAttempts: 1,
          recordingAttempted: true,
          bestStars: 2,
          xpAwarded: true,
          firstCompletedOn: '2026-07-14',
        },
      },
      badges: ['badge-wisdom'],
      totalXp: 10,
      streak: { current: 3, lastQualifyingDate: '2026-07-14' },
      dailyProgress: { date: '2026-07-14', estimatedMinutes: 6 },
      practiceHistory: [
        {
          id: 'history-1',
          slokaId: 'saraswati-namastubhyam',
          completedAt: '2026-07-14T10:00:00Z',
          kind: 'first-completion',
          stars: 2,
        },
      ],
    }
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy))

    const migrated = loadPersistedState()
    expect(migrated).toEqual(migrateV1State(legacy))
    expect(migrated.profile).toEqual({
      nickname: 'Anu',
      ageBand: '7-8',
      dailyGoalMinutes: 15,
    })
    expect(migrated.preferences.displayLanguage).toBe('te-IN')
    expect(migrated.preferences.narrationLanguage).toBe('te-IN')
    expect(migrated.progress.totalXp).toBe(10)
    expect(migrated.progress.slokas['saraswati-namastubhyam'].bestStars).toBe(2)
    expect(migrated.progress.practiceHistory[0].contentType).toBe('sloka')
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull()
  })

  it('recovers safe defaults from corrupted V2 JSON without touching other data', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not valid json!!')
    window.localStorage.setItem('some-other-app', 'keep me')
    expect(loadPersistedState()).toEqual(createDefaultPersistedState())
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{not valid json!!')
    expect(window.localStorage.getItem('some-other-app')).toBe('keep me')
  })

  it('migrates a preserved valid V1 state when V2 JSON is malformed', () => {
    const legacy = {
      schemaVersion: 1,
      profile: { displayName: 'Mira', ageRange: '9-10' },
      settings: { language: 'hi', dailyGoalMinutes: 20 },
      lessons: {},
      totalXp: 35,
    }
    const corruptV2 = '{"schemaVersion":2'
    window.localStorage.setItem(STORAGE_KEY, corruptV2)
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy))

    const recovered = loadPersistedState()

    expect(recovered).toEqual(migrateV1State(legacy))
    expect(recovered.profile?.nickname).toBe('Mira')
    expect(recovered.preferences.displayLanguage).toBe('hi-IN')
    expect(recovered.progress.totalXp).toBe(35)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(corruptV2)
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(JSON.stringify(legacy))
  })

  it('does not load over or autosave across an explicitly newer valid schema', () => {
    const legacy = JSON.stringify({ schemaVersion: 1, totalXp: 35 })
    const newer = JSON.stringify({ schemaVersion: 99, progress: { totalXp: 5000 } })
    window.localStorage.setItem(LEGACY_STORAGE_KEY, legacy)
    window.localStorage.setItem(STORAGE_KEY, newer)

    expect(loadPersistedState()).toEqual(createDefaultPersistedState())
    const v2Autosave = createDefaultPersistedState()
    v2Autosave.progress.totalXp = 10
    expect(savePersistedState(v2Autosave)).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(newer)
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(legacy)
  })

  it('sanitizes partially corrupted V2 fields', () => {
    const state = sanitizePersistedState({
      schemaVersion: 2,
      profile: { nickname: 42 },
      preferences: { displayLanguage: 'xx', narrationLinked: true },
      progress: {
        slokas: { bad: null, ok: { status: 'completed', bestStars: 3 } },
        storyChapters: {},
        badges: ['a', 5, { id: 'b' }],
        totalXp: -10,
        streak: 'nope',
        practiceHistory: 'nope',
      },
    })
    expect(state.profile).toBeNull()
    expect(state.preferences.displayLanguage).toBe('en-IN')
    expect(state.progress.slokas.ok?.status).toBe('completed')
    expect(state.progress.slokas.bad).toBeUndefined()
    expect(state.progress.badges.map((badge) => badge.id)).toEqual(['a', 'b'])
    expect(state.progress.totalXp).toBe(0)
    expect(state.progress.streak).toEqual({ current: 0, lastQualifyingDate: null })
    expect(state.progress.practiceHistory).toEqual([])
  })

  it('confirmed reset removes both owned schema keys and no unrelated keys', () => {
    window.localStorage.setItem('some-other-app', 'keep me')
    window.localStorage.setItem(LEGACY_STORAGE_KEY, '{}')
    savePersistedState(createDefaultPersistedState())
    expect(clearPersistedState()).toBe(true)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem('some-other-app')).toBe('keep me')
  })
})
