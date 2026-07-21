import { useId } from 'react'
import { LANGUAGES } from '../../types'
import type { SupportedLanguage } from '../../types'
import { useAppState } from '../../hooks/useAppState'
import { useTranslation } from '../../hooks/useTranslation'

export interface LanguageSelectorProps {
  className?: string
}

/** Switches the learning/meaning language; persists via app settings. */
export function LanguageSelector({ className = '' }: LanguageSelectorProps) {
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
        value={state.settings.language}
        onChange={(event) =>
          dispatch({
            type: 'UPDATE_SETTINGS',
            updates: { language: event.target.value as SupportedLanguage },
          })
        }
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
