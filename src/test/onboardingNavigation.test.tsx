import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppStateProvider } from '../context/AppStateProvider'
import { createDefaultAppState } from '../context/reducer'
import { useAppState } from '../hooks/useAppState'
import { SetupPage } from '../pages/SetupPage'
import { WelcomePage } from '../pages/WelcomePage'
import { RequireProfile } from '../routes/RequireProfile'
import { validateProtectedReturnTo } from '../routes/protectedReturnTo'

function DestinationProbe() {
  const location = useLocation()
  return (
    <p>
      destination:{location.pathname}
      {location.search}
      {location.hash}
    </p>
  )
}

function LanguageProbe() {
  const { state } = useAppState()
  return <output data-testid="default-language">{state.preferences.defaultLanguage}</output>
}

describe('first-run protected navigation', () => {
  it('returns to the requested learner URL after language-first setup', async () => {
    const user = userEvent.setup()
    render(
      <AppStateProvider initialState={createDefaultAppState()}>
        <MemoryRouter initialEntries={['/practice?mode=calm#saved']}>
          <Routes>
            <Route path="/setup" element={<SetupPage />} />
            <Route element={<RequireProfile />}>
              <Route path="/practice" element={<DestinationProbe />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppStateProvider>,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Which language should Sloka Steps use?',
      }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('radio', { name: '7-8' }))
    await user.click(screen.getByRole('button', { name: 'Start My Journey' }))

    expect(
      await screen.findByText('destination:/practice?mode=calm#saved'),
    ).toBeInTheDocument()
  })

  it('accepts only protected internal learner routes', () => {
    expect(
      validateProtectedReturnTo(
        '/slokas/saraswati-namastubhyam?from=home#listen',
      ),
    ).toBe('/slokas/saraswati-namastubhyam?from=home#listen')
    expect(validateProtectedReturnTo('/settings')).toBeNull()
    expect(validateProtectedReturnTo('/setup')).toBeNull()
    expect(validateProtectedReturnTo('//example.com/practice')).toBeNull()
    expect(validateProtectedReturnTo('https://example.com/practice')).toBeNull()
    expect(validateProtectedReturnTo('/\\example.com/practice')).toBeNull()
  })
})

describe('welcome language handoff', () => {
  it('carries the first welcome choice into setup and default language', async () => {
    const user = userEvent.setup()
    render(
      <AppStateProvider initialState={createDefaultAppState()}>
        <MemoryRouter initialEntries={['/']}>
          <LanguageProbe />
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/setup" element={<SetupPage />} />
          </Routes>
        </MemoryRouter>
      </AppStateProvider>,
    )

    const startLink = screen.getByRole('link', { name: 'Start Learning' })
    await user.selectOptions(screen.getByLabelText('Choose language'), 'te-IN')
    expect(screen.getByTestId('default-language')).toHaveTextContent('te-IN')
    await user.click(startLink)

    expect(
      await screen.findByRole('radio', { name: 'తెలుగు' }),
    ).toBeChecked()
  })
})
