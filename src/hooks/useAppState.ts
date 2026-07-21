import { useContext } from 'react'
import { AppStateContext } from '../context/AppStateContext'
import type { AppStateContextValue } from '../context/AppStateContext'

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return context
}
