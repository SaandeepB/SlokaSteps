import { Navigate, Outlet } from 'react-router-dom'
import { useAppState } from '../hooks/useAppState'
import { routes } from './paths'

/** Profile-dependent routes redirect safely to setup when none exists. */
export function RequireProfile() {
  const { state } = useAppState()
  if (!state.profile) {
    return <Navigate to={routes.setup} replace />
  }
  return <Outlet />
}
