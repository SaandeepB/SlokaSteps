import { useId } from 'react'
import { LANGUAGES } from '../../types'
import type { SupportedLanguage } from '../../types'
import { useAppState } from '../../hooks/useAppState'
import { useTranslation } from '../../hooks/useTranslation'

export interface LanguageSelectorProps {
  className?: string
  kind?: 'display' | 'narration'
}

/** Switches display or narration language while respecting the link preference. */
export function LanguageSelector({
  className = '',
  kind = 'display',
}: LanguageSelectorProps) {
  const { state, dispatch } = useAppState()
  const { t } = useTranslation()
  const selectId = useId()

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <label htmlFor={selectId} className="text-sm font-medium text-ink-700">
        {t('chooseLanguage')}
      </label>
      <select
        id={selectId}
        value={
          kind === 'display'
            ? state.preferences.displayLanguage
            : state.preferences.narrationLanguage
        }
        onChange={(event) => {
          const language = event.target.value as SupportedLanguage
          dispatch({
            type: 'UPDATE_PREFERENCES',
            updates:
              kind === 'display'
                ? {
                    displayLanguage: language,
                    ...(state.preferences.narrationLinked
                      ? { narrationLanguage: language }
                      : {}),
                  }
                : { narrationLanguage: language, narrationLinked: false },
          })
        }}
        className="min-h-11 rounded-xl border-2 border-cream-300 bg-white px-3 py-1 text-base text-ink-900"
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.endonym}
          </option>
        ))}
      </select>
    </span>
  )
}
