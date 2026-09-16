import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParentPage } from '../pages/ParentPage'
import { SettingsPage } from '../pages/SettingsPage'
import { savePersistedState, STORAGE_KEY } from '../services/persistence'
import { createDefaultPersistedState } from '../services/persistence'
import { renderWithProviders, makeStateWithProfile } from './testUtils'

const GATE = { a: 4, b: 3 }

function renderParent() {
  return renderWithProviders(
    <Routes>
      <Route path="/parent" element={<ParentPage fixedGateQuestion={GATE} />} />
      <Route path="/setup" element={<p>setup page</p>} />
      <Route path="/settings" element={<p>settings page</p>} />
    </Routes>,
    { route: '/parent', state: makeStateWithProfile() },
  )
}

function renderSettings() {
  return renderWithProviders(
    <Routes>
      <Route
        path="/settings"
        element={<SettingsPage fixedGateQuestion={GATE} />}
      />
    </Routes>,
    { route: '/settings', state: makeStateWithProfile() },
  )
}

describe('parent gate', () => {
  it('an incorrect answer does not open the dashboard', async () => {
    const user = userEvent.setup()
    renderParent()

    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), '6')
    await user.click(screen.getByRole('button', { name: 'Enter' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      "That's not right. Please try again.",
    )
    expect(screen.queryByText('Parent Dashboard')).not.toBeInTheDocument()
  })

  it('the correct answer opens the dashboard', async () => {
    const user = userEvent.setup()
    renderParent()

    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), '7')
    await user.click(screen.getByRole('button', { name: 'Enter' }))

    expect(
      await screen.findByRole('heading', { name: 'Parent Dashboard' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Anu')).toBeInTheDocument()
  })

  it('keeps privacy and community controls behind a fresh parent check', async () => {
    const user = userEvent.setup()
    renderSettings()

    expect(
      screen.queryByRole('checkbox', { name: /Allow future cloud chant evaluation/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Parent-only privacy settings')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), '7')
    await user.click(screen.getByRole('button', { name: 'Enter' }))

    expect(
      screen.getByRole('checkbox', { name: /Allow future cloud chant evaluation/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: /Allow future community features/ }),
    ).toBeInTheDocument()
  })

  it('does not claim settings were saved when browser storage rejects a write', async () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Storage is blocked', 'SecurityError')
      })
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const user = userEvent.setup()
      renderSettings()
      await user.click(
        screen.getByRole('checkbox', { name: /Calm mode/ }),
      )

      expect(
        await screen.findByRole('alert'),
      ).toHaveTextContent(
        'Changes work for this session, but this browser could not save them.',
      )
      expect(screen.queryByText('Saved!')).not.toBeInTheDocument()
    } finally {
      setItem.mockRestore()
      warning.mockRestore()
    }
  })
})

describe('reset progress', () => {
  it('requires confirmation and can be cancelled', async () => {
    const user = userEvent.setup()
    renderParent()
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), '7')
    await user.click(screen.getByRole('button', { name: 'Enter' }))

    await user.click(screen.getByRole('button', { name: 'Reset Progress' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Parent Dashboard')).toBeInTheDocument()
  })

  it('confirming reset clears only the app key and returns to setup', async () => {
    window.localStorage.setItem('unrelated-key', 'keep')
    savePersistedState(createDefaultPersistedState())

    const user = userEvent.setup()
    renderParent()
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), '7')
    await user.click(screen.getByRole('button', { name: 'Enter' }))

    await user.click(screen.getByRole('button', { name: 'Reset Progress' }))
    await user.click(screen.getByRole('button', { name: 'Yes, Reset Everything' }))

    expect(await screen.findByText('setup page')).toBeInTheDocument()
    expect(window.localStorage.getItem('unrelated-key')).toBe('keep')
    // The provider re-saves default state after the reset dispatch; the
    // stored profile must be gone either way.
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      expect(JSON.parse(stored).profile).toBeNull()
    }
  })

  it('keeps durable and in-memory progress when browser deletion fails', async () => {
    const persisted = createDefaultPersistedState()
    persisted.profile = {
      nickname: 'Anu',
      ageBand: '7-8',
      dailyGoalMinutes: 10,
    }
    savePersistedState(persisted)
    const removeItem = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new DOMException('Storage is blocked', 'SecurityError')
      })

    try {
      const user = userEvent.setup()
      renderParent()
      await user.type(screen.getByRole('textbox', { name: 'Your answer' }), '7')
      await user.click(screen.getByRole('button', { name: 'Enter' }))
      await user.click(screen.getByRole('button', { name: 'Reset Progress' }))
      await user.click(screen.getByRole('button', { name: 'Yes, Reset Everything' }))

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Sloka Steps could not remove the saved data from this browser.',
      )
      expect(screen.getByText('Parent Dashboard')).toBeInTheDocument()
      expect(screen.queryByText('setup page')).not.toBeInTheDocument()
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').profile).toEqual(
        persisted.profile,
      )
    } finally {
      removeItem.mockRestore()
    }
  })
})
