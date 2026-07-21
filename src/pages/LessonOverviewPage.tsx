import { Link, useNavigate, useParams } from 'react-router-dom'
import { Clock, ListChecks } from 'lucide-react'
import { getSlokaById, SLOKAS } from '../content/slokas'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { getLessonAvailability } from '../utils/progression'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { BadgeMedal } from '../components/common/BadgeMedal'
import { StarDisplay } from '../components/common/StarDisplay'
import { SlokaTextBlock } from '../components/common/SlokaTextBlock'
import { LanguageSelector } from '../components/common/LanguageSelector'
import { FriendlyError } from '../components/common/FriendlyError'
import { PlayLineControls } from '../components/audio/PlayLineControls'
import { routes } from '../routes/paths'

export function LessonOverviewPage() {
  const { slokaId } = useParams()
  const { state, dispatch } = useAppState()
  const { t, language } = useTranslation()
  const navigate = useNavigate()

  const sloka = getSlokaById(slokaId)
  useDocumentTitle(sloka ? sloka.title : t('missingContentTitle'))

  if (!sloka) {
    return (
      <FriendlyError
        title={t('missingContentTitle')}
        body={t('missingContentBody')}
        actions={
          <Link to={routes.path} className="font-semibold text-teal-700 underline">
            {t('returnToPath')}
          </Link>
        }
      />
    )
  }

  const availability = getLessonAvailability(sloka, state.lessons, SLOKAS)
  const progress = state.lessons[sloka.id]
  // Meanings fall back to English when the selected language pack has none.
  const meaning = sloka.meanings[language] ?? sloka.meanings.en

  const startLesson = () => {
    dispatch({ type: 'START_LESSON', slokaId: sloka.id })
    navigate(routes.activity(sloka.id, sloka.activities[0].id))
  }

  const resumeLesson = () => {
    const index = Math.min(
      progress?.currentActivityIndex ?? 0,
      sloka.activities.length - 1,
    )
    navigate(routes.activity(sloka.id, sloka.activities[index].id))
  }

  const fullChantText = sloka.lines.map((line) => line.transliteration).join('. ')

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-500">
            {t('lessonNumber', { n: sloka.order })} · {t('themeLabel')}: {sloka.theme}
          </p>
          <h1 className="text-3xl font-extrabold text-teal-700">{sloka.title}</h1>
        </div>
        <BadgeMedal
          badge={sloka.badge}
          earned={state.badges.includes(sloka.badge.id)}
          size="lg"
          showName
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-ink-700">
        <span className="inline-flex items-center gap-1">
          <Clock size={18} aria-hidden="true" />
          {t('estimatedMinutesLabel', { min: sloka.estimatedMinutes })}
        </span>
        {sloka.activities.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <ListChecks size={18} aria-hidden="true" />
            {t('activitiesCount', { count: sloka.activities.length })}
          </span>
        )}
        {(progress?.bestStars ?? 0) > 0 && (
          <StarDisplay stars={progress?.bestStars ?? 0} size={18} />
        )}
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-ink-900">{t('devanagariLabel')}</h2>
        <SlokaTextBlock lines={sloka.lines} />
      </Card>

      {meaning && (
        <Card>
          <h2 className="text-lg font-bold text-ink-900">{t('meaningTitle')}</h2>
          <p lang={language} className="mt-2 text-lg text-ink-700">
            {meaning.simpleMeaning}
          </p>
          <h3 className="mt-4 font-bold text-ink-900">{t('culturalNoteTitle')}</h3>
          <p lang={language} className="mt-1 text-ink-700">
            {meaning.culturalNote}
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-4">
        {availability === 'coming-soon' && (
          <p role="status" className="rounded-xl bg-lavender-100 p-4 font-semibold text-lavender-700">
            {t('comingSoonBody')}
          </p>
        )}
        {availability === 'locked' && (
          <p role="status" className="rounded-xl bg-cream-100 p-4 font-semibold text-ink-700">
            {t('lockedMessage')}
          </p>
        )}

        {availability !== 'coming-soon' && (
          <PlayLineControls text={fullChantText} playLabelKey="listenFull" />
        )}

        <div className="flex flex-wrap gap-3">
          {availability === 'available' && (
            <Button size="lg" onClick={startLesson}>
              {t('start')}
            </Button>
          )}
          {availability === 'in-progress' && (
            <>
              <Button size="lg" onClick={resumeLesson}>
                {t('resume')}
              </Button>
              <Button variant="secondary" onClick={startLesson}>
                {t('tryAgain')}
              </Button>
            </>
          )}
          {availability === 'completed' && (
            <Button size="lg" onClick={startLesson}>
              {t('practiceAgain')}
            </Button>
          )}
          <Link
            to={routes.path}
            className="inline-flex min-h-11 items-center rounded-2xl px-4 font-semibold text-teal-700 hover:bg-teal-100"
          >
            {t('returnToPath')}
          </Link>
        </div>
      </Card>

      <LanguageSelector />
    </div>
  )
}
