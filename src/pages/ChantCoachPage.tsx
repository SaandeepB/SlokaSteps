import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download, GraduationCap, Loader2 } from 'lucide-react'
import { getSlokaById, SLOKAS } from '../content/slokas'
import { useAppState } from '../hooks/useAppState'
import { useChantCoach } from '../hooks/useChantCoach'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { canEnterLesson, getLessonAvailability } from '../utils/progression'
import { prepareChantCoach } from '../services/chantAnalysis/chantCoachRuntime'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Mitra } from '../components/common/Mitra'
import { FriendlyError } from '../components/common/FriendlyError'
import { SlokaTextBlock } from '../components/common/SlokaTextBlock'
import { PlayLineControls } from '../components/audio/PlayLineControls'
import { RecorderPanel } from '../components/audio/RecorderPanel'
import { routes } from '../routes/paths'

/**
 * Guided line-by-line practice with the on-device Chant Coach — the way a
 * teacher would take it: listen to a line, chant it back, hear what matched,
 * practice again or move on. No XP, stars, or badges here: rewards stay
 * independent of evaluation availability and outcome.
 */
export function ChantCoachPage() {
  const { slokaId } = useParams()
  const { state } = useAppState()
  const { t } = useTranslation()
  const [lineIndex, setLineIndex] = useState(0)
  // Remounts the recorder per line/attempt so each practice starts fresh.
  const [attemptKey, setAttemptKey] = useState(0)

  const sloka = getSlokaById(slokaId)
  useDocumentTitle(
    sloka ? `${t('chantCoachTitle')} — ${sloka.title}` : t('chantCoachTitle'),
  )

  if (!sloka || sloka.implementationStatus !== 'complete') {
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
  if (!canEnterLesson(availability)) {
    return (
      <FriendlyError
        title={t('chantCoachTitle')}
        body={t('lockedMessage')}
        actions={
          <Link to={routes.lesson(sloka.id)} className="font-semibold text-teal-700 underline">
            {t('back')}
          </Link>
        }
      />
    )
  }

  const line = sloka.lines[Math.min(lineIndex, sloka.lines.length - 1)]
  const segmentId =
    line.id.startsWith(`${sloka.id}-`) ? line.id.slice(sloka.id.length + 1) : line.id
  const isLast = lineIndex >= sloka.lines.length - 1

  const goTo = (nextIndex: number) => {
    setLineIndex(nextIndex)
    setAttemptKey((key) => key + 1)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-lotus-700">
            <GraduationCap size={16} aria-hidden="true" />
            {t('chantCoachTestingBadge')}
          </p>
          <h1 className="text-3xl font-extrabold text-teal-700">
            {t('chantCoachTitle')} · {sloka.title}
          </h1>
        </div>
        <Link
          to={routes.lesson(sloka.id)}
          className="inline-flex min-h-11 items-center rounded-2xl px-4 font-semibold text-teal-700 hover:bg-teal-100"
        >
          {t('back')}
        </Link>
      </div>

      <div className="flex items-start gap-3">
        <Mitra size={56} decorative float={false} />
        <p className="rounded-2xl bg-cream-100 p-3 text-ink-700">
          {t('chantCoachIntro')}
        </p>
      </div>

      <CoachStatusNotice />

      <Card className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-ink-500">
          {t('chantCoachLineOf', {
            current: lineIndex + 1,
            total: sloka.lines.length,
          })}
        </p>
        <SlokaTextBlock lines={[line]} size="lg" />

        <div className="flex flex-col gap-2">
          <p className="font-semibold text-ink-700">{t('chantCoachListenFirst')}</p>
          <PlayLineControls
            text={line.transliteration}
            audioQuery={{
              contentId: sloka.id,
              segmentId,
              purpose: 'canonical-chant',
              language: 'sa-IN',
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-semibold text-ink-700">{t('chantCoachYourTurn')}</p>
          <RecorderPanel
            key={`${line.id}-${attemptKey}`}
            expectedText={line.transliteration}
            expectedDevanagari={line.devanagari}
            slokaId={sloka.id}
            onAttempted={() => {}}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={lineIndex === 0}
            onClick={() => goTo(lineIndex - 1)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
            {t('chantCoachPreviousLine')}
          </Button>
          <Button variant="secondary" onClick={() => setAttemptKey((k) => k + 1)}>
            {t('chantCoachTryLineAgain')}
          </Button>
          {!isLast ? (
            <Button onClick={() => goTo(lineIndex + 1)}>
              {t('chantCoachNextLine')}
              <ChevronRight size={18} aria-hidden="true" />
            </Button>
          ) : (
            <span
              role="status"
              className="inline-flex min-h-11 items-center rounded-2xl bg-leaf-100 px-4 font-semibold text-leaf-700"
            >
              {t('chantCoachAllDone')}
            </span>
          )}
        </div>
      </Card>

      <p className="text-sm text-ink-500">{t('chantCoachTestingExplainer')}</p>
    </div>
  )
}

/** Coach runtime state, in child-calm words; never blocks practice. */
function CoachStatusNotice() {
  const { t } = useTranslation()
  const coach = useChantCoach()

  if (!coach.enabled) {
    return (
      <p role="status" className="rounded-2xl bg-sky-100 p-3 text-ink-700">
        {t('chantCoachDisabledNote')}
      </p>
    )
  }
  switch (coach.status) {
    case 'preparing':
      return (
        <p
          role="status"
          className="inline-flex items-center gap-2 rounded-2xl bg-teal-100 p-3 font-semibold text-teal-700"
        >
          <Loader2 size={18} aria-hidden="true" className="animate-spin" />
          {t('chantCoachPreparing', {
            percent: Math.round(coach.progress * 100),
          })}
          <span className="font-normal text-ink-700"> {t('chantCoachPreparingHint')}</span>
        </p>
      )
    case 'available':
      return (
        <p role="status" className="flex flex-wrap items-center gap-3 rounded-2xl bg-sky-100 p-3 text-ink-700">
          {t('chantCoachNotDownloaded')}
          <Button onClick={() => void prepareChantCoach()}>
            <Download size={16} aria-hidden="true" />
            {t('chantCoachDownloadAction')}
          </Button>
        </p>
      )
    case 'assets-missing':
      return (
        <p role="status" className="rounded-2xl bg-sky-100 p-3 text-ink-700">
          {t('chantCoachAssetsMissing')}
        </p>
      )
    case 'failed':
      return (
        <p role="status" className="rounded-2xl bg-sky-100 p-3 text-ink-700">
          {t('chantCoachFailed')}
        </p>
      )
    case 'ready':
      return (
        <p role="status" className="rounded-2xl bg-leaf-100 p-3 font-semibold text-leaf-700">
          {t('chantCoachReady')}
        </p>
      )
    default:
      return null
  }
}
