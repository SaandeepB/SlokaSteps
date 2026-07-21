import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParentPage } from '../pages/ParentPage'
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
})
