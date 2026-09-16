import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppState } from '../hooks/useAppState'
import { routes } from './paths'
import {
  validateProtectedReturnTo,
  type ProtectedReturnToState,
} from './protectedReturnTo'

/** Profile-dependent routes redirect safely to setup when none exists. */
export function RequireProfile() {
  const { state } = useAppState()
  const location = useLocation()
  if (!state.profile) {
    const requestedUrl = `${location.pathname}${location.search}${location.hash}`
    const returnTo = validateProtectedReturnTo(requestedUrl)
    const navigationState: ProtectedReturnToState | undefined = returnTo
      ? { returnTo }
      : undefined
    return <Navigate to={routes.setup} replace state={navigationState} />
  }
  return <Outlet />
}
