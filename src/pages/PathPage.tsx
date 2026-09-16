import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Flame, Lock, Play, Sparkles, Star } from 'lucide-react'
import { SLOKAS } from '../content/slokas'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  getCompletionPercent,
  getLessonAvailability,
} from '../utils/progression'
import type { LessonAvailability } from '../utils/progression'
import { BadgeMedal } from '../components/common/BadgeMedal'
import { StarDisplay } from '../components/common/StarDisplay'
import { ProgressBar } from '../components/common/ProgressBar'
import { routes } from '../routes/paths'
import { todayIsoDate } from '../utils/dates'
import type { TranslationKey } from '../content/translations'
import type { Sloka } from '../types'
import { LearningModeSelector } from '../components/learn/LearningModeSelector'

const stateLabelKeys: Record<LessonAvailability, TranslationKey> = {
  locked: 'stateLocked',
  available: 'stateAvailable',
  'in-progress': 'stateInProgress',
  completed: 'stateCompleted',
  'coming-soon': 'stateComingSoon',
}

const editorialStatusLabels: Record<Sloka['contentStatus'], string> = {
  draft: 'Draft',
  'editorial-review': 'Editorial review',
  approved: 'Approved',
}

export function PathPage() {
  const { state, dispatch } = useAppState()
  const { t } = useTranslation()
  const navigate = useNavigate()
  useDocumentTitle(t('pathTitle'))

  useEffect(() => {
    if (state.progress.lastMode !== 'slokas') {
      dispatch({ type: 'SET_LEARNING_MODE', mode: 'slokas' })
    }
  }, [dispatch, state.progress.lastMode])

  const goal = state.profile?.dailyGoalMinutes ?? 10
  const minutesToday =
    state.progress.dailyProgress.date === todayIsoDate()
      ? state.progress.dailyProgress.estimatedMinutes
      : 0

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold text-teal-700">{t('pathTitle')}</h1>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-3 shadow-soft">
            <span className="flex items-center gap-2 font-semibold text-ink-700">
              <Sparkles size={20} aria-hidden="true" className="text-saffron-500" />
              {state.progress.totalXp} {t('xpLabel')}
            </span>
            <span className="flex items-center gap-2 font-semibold text-ink-700">
              <Flame size={20} aria-hidden="true" className="text-lotus-500" />
              {state.progress.streak.current} {t('streakLabel')}
            </span>
          </div>
          <div className="flex flex-col justify-center gap-1 rounded-2xl border border-cream-200 bg-white p-3 shadow-soft">
            <span className="text-sm font-semibold text-ink-700">
              {t('dailyGoal')}: {t('minutesToday', { done: Math.min(minutesToday, goal), goal })}
            </span>
            <ProgressBar
              value={Math.min(minutesToday, goal)}
              max={goal}
              label={t('dailyGoal')}
            />
            {minutesToday >= goal && (
              <span className="text-sm font-semibold text-leaf-700">
                {t('goalReached')}
              </span>
            )}
          </div>
        </div>
      </div>

      <LearningModeSelector
        value="slokas"
        slokasLabel={t('slokas')}
        storiesLabel={t('stories')}
        onChange={(mode) => {
          dispatch({ type: 'SET_LEARNING_MODE', mode })
          navigate(mode === 'slokas' ? routes.slokas : routes.stories)
        }}
      />

      <ol className="flex flex-col gap-4">
        {SLOKAS.map((sloka, index) => (
          <PathNode
            key={sloka.id}
            sloka={sloka}
            offsetRight={index % 2 === 1}
          />
        ))}
      </ol>
    </div>
  )
}

function PathNode({ sloka, offsetRight }: { sloka: Sloka; offsetRight: boolean }) {
  const { state } = useAppState()
  const { t } = useTranslation()

  const availability = getLessonAvailability(sloka, state.progress.slokas, SLOKAS)
  const progress = state.progress.slokas[sloka.id]
  const percent = getCompletionPercent(sloka, progress)
  const stateLabel = t(stateLabelKeys[availability])
  const clickable = availability !== 'locked'
  const accessibleLabel = `${sloka.title}. ${stateLabel}. ${
    editorialStatusLabels[sloka.contentStatus]
  }`

  const stateIcon = {
    locked: <Lock size={22} aria-hidden="true" className="text-ink-500" />,
    available: <Play size={22} aria-hidden="true" className="text-teal-600" />,
    'in-progress': <Play size={22} aria-hidden="true" className="text-saffron-600" />,
    completed: <Check size={22} aria-hidden="true" className="text-leaf-700" />,
    'coming-soon': <Star size={22} aria-hidden="true" className="text-lavender-500" />,
  }[availability]

  const body = (
    <div
      className={`flex items-center gap-4 rounded-3xl border-2 bg-white p-4 shadow-soft transition-colors ${
        availability === 'completed'
          ? 'border-leaf-500/50'
          : availability === 'in-progress'
            ? 'border-saffron-400'
            : availability === 'locked'
              ? 'border-cream-200 opacity-70'
              : availability === 'coming-soon'
                ? 'border-lavender-300 border-dashed'
                : 'border-cream-200 hover:border-teal-300'
      }`}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-cream-200 bg-cream-50">
        {stateIcon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium text-ink-500">
          {t('lessonNumber', { n: sloka.order })} · {sloka.theme}
        </span>
        <span className="text-lg font-bold text-ink-900">{sloka.title}</span>
        <span className="text-sm text-ink-700">
          {stateLabel}
          {availability === 'in-progress' && ` · ${t('percentComplete', { percent })}`}
        </span>
        <span
          className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${
            sloka.contentStatus === 'approved'
              ? 'bg-leaf-100 text-leaf-700'
              : 'bg-lavender-100 text-lavender-700'
          }`}
        >
          {editorialStatusLabels[sloka.contentStatus]}
        </span>
        {(progress?.bestStars ?? 0) > 0 && (
          <StarDisplay stars={progress?.bestStars ?? 0} size={18} />
        )}
      </span>
      <BadgeMedal
        badge={sloka.badge}
        earned={state.progress.badges.some((badge) => badge.id === sloka.badge.id)}
      />
    </div>
  )

  return (
    <li className={`w-full sm:w-[88%] ${offsetRight ? 'sm:self-end' : 'sm:self-start'}`}>
      {clickable ? (
        <Link
          to={routes.lesson(sloka.id)}
          aria-label={accessibleLabel}
          className="block rounded-3xl"
        >
          {body}
        </Link>
      ) : (
        <div aria-label={accessibleLabel} role="img">
          {body}
        </div>
      )}
    </li>
  )
}
