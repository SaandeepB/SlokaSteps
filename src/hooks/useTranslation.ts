import { useCallback } from 'react'
import type { SupportedLanguage } from '../types'
import { translate } from '../content/translations'
import type { TranslationKey, TranslationVars } from '../content/translations'
import { useAppState } from './useAppState'

export interface UseTranslationResult {
  t: (key: TranslationKey, vars?: TranslationVars) => string
  language: SupportedLanguage
}

export function useTranslation(): UseTranslationResult {
  const { state } = useAppState()
  const language = state.preferences.displayLanguage
  const t = useCallback(
    (key: TranslationKey, vars?: TranslationVars) =>
      translate(language, key, vars),
    [language],
  )
  return { t, language }
}
