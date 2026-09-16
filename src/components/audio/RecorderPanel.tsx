import { useEffect, useRef, useState } from 'react'
import { Mic, Play, Square, Trash2 } from 'lucide-react'
import { Button } from '../common/Button'
import { useRecorder } from '../../hooks/useRecorder'
import { useTranslation } from '../../hooks/useTranslation'
import { getEvaluationService } from '../../services/pronunciation'
import { isScoredEvaluation } from '../../types/chant'
import type { TranslationKey } from '../../content/translations'
import { useAppState } from '../../hooks/useAppState'

export interface RecorderPanelProps {
  /** The line/sloka the child is chanting (for future evaluation only). */
  expectedText: string
  /** Catalogue id of the sloka being practised, when the caller knows it. */
  slokaId?: string
  /**
   * Called once the child has attempted a recording OR hit a microphone
   * problem — either way the lesson can continue.
   */
  onAttempted: () => void
}

/**
 * Start/stop recording with elapsed time, immediate in-session playback,
 * delete-and-retry, and participation-only encouragement. The microphone is
 * requested only when the child presses Record. Audio never leaves the
 * device and is never persisted.
 */
export function RecorderPanel({
  expectedText,
  slokaId,
  onAttempted,
}: RecorderPanelProps) {
  const { t } = useTranslation()
  const { state } = useAppState()
  const recorder = useRecorder()
  const [isPlayingBack, setIsPlayingBack] = useState(false)
  const [feedbackKey, setFeedbackKey] = useState<TranslationKey | null>(null)
  const playbackRef = useRef<HTMLAudioElement | null>(null)
  const attemptNotified = useRef(false)

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

  // Participation-only encouragement — never a pronunciation score.
  useEffect(() => {
    if (recorder.status === 'recorded' && recorder.recordingBlob) {
      getEvaluationService()
        .evaluate({
          recording: recorder.recordingBlob,
          slokaId: slokaId ?? null,
          referenceId: null,
          expectedText,
          language: 'sa-IN',
          ageBand: state.profile?.ageBand ?? '7-8',
          evaluationModes: [],
        })
        .then((result) => {
          // A scored result must never be rendered as a participation message.
          // Until a validated analyzer ships, this branch is unreachable.
          setFeedbackKey(
            isScoredEvaluation(result)
              ? null
              : (result.childMessageKey as TranslationKey),
          )
        })
        .catch(() => setFeedbackKey(null))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.status, recorder.recordingBlob])

  useEffect(() => {
    return () => {
      playbackRef.current?.pause()
      playbackRef.current = null
    }
  }, [])

  const playRecording = () => {
    if (!recorder.recordingUrl || isPlayingBack) return
    const audio = new Audio(recorder.recordingUrl)
    playbackRef.current = audio
    setIsPlayingBack(true)
    audio.onended = () => setIsPlayingBack(false)
    audio.onerror = () => setIsPlayingBack(false)
    audio.play().catch(() => setIsPlayingBack(false))
  }

  const stopPlayback = () => {
    playbackRef.current?.pause()
    playbackRef.current = null
    setIsPlayingBack(false)
  }

  const deleteAndRetry = () => {
    stopPlayback()
    setFeedbackKey(null)
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
            {t('recordedOk')} {feedbackKey ? t(feedbackKey) : ''}
          </p>
          <div className="flex flex-wrap gap-3">
            {isPlayingBack ? (
              <Button variant="secondary" onClick={stopPlayback}>
                <Square size={18} aria-hidden="true" />
                {t('stop')}
              </Button>
            ) : (
              <Button onClick={playRecording}>
                <Play size={20} aria-hidden="true" />
                {t('playRecording')}
              </Button>
            )}
            <Button variant="secondary" onClick={deleteAndRetry}>
              <Trash2 size={18} aria-hidden="true" />
              {t('deleteRecording')}
            </Button>
          </div>
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
