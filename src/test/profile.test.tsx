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

describe('display-name sanitization', () => {
  it('trims whitespace and applies the maximum length', () => {
    expect(sanitizeDisplayName('  Anu  ')).toBe('Anu')
    const long = 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 20)
    expect(sanitizeDisplayName(long)).toHaveLength(MAX_DISPLAY_NAME_LENGTH)
  })

  it('falls back to a friendly default when empty', () => {
    expect(sanitizeDisplayName('   ')).toBe(DEFAULT_DISPLAY_NAME)
  })
})

describe('profile reducer', () => {
  it('saves the profile', () => {
    const state = appReducer(createDefaultAppState(), {
      type: 'CREATE_PROFILE',
      profile: { displayName: 'Anu', ageRange: '4-6' },
    })
    expect(state.profile).toEqual({ displayName: 'Anu', ageRange: '4-6' })
  })

  it('persists language and daily goal through settings updates', () => {
    const state = appReducer(createDefaultAppState(), {
      type: 'UPDATE_SETTINGS',
      updates: { language: 'kn', dailyGoalMinutes: 15 },
    })
    expect(state.settings.language).toBe('kn')
    expect(state.settings.dailyGoalMinutes).toBe(15)
  })
})

describe('setup page', () => {
  it('requires an age range before saving', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/path" element={<p>path page</p>} />
      </Routes>,
      { route: '/setup' },
    )

    await user.click(screen.getByRole('button', { name: 'Start My Journey' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please choose an age range.',
    )
    expect(screen.queryByText('path page')).not.toBeInTheDocument()
  })

  it('saves profile, language, and daily goal to localStorage', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/path" element={<p>path page</p>} />
      </Routes>,
      { route: '/setup' },
    )

    await user.type(screen.getByLabelText('What should we call you?'), 'Anu')
    await user.click(screen.getByRole('radio', { name: '7-8' }))
    await user.click(screen.getByRole('radio', { name: 'తెలుగు' }))
    await user.click(screen.getByRole('radio', { name: /15/ }))
    await user.click(screen.getByRole('button', { name: 'Start My Journey' }))

    expect(await screen.findByText('path page')).toBeInTheDocument()

    const persisted = loadPersistedState()
    expect(persisted.profile).toEqual({ displayName: 'Anu', ageRange: '7-8' })
    expect(persisted.settings.language).toBe('te')
    expect(persisted.settings.dailyGoalMinutes).toBe(15)
  })
})
