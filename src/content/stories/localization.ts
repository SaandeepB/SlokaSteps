import type { SupportedLanguage } from '../../types/content'
import type { LocalizedText } from '../../types/story'

export const STORY_LOCALES = [
  'en-IN',
  'hi-IN',
  'te-IN',
  'kn-IN',
  'ta-IN',
  'mr-IN',
] as const satisfies ReadonlyArray<keyof LocalizedText>

/**
 * V2 sample stories are awaiting human translation. Every locale is present,
 * but non-English values identify themselves as editorial fallbacks rather
 * than pretending to be reviewed translations.
 */
export function draftLocalizedText(english: string): LocalizedText {
  return {
    'en-IN': english,
    'hi-IN': `[हिन्दी मसौदा — English fallback] ${english}`,
    'te-IN': `[తెలుగు ముసాయిదా — English fallback] ${english}`,
    'kn-IN': `[ಕನ್ನಡ ಕರಡು — English fallback] ${english}`,
    'ta-IN': `[தமிழ் வரைவு — English fallback] ${english}`,
    'mr-IN': `[मराठी मसुदा — English fallback] ${english}`,
  }
}

export function resolveLocalizedText(
  text: LocalizedText,
  language: SupportedLanguage,
): string {
  return text[language as keyof LocalizedText] ?? text['en-IN']
}
