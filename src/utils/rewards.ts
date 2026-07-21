import type { StarCount } from '../types'

/** XP granted the first time a fully implemented lesson is completed. */
export const XP_PER_LESSON = 10

/** Estimated learning minutes credited per finished activity. */
export const ESTIMATED_MINUTES_PER_ACTIVITY = 1

/**
 * Star rules: 3 stars for zero incorrect scored attempts, 2 for one or two,
 * 1 for more. A completed lesson never earns zero stars.
 */
export function starsForIncorrectAttempts(incorrectAttempts: number): StarCount {
  if (incorrectAttempts <= 0) return 3
  if (incorrectAttempts <= 2) return 2
  return 1
}

/** Best stars may improve but never decrease. */
export function improveBestStars(previous: StarCount, next: StarCount): StarCount {
  return previous >= next ? previous : next
}
