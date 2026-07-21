import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Flame, Sparkles } from 'lucide-react'
import { getNextSloka, getSlokaById } from '../content/slokas'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { todayIsoDate } from '../utils/dates'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Mitra } from '../components/common/Mitra'
import { StarDisplay } from '../components/common/StarDisplay'
import { BadgeMedal } from '../components/common/BadgeMedal'
import { ProgressBar } from '../components/common/ProgressBar'
import { routes } from '../routes/paths'

/**
 * Celebration screen for the completion just recorded in state. Reached only
 * through the lesson engine; a direct visit (or refresh) redirects safely to
 * the learning path.
 */
export function CompletePage() {
  const { slokaId } = useParams()
  const { state, dispatch } = useAppState()
  const { t } = useTranslation()
  const navigate = useNavigate()
  useDocumentTitle(t('lessonComplete'))

  const sloka = getSlokaById(slokaId)
  const completion = state.lastCompletion

  if (!sloka || !completion || completion.slokaId !== sloka.id) {
    return <Navigate to={routes.path} replace />
  }

  const nextSloka = getNextSloka(sloka)
  const goal = state.settings.dailyGoalMinutes
  const minutesToday =
    state.dailyProgress.date === todayIsoDate()
      ? state.dailyProgress.estimatedMinutes
      : 0
  const learnerName = state.profile?.displayName ?? t('defaultLearnerName')

  const practiceAgain = () => {
    dispatch({ type: 'CLEAR_LAST_COMPLETION' })
    dispatch({ type: 'START_LESSON', slokaId: sloka.id })
    navigate(routes.activity(sloka.id, sloka.activities[0].id))
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      {/* Gentle CSS celebration — reduced-motion safe via global rules. */}
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute -left-8 top-2 text-2xl text-saffron-400 animate-sparkle"
        >
          ✦
        </span>
        <span
          aria-hidden="true"
          className="absolute -right-8 top-6 text-xl text-lotus-500 animate-sparkle"
          style={{ animationDelay: '0.4s' }}
        >
          ✦
        </span>
        <span
          aria-hidden="true"
          className="absolute -top-3 left-10 text-lg text-lavender-500 animate-sparkle"
          style={{ animationDelay: '0.8s' }}
        >
          ✦
        </span>
        <Mitra size={130} label={t('mitraAlt')} />
      </div>

      <div role="status" className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-teal-700 animate-gentle-pop">
          {t('lessonComplete')}
        </h1>
        <p className="text-xl font-semibold text-ink-900">
          {t('wellDone', { name: learnerName })}
        </p>
      </div>

      <Card className="flex w-full max-w-md flex-col items-center gap-4">
        <StarDisplay stars={completion.stars} size={40} />
        <p className="font-semibold text-ink-700">
          {t('starsEarned', { stars: completion.stars })}
        </p>

        {completion.xpEarned > 0 ? (
          <p className="flex items-center gap-2 text-lg font-bold text-saffron-600">
            <Sparkles size={22} aria-hidden="true" />
            {t('xpEarned', { xp: completion.xpEarned })}
          </p>
        ) : (
          <p className="text-sm text-ink-500">{t('noNewXp')}</p>
        )}

        {completion.badgeUnlockedId && (
          <div className="flex flex-col items-center gap-2">
            <p className="font-bold text-lavender-700">{t('badgeUnlocked')}</p>
            <BadgeMedal badge={sloka.badge} size="lg" showName />
          </div>
        )}

        <p className="flex items-center gap-2 font-semibold text-ink-700">
          <Flame size={20} aria-hidden="true" className="text-lotus-500" />
          {t('currentStreak', { days: state.streak.current })}
        </p>

        <div className="flex w-full flex-col gap-1">
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
      </Card>

      {nextSloka && (
        <Card className="flex w-full max-w-md items-center justify-between gap-3">
          <div className="text-left">
            <p className="text-sm font-medium text-ink-500">{t('nextLessonLabel')}</p>
            <p className="font-bold text-ink-900">{nextSloka.title}</p>
            <p className="text-sm text-ink-700">{nextSloka.theme}</p>
          </div>
          <BadgeMedal
            badge={nextSloka.badge}
            earned={state.badges.includes(nextSloka.badge.id)}
          />
        </Card>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to={routes.path}
          className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-teal-600 px-6 py-3 text-lg font-semibold text-white shadow-soft hover:bg-teal-700"
        >
          {t('returnToPath')}
        </Link>
        <Button variant="secondary" size="lg" onClick={practiceAgain}>
          {t('practiceAgain')}
        </Button>
      </div>
    </div>
  )
}
