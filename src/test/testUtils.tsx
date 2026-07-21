import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppStateProvider } from '../context/AppStateProvider'
import { createDefaultAppState } from '../context/reducer'
import type { AppState } from '../types'

export function makeState(overrides: Partial<AppState> = {}): AppState {
  return { ...createDefaultAppState(), ...overrides }
}

export function makeStateWithProfile(overrides: Partial<AppState> = {}): AppState {
  return makeState({
    profile: { displayName: 'Anu', ageRange: '7-8' },
    ...overrides,
  })
}

export interface RenderOptions {
  state?: AppState
  route?: string
  /** Extra <Route> elements rendered alongside the UI when needed. */
  wrapper?: (children: ReactNode) => ReactNode
}

export function renderWithProviders(
  ui: ReactElement,
  { state, route = '/' }: RenderOptions = {},
) {
  return render(
    <AppStateProvider initialState={state ?? makeState()}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AppStateProvider>,
  )
}
