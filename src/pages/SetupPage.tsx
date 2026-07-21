import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Mitra } from '../components/common/Mitra'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AGE_RANGES, DAILY_GOAL_OPTIONS, LANGUAGES } from '../types'
import type { AgeRange, DailyGoalMinutes, SupportedLanguage } from '../types'
import { MAX_DISPLAY_NAME_LENGTH, sanitizeDisplayName } from '../utils/profile'
import { routes } from '../routes/paths'

/** Creates or updates the local child profile. No account, no real name. */
export function SetupPage() {
  const { state, dispatch } = useAppState()
  const { t } = useTranslation()
  const navigate = useNavigate()
  useDocumentTitle(t('setupTitle'))

  const nameId = useId()
  const ageErrorId = useId()

  const [name, setName] = useState(state.profile?.displayName ?? '')
  const [ageRange, setAgeRange] = useState<AgeRange | null>(
    state.profile?.ageRange ?? null,
  )
  const [language, setLanguage] = useState<SupportedLanguage>(
    state.settings.language,
  )
  const [dailyGoal, setDailyGoal] = useState<DailyGoalMinutes>(
    state.settings.dailyGoalMinutes,
  )
  const [ageError, setAgeError] = useState(false)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!ageRange) {
      setAgeError(true)
      return
    }
    dispatch({
      type: 'CREATE_PROFILE',
      profile: { displayName: sanitizeDisplayName(name), ageRange },
    })
    dispatch({
      type: 'UPDATE_SETTINGS',
      updates: { language, dailyGoalMinutes: dailyGoal },
    })
    navigate(routes.path)
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 py-4">
      <div className="flex items-center gap-4">
        <Mitra size={80} decorative />
        <div>
          <h1 className="text-3xl font-extrabold text-teal-700">
            {t('setupTitle')}
          </h1>
          <p className="text-ink-700">{t('setupIntro')}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <Card className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <label htmlFor={nameId} className="font-semibold text-ink-900">
              {t('nameLabel')}
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              className="min-h-12 rounded-xl border-2 border-cream-300 bg-white px-4 text-lg"
              autoComplete="off"
            />
            <p className="text-sm text-ink-500">{t('nameHelp')}</p>
          </div>

          <fieldset
            className="flex flex-col gap-2"
            aria-describedby={ageError ? ageErrorId : undefined}
          >
            <legend className="mb-1 font-semibold text-ink-900">
              {t('ageLabel')}
            </legend>
            <div className="flex flex-wrap gap-3">
              {AGE_RANGES.map((range) => (
                <label
                  key={range}
                  className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border-2 px-5 py-2 text-lg font-semibold transition-colors ${
                    ageRange === range
                      ? 'border-teal-600 bg-teal-100 text-teal-800'
                      : 'border-cream-300 bg-white text-ink-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="ageRange"
                    value={range}
                    checked={ageRange === range}
                    onChange={() => {
                      setAgeRange(range)
                      setAgeError(false)
                    }}
                    className="h-4 w-4"
                  />
                  {range}
                </label>
              ))}
            </div>
            {ageError && (
              <p id={ageErrorId} role="alert" className="text-sm font-semibold text-lotus-700">
                {t('ageRequired')}
              </p>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold text-ink-900">
              {t('languageLabel')}
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {LANGUAGES.map((lang) => (
                <label
                  key={lang.code}
                  className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2 font-semibold transition-colors ${
                    language === lang.code
                      ? 'border-teal-600 bg-teal-100 text-teal-800'
                      : 'border-cream-300 bg-white text-ink-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value={lang.code}
                    checked={language === lang.code}
                    onChange={() => setLanguage(lang.code)}
                    className="h-4 w-4"
                  />
                  <span lang={lang.code}>{lang.endonym}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold text-ink-900">
              {t('dailyGoalLabel')}
            </legend>
            <div className="flex flex-wrap gap-3">
              {DAILY_GOAL_OPTIONS.map((minutes) => (
                <label
                  key={minutes}
                  className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border-2 px-5 py-2 text-lg font-semibold transition-colors ${
                    dailyGoal === minutes
                      ? 'border-teal-600 bg-teal-100 text-teal-800'
                      : 'border-cream-300 bg-white text-ink-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="dailyGoal"
                    value={minutes}
                    checked={dailyGoal === minutes}
                    onChange={() => setDailyGoal(minutes)}
                    className="h-4 w-4"
                  />
                  {t('minutesOption', { n: minutes })}
                </label>
              ))}
            </div>
          </fieldset>

          <Button type="submit" size="lg" className="self-start">
            {t('saveProfile')}
          </Button>
        </Card>
      </form>
    </div>
  )
}
