import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Mitra } from '../components/common/Mitra'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AGE_BANDS, DAILY_GOAL_OPTIONS, LANGUAGES } from '../types'
import type { AgeBand, DailyGoalMinutes, SupportedLanguage } from '../types'
import { MAX_DISPLAY_NAME_LENGTH, sanitizeDisplayName } from '../utils/profile'
import { routes } from '../routes/paths'

/** Language-first local setup. No account or identifying profile data. */
export function SetupPage() {
  const { state, dispatch } = useAppState()
  const { t } = useTranslation()
  const navigate = useNavigate()
  useDocumentTitle(t('setupTitle'))

  const nameId = useId()
  const ageErrorId = useId()
  const [step, setStep] = useState<'language' | 'profile'>(
    state.profile ? 'profile' : 'language',
  )
  const [nickname, setNickname] = useState(state.profile?.nickname ?? '')
  const [ageBand, setAgeBand] = useState<AgeBand | null>(
    state.profile?.ageBand ?? null,
  )
  const [language, setLanguage] = useState<SupportedLanguage>(
    state.preferences.defaultLanguage,
  )
  const [dailyGoal, setDailyGoal] = useState<DailyGoalMinutes>(
    state.profile?.dailyGoalMinutes ?? 10,
  )
  const [ageError, setAgeError] = useState(false)

  const saveLanguage = () => {
    dispatch({
      type: 'UPDATE_PREFERENCES',
      updates: {
        defaultLanguage: language,
        displayLanguage: language,
        narrationLanguage: language,
        narrationLinked: true,
      },
    })
    setStep('profile')
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!ageBand) {
      setAgeError(true)
      return
    }
    dispatch({
      type: 'CREATE_PROFILE',
      profile: {
        nickname: sanitizeDisplayName(nickname),
        ageBand,
        dailyGoalMinutes: dailyGoal,
      },
    })
    navigate(routes.learn)
  }

  if (step === 'language') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6 py-6">
        <div className="flex items-center gap-4">
          <Mitra size={88} decorative />
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-saffron-600">
              {t('firstStep')}
            </p>
            <h1 className="text-3xl font-extrabold text-teal-700">
              {t('chooseAppLanguage')}
            </h1>
          </div>
        </div>
        <Card className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">{t('chooseAppLanguage')}</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {LANGUAGES.map((item) => (
                <label
                  key={item.code}
                  className={`inline-flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 px-3 py-3 text-lg font-semibold transition-colors ${
                    language === item.code
                      ? 'border-teal-600 bg-teal-100 text-teal-800'
                      : 'border-cream-300 bg-white text-ink-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value={item.code}
                    checked={language === item.code}
                    onChange={() => setLanguage(item.code)}
                    className="mr-2 h-4 w-4"
                  />
                  <span lang={item.code}>{item.endonym}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-sm text-ink-500">{t('languageSetupHelp')}</p>
          <Button type="button" size="lg" onClick={saveLanguage} className="self-start">
            {t('continueAction')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 py-4">
      <div className="flex items-center gap-4">
        <Mitra size={80} decorative />
        <div>
          <h1 className="text-3xl font-extrabold text-teal-700">{t('setupTitle')}</h1>
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
              value={nickname}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              onChange={(event) => setNickname(event.target.value)}
              className="min-h-12 rounded-xl border-2 border-cream-300 bg-white px-4 text-lg"
              autoComplete="off"
            />
            <p className="text-sm text-ink-500">{t('nameHelp')}</p>
          </div>

          <fieldset className="flex flex-col gap-2" aria-describedby={ageError ? ageErrorId : undefined}>
            <legend className="mb-1 font-semibold text-ink-900">{t('ageLabel')}</legend>
            <div className="flex flex-wrap gap-3">
              {AGE_BANDS.map((band) => (
                <label
                  key={band}
                  className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border-2 px-5 py-2 text-lg font-semibold transition-colors ${
                    ageBand === band
                      ? 'border-teal-600 bg-teal-100 text-teal-800'
                      : 'border-cream-300 bg-white text-ink-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="ageBand"
                    value={band}
                    checked={ageBand === band}
                    onChange={() => {
                      setAgeBand(band)
                      setAgeError(false)
                    }}
                    className="h-4 w-4"
                  />
                  {band}
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
            <legend className="mb-1 font-semibold text-ink-900">{t('dailyGoalLabel')}</legend>
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
