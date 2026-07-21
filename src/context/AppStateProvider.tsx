import { useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { AppState } from '../types'
import {
  loadPersistedState,
  savePersistedState,
} from '../services/persistence'
import { AppStateContext } from './AppStateContext'
import { appReducer } from './reducer'

function initializeState(initialState?: AppState): AppState {
  if (initialState) return initialState
  return { ...loadPersistedState(), lastCompletion: null }
}

export function AppStateProvider({
  children,
  initialState,
}: {
  children: ReactNode
  /** Test seam: bypasses localStorage loading. */
  initialState?: AppState
}) {
  const [state, dispatch] = useReducer(appReducer, initialState, initializeState)

  useEffect(() => {
    savePersistedState(state)
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])

  return <AppStateContext value={value}>{children}</AppStateContext>
}
