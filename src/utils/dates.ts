/**
 * Calendar-date helpers that always use the LOCAL calendar, never UTC,
 * so streaks do not shift around midnight in the user's timezone.
 * Dates are ISO calendar strings such as "2026-07-14".
 */

export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayIsoDate(): string {
  return toIsoDate(new Date())
}

/** Adds days to a local ISO calendar date without any UTC conversion. */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, (d ?? 1) + days)
  return toIsoDate(date)
}
