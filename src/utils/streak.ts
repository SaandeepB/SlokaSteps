import type { StreakState } from '../types'
import { addDaysToIsoDate } from './dates'

/**
 * Applies a qualifying lesson completion on `today` (local ISO date).
 * - first ever completion → streak of 1
 * - already qualified today → unchanged
 * - qualified yesterday → +1
 * - one or more full days missed → reset to 1
 */
export function updateStreak(streak: StreakState, today: string): StreakState {
  if (streak.lastQualifyingDate === today) {
    return streak
  }
  const yesterday = addDaysToIsoDate(today, -1)
  if (streak.lastQualifyingDate === yesterday) {
    return { current: streak.current + 1, lastQualifyingDate: today }
  }
  return { current: 1, lastQualifyingDate: today }
}
