import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import { getActivityById, getSlokaById, SLOKAS } from '../content/slokas'
import type { StarCount } from '../types'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { getLessonAvailability, canEnterLesson } from '../utils/progression'
import { ESTIMATED_MINUTES_PER_ACTIVITY } from '../utils/rewards'
import { todayIsoDate } from '../utils/dates'
import { ProgressBar } from '../components/common/ProgressBar'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { FriendlyError } from '../components/common/FriendlyError'
import { IntroductionActivity } from '../components/lesson/IntroductionActivity'
import { ListenActivity } from '../components/lesson/ListenActivity'
import { RepeatActivity } from '../components/lesson/RepeatActivity'
import { MeaningActivity } from '../components/lesson/MeaningActivity'
import { MatchActivity } from '../components/lesson/MatchActivity'
import { FillBlankActivity } from '../components/lesson/FillBlankActivity'
import { ArrangeWordsActivity } from '../components/lesson/ArrangeWordsActivity'
import { FullChantActivity } from '../components/lesson/FullChantActivity'
import { routes } from '../routes/paths'

/**
 * The reusable, data-driven lesson engine. One activity renders at a time
 * from the sloka's typed activity list; manual URL edits cannot jump ahead
 * of the saved position or into locked/coming-soon lessons.
 */
