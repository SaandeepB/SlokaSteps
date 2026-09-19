import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Mic, RefreshCw, Square, Star } from 'lucide-react'
import { Button } from '../common/Button'
import { SlokaTextBlock } from '../common/SlokaTextBlock'
import { PlayLineControls } from '../audio/PlayLineControls'
import { useRecorder } from '../../hooks/useRecorder'
import { useChantReference } from '../../hooks/useChantReference'
import { useTranslation } from '../../hooks/useTranslation'
import { useAppState } from '../../hooks/useAppState'
import { gradeChantAttempt, type ChantTestOutcome } from '../../services/chantAnalysis/chantGrading'
import { starsForGrade, type ChantGrade } from '../../services/chantAnalysis/audioSimilarity'
import type { StarCount, SlokaLine } from '../../types'
import type { TranslationKey } from '../../content/translations'

export interface FullChantActivityProps {
  lines: SlokaLine[]
  slokaId?: string
  /** Stars carries a passed test's grade; absent for a baseline/ungraded finish. */
  onFinish: (testStars?: StarCount) => void
  onRecordingAttempted: () => void
}

const GRADE_LABEL: Record<ChantGrade, TranslationKey> = {
  excellent: 'chantTestGradeExcellent',
  great: 'chantTestGradeGreat',
  good: 'chantTestGradeGood',
  'keep-practising': 'chantTestGradeKeepPractising',
}

/**
 * The Chant Test: chant the whole sloka and be graded against YOUR OWN
 * reference recording. Passing gates finishing the lesson, and the grade sets
 * the stars — so completion reflects the recitation, not just tapping through.
 *
 * First time (no reference yet) the recording is saved as the reference and
 * the lesson finishes as a baseline. A microphone that is off/unsupported/
 * failing always unlocks finishing (ungraded), so a technical problem can
 * never trap a learner.
 */
