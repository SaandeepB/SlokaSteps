import { createContext } from 'react'
import type { Dispatch } from 'react'
import type { AppState } from '../types'
import type { AppAction } from './reducer'

export interface AppStateContextValue {
  state: AppState
  dispatch: Dispatch<AppAction>
  persistence: {
    status: 'idle' | 'saved' | 'failed'
    attempt: number
  }
}

export const AppStateContext = createContext<AppStateContextValue | null>(null)
