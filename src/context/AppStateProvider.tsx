import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
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
  const [persistence, setPersistence] = useState<{
    status: 'idle' | 'saved' | 'failed'
    attempt: number
  }>({ status: 'idle', attempt: 0 })
  const hasRendered = useRef(false)

  useEffect(() => {
    // Do not immediately overwrite a corrupt/future schema with defaults.
    // The first real state transition safely writes the V2 key instead.
    if (!hasRendered.current) {
      hasRendered.current = true
      return
    }
    const saved = savePersistedState(state)
    setPersistence((current) => ({
      status: saved ? 'saved' : 'failed',
      attempt: current.attempt + 1,
    }))
  }, [state])

  useEffect(() => {
    document.documentElement.lang = state.preferences.displayLanguage
  }, [state.preferences.displayLanguage])

  const value = useMemo(
    () => ({ state, dispatch, persistence }),
    [persistence, state],
  )

  return <AppStateContext value={value}>{children}</AppStateContext>
}