export function FullChantActivity({
  lines,
  slokaId,
  onFinish,
  onRecordingAttempted,
}: FullChantActivityProps) {
  const { t } = useTranslation()
  const { state } = useAppState()
  const recorder = useRecorder()
  const { reference, loading, saveFromBlob, clear } = useChantReference(slokaId)
  const [grading, setGrading] = useState(false)
  const [outcome, setOutcome] = useState<ChantTestOutcome | null>(null)
  const [baselineSaved, setBaselineSaved] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [earnedStars, setEarnedStars] = useState<StarCount | undefined>(undefined)
  const mountedRef = useRef(true)
  const token = useRef(0)
  // Latest reference, read inside the recording handler so saving a baseline
  // does not re-trigger the handler and immediately grade the take against
  // itself (which would always read 100% — the exact "pass no matter what"
  // problem this test is meant to remove).
  const referenceRef = useRef(reference)

  const fullText = lines.map((line) => line.transliteration).join('. ')
  const micAllowed = state.preferences.voicePrivacy.allowMicrophone
  const micWorkable = micAllowed && recorder.supported

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    referenceRef.current = reference
  }, [reference])

  // Grade (or save as reference) once a recording finishes. Depends only on
  // the recording, not on `reference`, so saving a baseline never re-fires it.
  useEffect(() => {
    if (recorder.status !== 'recorded' || !recorder.recordingBlob) return
    onRecordingAttempted()
    const current = ++token.current
    const blob = recorder.recordingBlob
    setSaveFailed(false)
    setOutcome(null)
    setBaselineSaved(false)

    const existing = referenceRef.current
    if (!existing) {
      // First take becomes the learner's reference (baseline, not a grade).
      saveFromBlob(blob).then((ok) => {
        if (!mountedRef.current || current !== token.current) return
        if (ok) {
          setBaselineSaved(true)
          setEarnedStars(undefined)
        } else {
          setSaveFailed(true)
        }
      })
      return
    }

    setGrading(true)
    gradeChantAttempt(blob, existing)
      .then((result) => {
        if (!mountedRef.current || current !== token.current) return
        setGrading(false)
        setOutcome(result)
        setEarnedStars(
          result.status === 'graded' && result.result.passed
            ? starsForGrade(result.result)
            : undefined,
        )
      })
      .catch(() => {
        if (!mountedRef.current || current !== token.current) return
        setGrading(false)
        setOutcome({ status: 'undecodable' })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.status, recorder.recordingBlob])

  const retry = () => {
    token.current += 1
    setGrading(false)
    setOutcome(null)
    setBaselineSaved(false)
    setSaveFailed(false)
    setEarnedStars(undefined)
    recorder.reset()
  }

  const reRecordReference = () => {
    void clear()
    retry()
  }

  const graded = outcome?.status === 'graded' ? outcome.result : null
  const passed = graded?.passed ?? false
  // Finishing is allowed when: the test passed, a baseline reference was just
  // saved, or the microphone cannot grade at all (never a dead end).
  const canFinish = passed || baselineSaved || !micWorkable

  const finish = () => onFinish(passed ? earnedStars : undefined)

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-teal-700">{t('chantTestTitle')}</h2>

      <div className="flex flex-col gap-2">
        <p className="text-ink-700">{t('chantTestListenFirst')}</p>
        <SlokaTextBlock lines={lines} />
        <PlayLineControls
          text={fullText}
          playLabelKey="listenFull"
          audioQuery={
            slokaId
              ? {
                  contentId: slokaId,
                  segmentId: 'full',
                  purpose: 'canonical-chant',
                  language: 'sa-IN',
                }
              : undefined
          }
        />
      </div>

      {!micWorkable ? (
        <p role="status" className="rounded-2xl bg-sky-100 p-4 text-ink-700">
          {t('chantTestMicOffNote')}
        </p>
      ) : loading ? (
        <p role="status" className="text-ink-500">
          …
        </p>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-cream-200 bg-cream-50 p-4">
          {reference ? (
            <div>
              <h3 className="text-lg font-bold text-ink-900">
                {t('chantTestTakeTitle')}
              </h3>
              <p className="mt-1 text-sm text-ink-700">{t('chantTestTakeHelp')}</p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-bold text-ink-900">
                {t('chantTestSetReferenceTitle')}
              </h3>
              <p className="mt-1 text-sm text-ink-700">
                {t('chantTestSetReferenceHelp')}
              </p>
            </div>
          )}

          {/* Record / stop */}
          {recorder.status === 'idle' && (
            <Button size="lg" onClick={recorder.start} className="self-start">
              <Mic size={22} aria-hidden="true" />
              {reference ? t('chantTestRecord') : t('chantTestRecordReference')}
            </Button>
          )}
          {recorder.status === 'requesting' && (
            <Button size="lg" disabled className="self-start">
              <Mic size={22} aria-hidden="true" />
              {t('record')}
            </Button>
          )}
          {recorder.status === 'recording' && (
            <div className="flex flex-wrap items-center gap-3">
              <span
                role="status"
                className="inline-flex items-center gap-2 rounded-xl bg-lotus-100 px-4 py-2 font-semibold text-lotus-700"
              >
                <span aria-hidden="true" className="h-3 w-3 rounded-full bg-lotus-500 animate-sparkle" />
                {t('recordingLabel', { seconds: recorder.elapsedSeconds })}
              </span>
              <Button size="lg" onClick={recorder.stop}>
                <Square size={20} aria-hidden="true" />
                {t('stopRecording')}
              </Button>
            </div>
          )}

          {grading && (
            <p
              role="status"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-100 px-3 py-2 font-semibold text-teal-700"
            >
              <Loader2 size={18} aria-hidden="true" className="animate-spin" />
              {t('chantTestGrading')}
            </p>
          )}

          {/* Recorded: playback + result */}
          {recorder.status === 'recorded' && recorder.recordingUrl && (
            <audio
              key={recorder.recordingUrl}
              src={recorder.recordingUrl}
              controls
              preload="metadata"
              className="w-full max-w-md"
              aria-label={t('playRecording')}
            />
          )}

          {baselineSaved && (
            <p role="status" className="rounded-xl bg-leaf-100 p-3 font-semibold text-leaf-700">
              {t('chantTestReferenceSaved')}
            </p>
          )}
          {saveFailed && (
            <p role="status" className="rounded-xl bg-sky-100 p-3 text-ink-700">
              {t('chantTestReferenceSaveFailed')}
            </p>
          )}

          {graded && (
            <div
              role="status"
              className={`flex flex-col gap-2 rounded-2xl border-2 p-4 ${
                passed
                  ? 'border-leaf-500 bg-leaf-100'
                  : 'border-saffron-500 bg-saffron-100'
              }`}
            >
              <p className="text-2xl font-extrabold text-ink-900">
                {t(GRADE_LABEL[graded.grade])}
              </p>
              <p className="font-semibold text-ink-700">
                {t('chantTestMatch', { percent: graded.scorePercent })}
              </p>
              {passed ? (
                <p className="inline-flex items-center gap-2 font-bold text-leaf-700">
                  <CheckCircle2 size={20} aria-hidden="true" />
                  {t('chantTestPassed')}
                  <span className="inline-flex" aria-hidden="true">
                    {Array.from({ length: earnedStars ?? 0 }).map((_v, i) => (
                      <Star key={i} size={18} className="fill-saffron-400 text-saffron-400" />
                    ))}
                  </span>
                </p>
              ) : (
                <div>
                  <p className="font-bold text-saffron-700">{t('chantTestFailedTitle')}</p>
                  <p className="text-ink-700">{t('chantTestFailedBody')}</p>
                </div>
              )}
            </div>
          )}

          {outcome && outcome.status !== 'graded' && outcome.status !== 'no-reference' && (
            <p role="status" className="rounded-xl bg-sky-100 p-3 text-ink-700">
              {t(
                outcome.status === 'too-quiet'
                  ? 'chantTestTooQuiet'
                  : outcome.status === 'too-short'
                    ? 'chantTestTooShort'
                    : 'chantTestUndecodable',
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {recorder.status === 'recorded' && (
              <Button variant="secondary" onClick={retry} className="self-start">
                <RefreshCw size={18} aria-hidden="true" />
                {t('chantTestRetry')}
              </Button>
            )}
            {reference && recorder.status !== 'recording' && (
              <Button variant="ghost" onClick={reRecordReference} className="self-start">
                {t('chantTestReRecordReference')}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={finish} disabled={!canFinish} className="self-start">
          {t('finishLesson')}
        </Button>
        {micWorkable && !canFinish && (
          <p className="text-sm font-semibold text-ink-500">{t('chantTestFinishGated')}</p>
        )}
      </div>
    </div>
  )
}
