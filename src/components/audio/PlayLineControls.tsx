import { useState } from 'react'
import { Play, RotateCcw, Square, Turtle } from 'lucide-react'
import { Button } from '../common/Button'
import { useLinePlayback } from '../../hooks/useLinePlayback'
import { useTranslation } from '../../hooks/useTranslation'

export interface PlayLineControlsProps {
  /** Text handed to the prototype practice voice. */
  text: string
  /** Reviewed local audio asset, when one exists (none ship in Version 1). */
  audioUrl?: string
  /** Label for the main play button; defaults to "Listen". */
  playLabelKey?: 'listen' | 'listenFull'
}

/**
 * Listen / replay / play-slowly / stop controls. Only one utterance plays at
 * a time, playback cancels on unmount, and an unsupported browser shows a
 * friendly fallback while still letting the child continue.
 */
export function PlayLineControls({
  text,
  audioUrl,
  playLabelKey = 'listen',
}: PlayLineControlsProps) {
  const { t } = useTranslation()
  const { supported, playing, playbackFailed, play, stop } = useLinePlayback()
  const [hasPlayed, setHasPlayed] = useState(false)

  if (!supported) {
    return (
      <p role="status" className="rounded-xl bg-sky-100 p-3 text-ink-700">
        {t('speechUnavailable')}
      </p>
    )
  }

  const startPlayback = (mode: 'normal' | 'slow') => {
    setHasPlayed(true)
    play(text, mode, audioUrl)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          onClick={() => startPlayback('normal')}
          disabled={playing !== null}
        >
          {hasPlayed ? (
            <RotateCcw size={22} aria-hidden="true" />
          ) : (
            <Play size={22} aria-hidden="true" />
          )}
          {t(hasPlayed ? 'replay' : playLabelKey)}
        </Button>
        <Button
          variant="secondary"
          onClick={() => startPlayback('slow')}
          disabled={playing !== null}
        >
          <Turtle size={20} aria-hidden="true" />
          {t('slowPlay')}
        </Button>
        {playing !== null && (
          <Button variant="secondary" onClick={stop}>
            <Square size={18} aria-hidden="true" />
            {t('stop')}
          </Button>
        )}
      </div>
      {playbackFailed && (
        <p role="status" className="rounded-xl bg-sky-100 p-3 text-sm text-ink-700">
          {t('playbackError')}
        </p>
      )}
      <p className="text-xs text-ink-500">{t('voiceNote')}</p>
    </div>
  )
}
