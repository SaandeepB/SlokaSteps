import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Square, Trash2 } from 'lucide-react'
import { Button } from '../common/Button'
import { ChantFeedback } from './ChantFeedback'
import { useRecorder } from '../../hooks/useRecorder'
import { useTranslation } from '../../hooks/useTranslation'
import { getEvaluationService } from '../../services/pronunciation'
import { isScoredEvaluation, type ChantEvaluationResult } from '../../types/chant'
import type { TranslationKey } from '../../content/translations'
import { useAppState } from '../../hooks/useAppState'

export interface RecorderPanelProps {
  /** The line/sloka the child is chanting, as displayed (transliteration). */
  expectedText: string
  /**
   * Devanagari reference text for the on-device chant check. Without it the
   * recording only ever receives participation encouragement.
   */
  expectedDevanagari?: string
  /** Catalogue id of the sloka being practised, when the caller knows it. */
  slokaId?: string
  /**
   * Called once the child has attempted a recording OR hit a microphone
   * problem — either way the lesson can continue.
   */
  onAttempted: () => void
}

/**
 * Start/stop recording with elapsed time, immediate in-session playback via a
 * standard audio player, delete-and-retry, and feedback. The microphone is
 * requested only when the child presses Record. Audio never leaves the device
 * and is never persisted. Feedback is participation-only unless the
 * parent-enabled on-device Chant Coach is ready; evaluation problems of any
 * kind fall back to gentle notices and never block the lesson.
 */
export function RecorderPanel({
  expectedText,
  expectedDevanagari,
  slokaId,
  onAttempted,
}: RecorderPanelProps) {
  const { t } = useTranslation()
  const { state } = useAppState()
  const recorder = useRecorder()
  const [evaluating, setEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<ChantEvaluationResult | null>(
    null,
  )
  const attemptNotified = useRef(false)
  const mountedRef = useRef(true)
  const evaluationToken = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const notifyAttempted = () => {
    if (!attemptNotified.current) {
      attemptNotified.current = true
      onAttempted()
    }
  }

  // A recording attempt or a microphone problem both unlock continuation.
  useEffect(() => {
    if (recorder.status === 'recorded' || recorder.status === 'error') {
      notifyAttempted()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.status])

  // Evaluate the recording. The registered service decides what that means:
  // participation-only encouragement by default; the on-device analyzer when
  // the parent has enabled it and it is ready.
  useEffect(() => {
    if (recorder.status !== 'recorded' || !recorder.recordingBlob) return
    const token = ++evaluationToken.current
    setEvaluating(true)
    setEvaluation(null)
    getEvaluationService()
      .evaluate({
        recording: recorder.recordingBlob,
        slokaId: slokaId ?? null,
        referenceId: null,
        expectedText: expectedDevanagari ?? expectedText,
        language: 'sa-IN',
        ageBand: state.profile?.ageBand ?? '7-8',
        evaluationModes: expectedDevanagari
          ? ['completeness', 'pronunciation']
          : [],
      })
      .then((result) => {
        if (!mountedRef.current || token !== evaluationToken.current) return
        setEvaluating(false)
        setEvaluation(result)
      })
      .catch(() => {
        if (!mountedRef.current || token !== evaluationToken.current) return
        setEvaluating(false)
        setEvaluation(null)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.status, recorder.recordingBlob])

  const deleteAndRetry = () => {
    evaluationToken.current += 1
    setEvaluating(false)
    setEvaluation(null)
    recorder.reset()
  }

  if (!state.preferences.voicePrivacy.allowMicrophone) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="rounded-xl bg-sky-100 p-3 text-ink-700">
          Microphone practice is turned off in Parent Settings. You can still chant aloud and continue.
        </p>
        <UnsupportedContinueUnlock onAttempted={notifyAttempted} />
      </div>
    )
  }

  if (!recorder.supported) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="rounded-xl bg-sky-100 p-3 text-ink-700">
          {t('micUnsupported')}
        </p>
        <UnsupportedContinueUnlock onAttempted={notifyAttempted} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {recorder.status === 'idle' && (
        <>
          <p className="text-ink-700">{t('recordingHint')}</p>
          <Button size="lg" onClick={recorder.start} className="self-start">
            <Mic size={22} aria-hidden="true" />
            {t('record')}
          </Button>
        </>
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
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-full bg-lotus-500 animate-sparkle"
            />
            {t('recordingLabel', { seconds: recorder.elapsedSeconds })}
          </span>
          <Button size="lg" onClick={recorder.stop}>
            <Square size={20} aria-hidden="true" />
            {t('stopRecording')}
          </Button>
        </div>
      )}

      {recorder.status === 'recorded' && (
        <div className="flex flex-col gap-3">
          <p role="status" className="font-semibold text-leaf-700">
            {t('recordedOk')}{' '}
            {evaluation && !isScoredEvaluation(evaluation) &&
            evaluation.provenance === 'participation-only'
              ? t(evaluation.childMessageKey as TranslationKey)
              : ''}
          </p>

          {/* A standard, visible audio player: the child taps play and hears
              their own recording. Native controls are used deliberately here
              (over a custom button) so playback is always operable. */}
          {recorder.recordingUrl && (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-ink-700">
                {t('playRecording')}
              </span>
              <audio
                key={recorder.recordingUrl}
                src={recorder.recordingUrl}
                controls
                preload="metadata"
                className="w-full max-w-md"
                aria-label={t('playRecording')}
              />
            </div>
          )}

          {evaluating && (
            <p
              role="status"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-100 px-3 py-2 font-semibold text-teal-700"
            >
              <Loader2 size={18} aria-hidden="true" className="animate-spin" />
              {t('chantCoachChecking')}
            </p>
          )}

          {evaluation && evaluation.provenance !== 'participation-only' && (
            <ChantFeedback result={evaluation} />
          )}

          <Button variant="secondary" onClick={deleteAndRetry} className="self-start">
            <Trash2 size={18} aria-hidden="true" />
            {t('deleteRecording')}
          </Button>
        </div>
      )}

      {recorder.status === 'error' && (
        <div className="flex flex-col gap-3">
          <p role="status" className="rounded-xl bg-sky-100 p-3 text-ink-700">
            {t('micErrorFriendly')}
          </p>
          <Button variant="secondary" onClick={deleteAndRetry} className="self-start">
            {t('tryAgain')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** Unsupported browsers unlock continuation immediately — never a dead end. */
function UnsupportedContinueUnlock({ onAttempted }: { onAttempted: () => void }) {
  useEffect(() => {
    onAttempted()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