export function ActivityPage() {
  const { slokaId, activityId } = useParams()
  const { state, dispatch } = useAppState()
  const { t, language } = useTranslation()
  const navigate = useNavigate()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [confirmExit, setConfirmExit] = useState(false)

  const sloka = getSlokaById(slokaId)
  const found = sloka ? getActivityById(sloka, activityId) : undefined

  useDocumentTitle(sloka ? sloka.title : t('missingContentTitle'))

  useEffect(() => {
    headingRef.current?.focus()
  }, [activityId])

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

  const availability = getLessonAvailability(sloka, state.progress.slokas, SLOKAS)
  if (!canEnterLesson(availability) || sloka.activities.length === 0) {
    return <Navigate to={routes.lesson(sloka.id)} replace />
  }

  if (!found) {
    return (
      <FriendlyError
        title={t('missingContentTitle')}
        body={t('missingContentBody')}
        actions={
          <Link
            to={routes.lesson(sloka.id)}
            className="font-semibold text-teal-700 underline"
          >
            {sloka.title}
          </Link>
        }
      />
    )
  }

  const progress = state.progress.slokas[sloka.id]
  const savedIndex = Math.min(
    progress?.currentActivityIndex ?? 0,
    sloka.activities.length - 1,
  )

  // Manual URL edits cannot jump ahead of the saved place, and the
  // completion marker is never rendered as a step of its own.
  if (found.index > savedIndex || found.activity.type === 'completion') {
    const safe = sloka.activities[savedIndex]
    if (safe.type === 'completion' || found.activity.type === 'completion') {
      return <Navigate to={routes.lesson(sloka.id)} replace />
    }
    return <Navigate to={routes.activity(sloka.id, safe.id)} replace />
  }

  const { activity, index } = found
  // The trailing completion marker is celebrated on the Complete page.
  const totalSteps = sloka.activities.length - 1

  const advance = (testStars?: StarCount) => {
    const nextIndex = index + 1
    dispatch({
      type: 'ADVANCE_ACTIVITY',
      slokaId: sloka.id,
      activityIndex: nextIndex,
      activityId: sloka.activities[nextIndex]?.id,
      estimatedMinutes: ESTIMATED_MINUTES_PER_ACTIVITY,
      today: todayIsoDate(),
    })
    const nextActivity = sloka.activities[nextIndex]
    if (!nextActivity || nextActivity.type === 'completion') {
      dispatch({
        type: 'COMPLETE_LESSON',
        slokaId: sloka.id,
        today: todayIsoDate(),
        nowIso: new Date().toISOString(),
        // Present only when the Chant Test was passed; it drives the stars.
        ...(testStars !== undefined ? { testStars } : {}),
      })
      navigate(routes.complete(sloka.id), { replace: true })
    } else {
      navigate(routes.activity(sloka.id, nextActivity.id))
    }
  }

  const goBack = () => {
    if (index === 0) return
    navigate(routes.activity(sloka.id, sloka.activities[index - 1].id))
  }

  const recordIncorrect = () =>
    dispatch({ type: 'RECORD_INCORRECT_ATTEMPT', slokaId: sloka.id })
  const recordRecording = () =>
    dispatch({ type: 'RECORD_RECORDING_ATTEMPTED', slokaId: sloka.id })

  const meaning = sloka.meanings[language] ?? sloka.meanings['en-IN']
  const narrationMeaning =
    sloka.meanings[state.preferences.narrationLanguage] ??
    sloka.meanings['en-IN']

  return (
    <div className="flex min-h-screen flex-col gap-6 py-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          {index > 0 ? (
            <button
              type="button"
              onClick={goBack}
              aria-label={t('back')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-ink-700 hover:bg-cream-100"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
          ) : (
            <span className="h-11 w-11" aria-hidden="true" />
          )}
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="min-w-0 flex-1 truncate text-center text-lg font-bold text-ink-900 outline-none"
          >
            {sloka.title}
          </h1>
          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            aria-label={t('exitLesson')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-ink-700 hover:bg-cream-100"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>
        <ProgressBar value={index + 1} max={totalSteps} label={t('lessonProgress')} />
        <p className="text-center text-sm font-medium text-ink-500">
          {t('stepOf', { current: index + 1, total: totalSteps })}
        </p>
      </header>

      <section
        aria-label={t('stepOf', { current: index + 1, total: totalSteps })}
        className="rounded-3xl border border-cream-200 bg-white p-5 shadow-soft sm:p-8"
      >
        {activity.type === 'introduction' && (
          <IntroductionActivity
            title={sloka.title}
            theme={sloka.theme}
            badge={sloka.badge}
            onContinue={advance}
          />
        )}
        {activity.type === 'listen' && (
          <ListenActivity
            line={sloka.lines[activity.lineIndex]}
            slokaId={sloka.id}
            lineMeaning={meaning?.lineMeanings[activity.lineIndex]}
            onContinue={advance}
          />
        )}
        {activity.type === 'repeat' && (
          <RepeatActivity
            line={sloka.lines[activity.lineIndex]}
            slokaId={sloka.id}
            onContinue={advance}
            onRecordingAttempted={recordRecording}
          />
        )}
        {activity.type === 'meaning' && meaning && (
          <MeaningActivity
            meaning={meaning}
            slokaId={sloka.id}
            narrationText={narrationMeaning?.simpleMeaning}
            narrationLanguage={state.preferences.narrationLanguage}
            onContinue={advance}
          />
        )}
        {activity.type === 'match' && (
          <MatchActivity
            items={activity.pairs.map((pair) => ({
              id: pair.id,
              phrase: pair.phrase,
              meaning:
                meaning?.lineMeanings[pair.lineIndex] ??
                sloka.lines[pair.lineIndex].transliteration,
            }))}
            onComplete={advance}
            onIncorrectAttempt={recordIncorrect}
          />
        )}
        {activity.type === 'fillBlank' && (
          <FillBlankActivity
            words={sloka.lines[activity.lineIndex].transliteration.split(' ')}
            blankIndex={activity.blankWordIndex}
            distractors={activity.distractors}
            onComplete={advance}
            onIncorrectAttempt={recordIncorrect}
          />
        )}
        {activity.type === 'arrangeWords' && (
          <ArrangeWordsActivity
            words={sloka.lines[activity.lineIndex].transliteration.split(' ')}
            onComplete={advance}
            onIncorrectAttempt={recordIncorrect}
          />
        )}
        {activity.type === 'fullChant' && (
          <FullChantActivity
            lines={sloka.lines}
            slokaId={sloka.id}
            onFinish={(testStars) => advance(testStars)}
            onRecordingAttempted={recordRecording}
          />
        )}
      </section>

      <ConfirmDialog
        open={confirmExit}
        title={t('exitConfirmTitle')}
        confirmLabel={t('leave')}
        cancelLabel={t('stay')}
        onConfirm={() => {
          setConfirmExit(false)
          navigate(routes.path)
        }}
        onCancel={() => setConfirmExit(false)}
      >
        <p>{t('exitConfirmBody')}</p>
      </ConfirmDialog>
    </div>
  )
}
