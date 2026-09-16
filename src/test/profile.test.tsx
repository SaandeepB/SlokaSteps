import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { appReducer, createDefaultAppState } from '../context/reducer'
import { loadPersistedState } from '../services/persistence'
import {
  DEFAULT_DISPLAY_NAME,
  MAX_DISPLAY_NAME_LENGTH,
  sanitizeDisplayName,
} from '../utils/profile'
import { SetupPage } from '../pages/SetupPage'
import { renderWithProviders } from './testUtils'

describe('nickname sanitization', () => {
  it('trims whitespace and applies the maximum length', () => {
    expect(sanitizeDisplayName('  Anu  ')).toBe('Anu')
    expect(sanitizeDisplayName('a'.repeat(MAX_DISPLAY_NAME_LENGTH + 20))).toHaveLength(
      MAX_DISPLAY_NAME_LENGTH,
    )
  })

  it('falls back to a friendly default when empty', () => {
    expect(sanitizeDisplayName('   ')).toBe(DEFAULT_DISPLAY_NAME)
  })
})

describe('V2 profile and language reducer', () => {
  it('saves the privacy-minimal child profile', () => {
    const state = appReducer(createDefaultAppState(), {
      type: 'CREATE_PROFILE',
      profile: { nickname: 'Anu', ageBand: '4-6', dailyGoalMinutes: 5 },
    })
    expect(state.profile).toEqual({
      nickname: 'Anu',
      ageBand: '4-6',
      dailyGoalMinutes: 5,
    })
  })

  it('keeps narration linked by default and allows it to be unlinked', () => {
    let state = appReducer(createDefaultAppState(), {
      type: 'UPDATE_PREFERENCES',
      updates: { displayLanguage: 'kn-IN' },
    })
    expect(state.preferences.narrationLanguage).toBe('kn-IN')

    state = appReducer(state, {
      type: 'UPDATE_PREFERENCES',
      updates: { narrationLinked: false, narrationLanguage: 'te-IN' },
    })
    state = appReducer(state, {
      type: 'UPDATE_PREFERENCES',
      updates: { displayLanguage: 'en-IN' },
    })
    expect(state.preferences.displayLanguage).toBe('en-IN')
    expect(state.preferences.narrationLanguage).toBe('te-IN')
  })
})

describe('language-first setup page', () => {
  it('asks only for the app language on the first step', () => {
    renderWithProviders(<SetupPage />)
    expect(
      screen.getByRole('heading', {
        name: 'Which language should Sloka Steps use?',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('What should we call you?')).not.toBeInTheDocument()
  })

  it('requires an age band before saving the profile', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/learn" element={<p>learn page</p>} />
      </Routes>,
      { route: '/setup' },
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Start My Journey' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please choose an age range.')
    expect(screen.queryByText('learn page')).not.toBeInTheDocument()
  })

  it('persists the first language as linked display and narration language', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/learn" element={<p>learn page</p>} />
      </Routes>,
      { route: '/setup' },
    )

    await user.click(screen.getByRole('radio', { name: 'తెలుగు' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.type(screen.getByLabelText('మిమ్మల్ని ఏమని పిలవాలి?'), 'Anu')
    await user.click(screen.getByRole('radio', { name: '7-8' }))
    await user.click(screen.getByRole('radio', { name: /15/ }))
    await user.click(
      screen.getByRole('button', { name: 'నా ప్రయాణం ప్రారంభించండి' }),
    )

    expect(await screen.findByText('learn page')).toBeInTheDocument()
    const persisted = loadPersistedState()
    expect(persisted.profile).toEqual({
      nickname: 'Anu',
      ageBand: '7-8',
      dailyGoalMinutes: 15,
    })
    expect(persisted.preferences.defaultLanguage).toBe('te-IN')
    expect(persisted.preferences.displayLanguage).toBe('te-IN')
    expect(persisted.preferences.narrationLanguage).toBe('te-IN')
    expect(persisted.preferences.narrationLinked).toBe(true)
  })
})
