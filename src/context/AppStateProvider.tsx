import { useEffect, useMemo, useReducer, useRef } from 'react'
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
  const hasRendered = useRef(false)

  useEffect(() => {
    // Do not immediately overwrite a corrupt/future schema with defaults.
    // The first real state transition safely writes the V2 key instead.
    if (!hasRendered.current) {
      hasRendered.current = true
      return
    }
    savePersistedState(state)
  }, [state])

  useEffect(() => {
    document.documentElement.lang = state.preferences.displayLanguage
  }, [state.preferences.displayLanguage])

  const value = useMemo(() => ({ state, dispatch }), [state])

  return <AppStateContext value={value}>{children}</AppStateContext>
}
