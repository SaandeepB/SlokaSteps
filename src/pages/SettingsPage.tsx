import { useEffect, useId, useRef, useState } from 'react'
import { Card } from '../components/common/Card'
import { LanguageSelector } from '../components/common/LanguageSelector'
import { ParentGate } from '../components/parent/ParentGate'
import type { GateQuestion } from '../components/parent/ParentGate'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { DAILY_GOAL_OPTIONS } from '../types'
import type { DailyGoalMinutes, SlokaScriptPreference } from '../types'
import { FEATURE_FLAGS } from '../config/featureFlags'

const SCRIPT_OPTIONS: Array<{
  value: SlokaScriptPreference
  key: 'scriptRegional' | 'scriptDevanagari' | 'scriptRoman' | 'scriptRegionalAndRoman'
}> = [
  { value: 'regional', key: 'scriptRegional' },
  { value: 'devanagari', key: 'scriptDevanagari' },
  { value: 'roman-transliteration', key: 'scriptRoman' },
  { value: 'regional-and-transliteration', key: 'scriptRegionalAndRoman' },
]

export interface SettingsPageProps {
  /** Test seam: fixes the parent-gate question instead of choosing randomly. */
  fixedGateQuestion?: GateQuestion
}

/** Language/accessibility settings plus parent-gated privacy preferences. */
export function SettingsPage({ fixedGateQuestion }: SettingsPageProps = {}) {
  const { state, dispatch, persistence } = useAppState()
  const { t } = useTranslation()
  useDocumentTitle(t('settingsTitle'))
  const motionId = useId()
  const calmId = useId()
  const linkId = useId()
  const microphoneId = useId()
  const cloudId = useId()
  const retainId = useId()
  const communityId = useId()
  const [saveNotice, setSaveNotice] = useState<
    'saving' | 'saved' | 'failed' | null
  >(null)
  const [expectedSaveAttempt, setExpectedSaveAttempt] = useState<number | null>(
    null,
  )
  const saveNoticeTimer = useRef<number | null>(null)
  const [parentControlsUnlocked, setParentControlsUnlocked] = useState(false)

  const flashSaved = () => {
    setExpectedSaveAttempt(persistence.attempt + 1)
    setSaveNotice('saving')
  }

  useEffect(() => {
    if (
      expectedSaveAttempt === null ||
      persistence.attempt < expectedSaveAttempt
    ) {
      return
    }
    setExpectedSaveAttempt(null)
    setSaveNotice(persistence.status === 'saved' ? 'saved' : 'failed')
    if (saveNoticeTimer.current !== null) {
      window.clearTimeout(saveNoticeTimer.current)
    }
    saveNoticeTimer.current = window.setTimeout(() => {
      setSaveNotice(null)
      saveNoticeTimer.current = null
    }, 3000)
  }, [expectedSaveAttempt, persistence])

  useEffect(
    () => () => {
      if (saveNoticeTimer.current !== null) {
        window.clearTimeout(saveNoticeTimer.current)
      }
    },
    [],
  )

  const updateVoicePrivacy = (
    updates: Partial<typeof state.preferences.voicePrivacy>,
  ) => {
    dispatch({
      type: 'UPDATE_PREFERENCES',
      updates: {
        voicePrivacy: { ...state.preferences.voicePrivacy, ...updates },
      },
    })
    flashSaved()
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 py-4">
      <h1 className="text-3xl font-extrabold text-teal-700">{t('settingsTitle')}</h1>

      <Card className="flex flex-col gap-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h2 className="font-bold text-ink-900">{t('displayLanguageLabel')}</h2>
            <LanguageSelector kind="display" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-bold text-ink-900">{t('narrationLanguageLabel')}</h2>
            <LanguageSelector kind="narration" />
          </div>
        </div>

        <ToggleRow
          id={linkId}
          checked={state.preferences.narrationLinked}
          label={t('linkNarrationLabel')}
          onChange={(checked) => {
            dispatch({ type: 'UPDATE_PREFERENCES', updates: { narrationLinked: checked } })
            flashSaved()
          }}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold text-ink-900">
            {t('scriptPreferenceLabel')}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SCRIPT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border-2 px-4 py-2 font-semibold ${
                  state.preferences.scriptPreference === option.value
                    ? 'border-teal-600 bg-teal-100 text-teal-800'
                    : 'border-cream-300 bg-white text-ink-700'
                }`}
              >
                <input
                  type="radio"
                  name="scriptPreference"
                  value={option.value}
                  checked={state.preferences.scriptPreference === option.value}
                  onChange={() => {
                    dispatch({
                      type: 'UPDATE_PREFERENCES',
                      updates: { scriptPreference: option.value },
                    })
                    flashSaved()
                  }}
                />
                {t(option.key)}
              </label>
            ))}
          </div>
        </fieldset>

        {state.profile && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold text-ink-900">
              {t('dailyGoalLabel')}
            </legend>
            <div className="flex flex-wrap gap-3">
              {DAILY_GOAL_OPTIONS.map((minutes) => (
                <label
                  key={minutes}
                  className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border-2 px-5 py-2 font-semibold ${
                    state.profile?.dailyGoalMinutes === minutes
                      ? 'border-teal-600 bg-teal-100 text-teal-800'
                      : 'border-cream-300 bg-white text-ink-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="dailyGoal"
                    value={minutes}
                    checked={state.profile?.dailyGoalMinutes === minutes}
                    onChange={() => {
                      dispatch({
                        type: 'UPDATE_PROFILE',
                        updates: { dailyGoalMinutes: minutes as DailyGoalMinutes },
                      })
                      flashSaved()
                    }}
                  />
                  {t('minutesOption', { n: minutes })}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </Card>

      <Card className="flex flex-col gap-5">
        <h2 className="text-xl font-bold text-ink-900">Accessibility and calm</h2>
        <ToggleRow
          id={calmId}
          checked={state.preferences.calmMode}
          label={t('calmModeLabel')}
          help={t('calmModeHelp')}
          onChange={(checked) => {
            dispatch({ type: 'UPDATE_PREFERENCES', updates: { calmMode: checked } })
            flashSaved()
          }}
        />
        <ToggleRow
          id={motionId}
          checked={state.preferences.reducedMotion}
          label={t('reducedMotionLabel')}
          help={t('reducedMotionHelp')}
          onChange={(checked) => {
            dispatch({ type: 'UPDATE_PREFERENCES', updates: { reducedMotion: checked } })
            flashSaved()
          }}
        />
      </Card>

      {!parentControlsUnlocked ? (
        <section aria-label="Parent-only privacy settings">
          <ParentGate
            onPassed={() => setParentControlsUnlocked(true)}
            fixedQuestion={fixedGateQuestion}
          />
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-ink-500">
            Voice privacy and future community choices are available after the
            grown-up check.
          </p>
        </section>
      ) : (
        <>
          <Card className="flex flex-col gap-5">
            <h2 className="text-xl font-bold text-ink-900">Voice privacy</h2>
            <ToggleRow
              id={microphoneId}
              checked={state.preferences.voicePrivacy.allowMicrophone}
              label={t('microphoneLabel')}
              onChange={(checked) => updateVoicePrivacy({ allowMicrophone: checked })}
            />
            <ToggleRow
              id={cloudId}
              checked={state.preferences.voicePrivacy.allowCloudEvaluation}
              label={t('cloudEvaluationLabel')}
              help="Off by default. Recordings remain local unless a parent explicitly enables a future reviewed service."
              onChange={(checked) => updateVoicePrivacy({ allowCloudEvaluation: checked })}
            />
            <ToggleRow
              id={retainId}
              checked={state.preferences.voicePrivacy.retainPracticeRecordings}
              label={t('retainRecordingsLabel')}
              help="Version 2 does not persist recordings; this preference reserves the parent choice for a future implementation."
              onChange={(checked) => updateVoicePrivacy({ retainPracticeRecordings: checked })}
            />
            <p className="rounded-xl bg-sky-100 p-3 text-sm text-ink-700">
              Model training is always disabled. Chant Coach is{' '}
              {FEATURE_FLAGS.chantCoachEnabled ? 'enabled' : 'disabled'}.
            </p>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-ink-900">Future Lesson Circle</h2>
            <ToggleRow
              id={communityId}
              checked={state.preferences.allowFutureCommunityFeatures}
              label={t('communityPreferenceLabel')}
              help="The Lesson Circle product feature remains disabled; no child chat or free-text community input exists."
              onChange={(checked) => {
                dispatch({
                  type: 'UPDATE_PREFERENCES',
                  updates: { allowFutureCommunityFeatures: checked },
                })
                flashSaved()
              }}
            />
            <p className="text-sm font-semibold text-lavender-700">
              {FEATURE_FLAGS.communityEnabled
                ? 'Enabled for reviewed testing'
                : t('comingFutureUpdate')}
            </p>
          </Card>
        </>
      )}

      <p
        role={saveNotice === 'failed' ? 'alert' : 'status'}
        className={`text-sm font-semibold ${
          saveNotice === 'failed' ? 'text-lotus-700' : 'text-leaf-700'
        } ${saveNotice ? '' : 'invisible'}`}
      >
        {saveNotice === 'saving'
          ? t('settingsSaving')
          : saveNotice === 'failed'
            ? t('settingsSaveFailed')
            : t('settingsSaved')}
      </p>
    </div>
  )
}

function ToggleRow({
  id,
  checked,
  label,
  help,
  onChange,
}: {
  id: string
  checked: boolean
  label: string
  help?: string
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5"
      />
      <label htmlFor={id} className="flex flex-col">
        <span className="font-semibold text-ink-900">{label}</span>
        {help && <span className="text-sm text-ink-500">{help}</span>}
      </label>
    </div>
  )
}
