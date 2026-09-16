import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { BadgeMedal } from '../common/BadgeMedal'
import { StarDisplay } from '../common/StarDisplay'
import { useAppState } from '../../hooks/useAppState'
import { useTranslation } from '../../hooks/useTranslation'
import { SLOKAS, getSlokaById } from '../../content/slokas'
import {
  getCompletionPercent,
  getLessonAvailability,
} from '../../utils/progression'
import { clearPersistedState } from '../../services/persistence'
import { LANGUAGES } from '../../types'
import { routes } from '../../routes/paths'
import { getStoryChapterById, resolveLocalizedText } from '../../content/stories'

export function ParentDashboard() {
  const { state, dispatch } = useAppState()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetError, setResetError] = useState(false)

  const completedCount = SLOKAS.filter(
    (sloka) => state.progress.slokas[sloka.id]?.status === 'completed',
  ).length
  const implementedCount = SLOKAS.filter(
    (sloka) => sloka.implementationStatus === 'complete',
  ).length
  const displayLanguageName =
    LANGUAGES.find((lang) => lang.code === state.preferences.displayLanguage)?.endonym ??
    state.preferences.displayLanguage
  const narrationLanguageName =
    LANGUAGES.find((lang) => lang.code === state.preferences.narrationLanguage)?.endonym ??
    state.preferences.narrationLanguage
  const lastEntry = state.progress.practiceHistory[0]
  const lastSloka =
    lastEntry?.contentType === 'sloka' ? getSlokaById(lastEntry.contentId) : undefined
  const currentSloka = SLOKAS.find(
    (sloka) => state.progress.slokas[sloka.id]?.status === 'in-progress',
  )
  const currentStoryId = Object.values(state.progress.storyChapters).find(
    (chapter) => chapter.status === 'in-progress',
  )?.chapterId
  const currentStory = getStoryChapterById(currentStoryId)

  const performReset = () => {
    // Removes only Sloka Steps storage keys, never other browser data.
    setResetError(false)
    if (!clearPersistedState()) {
      setResetError(true)
      return
    }
    dispatch({ type: 'RESET_ALL' })
    setConfirmReset(false)
    navigate(routes.setup)
  }

  return (
    <div className="flex flex-col gap-5 py-2">
      <h1 className="text-3xl font-extrabold text-teal-700">
        {t('parentDashboardTitle')}
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold text-ink-900">
            {t('childNameLabel')}
          </h2>
          <dl className="flex flex-col gap-2 text-ink-700">
            <DashboardRow
              label={t('childNameLabel')}
              value={state.profile?.nickname ?? '—'}
            />
            <DashboardRow
              label={t('ageRangeLabel')}
              value={state.profile?.ageBand ?? '—'}
            />
            <DashboardRow label={t('displayLanguageLabel')} value={displayLanguageName} />
            <DashboardRow label={t('narrationLanguageLabel')} value={narrationLanguageName} />
            <DashboardRow label={t('scriptPreferenceLabel')} value={state.preferences.scriptPreference} />
            <DashboardRow
              label={t('dailyGoal')}
              value={t('minutesOption', { n: state.profile?.dailyGoalMinutes ?? 10 })}
            />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold text-ink-900">
            {t('learningPath')}
          </h2>
          <dl className="flex flex-col gap-2 text-ink-700">
            <DashboardRow
              label={t('lessonsCompleted')}
              value={`${completedCount} / ${implementedCount}`}
            />
            <DashboardRow label="Story chapters completed" value={String(Object.values(state.progress.storyChapters).filter((chapter) => chapter.status === 'completed').length)} />
            <DashboardRow label="Current sloka path" value={currentSloka?.title ?? '—'} />
            <DashboardRow
              label="Current story path"
              value={
                currentStory
                  ? resolveLocalizedText(currentStory.title, state.preferences.displayLanguage)
                  : '—'
              }
            />
            <DashboardRow label={t('totalXpLabel')} value={String(state.progress.totalXp)} />
            <DashboardRow
              label={t('currentStreak', { days: state.progress.streak.current })}
              value=""
            />
            {lastSloka && (
              <DashboardRow label={t('lastPracticed')} value={lastSloka.title} />
            )}
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-ink-900">{t('learningPath')}</h2>
        <ul className="flex flex-col gap-3">
          {SLOKAS.map((sloka) => {
            const progress = state.progress.slokas[sloka.id]
            const availability = getLessonAvailability(sloka, state.progress.slokas, SLOKAS)
            return (
              <li
                key={sloka.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cream-200 p-3"
              >
                <span className="font-semibold text-ink-900">{sloka.title}</span>
                <span className="flex items-center gap-3 text-sm text-ink-700">
                  {availability === 'coming-soon'
                    ? t('stateComingSoon')
                    : t('percentComplete', {
                        percent: getCompletionPercent(sloka, progress),
                      })}
                  {(progress?.bestStars ?? 0) > 0 && (
                    <StarDisplay stars={progress?.bestStars ?? 0} size={16} />
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-ink-900">{t('badgesLabel')}</h2>
        {state.progress.badges.length === 0 ? (
          <p className="text-ink-500">—</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {SLOKAS.filter((sloka) =>
              state.progress.badges.some((badge) => badge.id === sloka.badge.id),
            ).map(
              (sloka) => (
                <BadgeMedal key={sloka.badge.id} badge={sloka.badge} size="lg" showName />
              ),
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-ink-900">
          {t('practiceHistoryTitle')}
        </h2>
        {state.progress.practiceHistory.length === 0 ? (
          <p className="text-ink-500">{t('noHistory')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.progress.practiceHistory.slice(0, 20).map((entry) => {
              const sloka = entry.contentType === 'sloka' ? getSlokaById(entry.contentId) : undefined
              const story = entry.contentType === 'story' ? getStoryChapterById(entry.contentId) : undefined
              const when = new Date(entry.completedAt)
              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cream-200 p-3 text-sm"
                >
                  <span className="font-semibold text-ink-900">
                    {sloka?.title ??
                      (story
                        ? resolveLocalizedText(story.title, state.preferences.displayLanguage)
                        : entry.contentId)}
                  </span>
                  <span className="flex items-center gap-3 text-ink-700">
                    {entry.kind === 'first-completion'
                      ? t('historyFirstCompletion')
                      : t('historyPractice')}
                    <StarDisplay stars={entry.stars} size={14} />
                    <time dateTime={entry.completedAt}>
                      {Number.isNaN(when.getTime())
                        ? entry.completedAt
                        : when.toLocaleDateString(state.preferences.displayLanguage)}
                    </time>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-ink-900">Preferences and privacy</h2>
        <dl className="flex flex-col gap-2 text-ink-700">
          <DashboardRow label={t('calmModeLabel')} value={state.preferences.calmMode ? 'On' : 'Off'} />
          <DashboardRow label={t('microphoneLabel')} value={state.preferences.voicePrivacy.allowMicrophone ? 'On' : 'Off'} />
          <DashboardRow label={t('cloudEvaluationLabel')} value={state.preferences.voicePrivacy.allowCloudEvaluation ? 'On' : 'Off'} />
          <DashboardRow label={t('retainRecordingsLabel')} value={state.preferences.voicePrivacy.retainPracticeRecordings ? 'Requested (not active)' : 'Off'} />
          <DashboardRow label={t('communityPreferenceLabel')} value={state.preferences.allowFutureCommunityFeatures ? 'Parent interest saved; feature off' : 'Off'} />
          <DashboardRow label={t('bookmarks')} value={String(state.progress.bookmarks.length)} />
        </dl>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="rounded-xl bg-lavender-100 p-3 text-sm text-ink-700">
          {t('translationNotice')}
        </p>
        <p className="rounded-xl bg-sky-100 p-3 text-sm text-ink-700">
          {t('audioPrivacyNotice')}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to={routes.settings}
            className="inline-flex min-h-11 items-center rounded-2xl bg-teal-600 px-5 font-semibold text-white hover:bg-teal-700"
          >
            {t('updateSettings')}
          </Link>
          <Button
            variant="danger"
            onClick={() => {
              setResetError(false)
              setConfirmReset(true)
            }}
          >
            {t('resetProgress')}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title={t('resetConfirmTitle')}
        confirmLabel={t('resetAction')}
        cancelLabel={t('cancel')}
        confirmVariant="danger"
        onConfirm={performReset}
        onCancel={() => setConfirmReset(false)}
      >
        <p>{t('resetConfirmBody')}</p>
        {resetError && (
          <p role="alert" className="mt-3 font-semibold text-lotus-700">
            {t('resetFailed')}
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}

function DashboardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="font-semibold text-ink-900">{value}</dd>
    </div>
  )
}
