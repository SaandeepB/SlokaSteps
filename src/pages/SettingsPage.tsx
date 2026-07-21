import { useId, useState } from 'react'
import { Card } from '../components/common/Card'
import { LanguageSelector } from '../components/common/LanguageSelector'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { DAILY_GOAL_OPTIONS } from '../types'
import type { DailyGoalMinutes } from '../types'

/** Language, daily goal, and accessibility preferences. Saves instantly. */
export function SettingsPage() {
  const { state, dispatch } = useAppState()
  const { t } = useTranslation()
  useDocumentTitle(t('settingsTitle'))

  const motionId = useId()
  const [savedFlash, setSavedFlash] = useState(false)

  const flashSaved = () => {
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1500)
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 py-4">
      <h1 className="text-3xl font-extrabold text-teal-700">{t('settingsTitle')}</h1>

      <Card className="flex flex-col gap-6">
        <LanguageSelector />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold text-ink-900">
            {t('dailyGoalLabel')}
          </legend>
          <div className="flex flex-wrap gap-3">
            {DAILY_GOAL_OPTIONS.map((minutes) => (
              <label
                key={minutes}
                className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border-2 px-5 py-2 font-semibold transition-colors ${
                  state.settings.dailyGoalMinutes === minutes
                    ? 'border-teal-600 bg-teal-100 text-teal-800'
                    : 'border-cream-300 bg-white text-ink-700'
                }`}
              >
                <input
                  type="radio"
                  name="dailyGoal"
                  value={minutes}
                  checked={state.settings.dailyGoalMinutes === minutes}
                  onChange={() => {
                    dispatch({
                      type: 'UPDATE_SETTINGS',
                      updates: { dailyGoalMinutes: minutes as DailyGoalMinutes },
                    })
                    flashSaved()
                  }}
                  className="h-4 w-4"
                />
                {t('minutesOption', { n: minutes })}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-start gap-3">
          <input
            id={motionId}
            type="checkbox"
            checked={state.settings.reducedMotion}
            onChange={(event) => {
              dispatch({
                type: 'UPDATE_SETTINGS',
                updates: { reducedMotion: event.target.checked },
              })
              flashSaved()
            }}
            className="mt-1 h-5 w-5"
          />
          <label htmlFor={motionId} className="flex flex-col">
            <span className="font-semibold text-ink-900">
              {t('reducedMotionLabel')}
            </span>
            <span className="text-sm text-ink-500">{t('reducedMotionHelp')}</span>
          </label>
        </div>

        <p
          role="status"
          className={`text-sm font-semibold text-leaf-700 ${savedFlash ? '' : 'invisible'}`}
        >
          {t('settingsSaved')}
        </p>
      </Card>
    </div>
  )
}
