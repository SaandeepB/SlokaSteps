export const MAX_DISPLAY_NAME_LENGTH = 24

/** Friendly default when no name is entered — a real legal name is never required. */
export const DEFAULT_DISPLAY_NAME = 'Learner'

export function sanitizeDisplayName(raw: string): string {
  const trimmed = raw.trim().slice(0, MAX_DISPLAY_NAME_LENGTH).trim()
  return trimmed.length > 0 ? trimmed : DEFAULT_DISPLAY_NAME
}
