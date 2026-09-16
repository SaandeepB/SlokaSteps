import { matchPath } from 'react-router-dom'
import { routePatterns } from './paths'

const PROTECTED_ROUTE_PATTERNS = [
  routePatterns.learn,
  routePatterns.path,
  routePatterns.lesson,
  routePatterns.activity,
  routePatterns.stories,
  routePatterns.epic,
  routePatterns.storyChapter,
  routePatterns.practice,
  routePatterns.rewards,
  routePatterns.complete,
  routePatterns.legacyPath,
  routePatterns.legacyLesson,
  routePatterns.legacyActivity,
  routePatterns.legacyComplete,
] as const

const INTERNAL_ORIGIN = 'https://sloka-steps.invalid'

export interface ProtectedReturnToState {
  returnTo: string
}

export function validateProtectedReturnTo(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return null
  }

  try {
    const url = new URL(value, INTERNAL_ORIGIN)
    if (url.origin !== INTERNAL_ORIGIN) return null
    const isProtected = PROTECTED_ROUTE_PATTERNS.some((pattern) =>
      matchPath({ path: pattern, end: true }, url.pathname),
    )
    return isProtected ? `${url.pathname}${url.search}${url.hash}` : null
  } catch {
    return null
  }
}

export function protectedReturnToFromState(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('returnTo' in state)) {
    return null
  }
  return validateProtectedReturnTo(state.returnTo)
}
