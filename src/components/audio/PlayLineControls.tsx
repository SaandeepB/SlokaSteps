import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, RotateCcw, Square, Turtle } from 'lucide-react'
import { Button } from '../common/Button'
import { useLinePlayback } from '../../hooks/useLinePlayback'
import { useTranslation } from '../../hooks/useTranslation'
import {
  EMPTY_AUDIO_MANIFEST,
  loadAudioManifest,
  resolveAudio,
} from '../../services/audioManifest'
import type { AudioAssetQuery, AudioLanguage, AudioManifest } from '../../types/audio'

export interface PlayLineControlsProps {
  /** Text handed to the prototype practice voice. */
  text: string
  /** Reviewed local audio asset, when one exists (none ship in Version 1). */
  audioUrl?: string
  /** Stable manifest lookup. Reviewed assets resolve before browser speech. */
  audioQuery?: Omit<AudioAssetQuery, 'mode' | 'fallbackText'>
  /** Language used by the visibly labelled browser fallback. */
  language?: AudioLanguage
  /** Label for the main play button; defaults to "Listen". */
  playLabelKey?: 'listen' | 'listenFull'
  onPlaybackStateChange?: (state: 'idle' | 'playing' | 'paused') => void
}

/**
 * Listen / replay / play-slowly / stop controls. Only one utterance plays at
 * a time, playback cancels on unmount, and an unsupported browser shows a
 * friendly fallback while still letting the child continue.
 */
export function PlayLineControls({
  text,
  audioUrl,
  audioQuery,
  language = 'sa-IN',
  playLabelKey = 'listen',
  onPlaybackStateChange,
}: PlayLineControlsProps) {
  const { t } = useTranslation()
  const [manifest, setManifest] = useState<AudioManifest>(EMPTY_AUDIO_MANIFEST)
  const [manifestLoadState, setManifestLoadState] = useState<
    'not-requested' | 'loading' | 'ready'
  >(audioQuery ? 'loading' : 'not-requested')
  const [hasPlayed, setHasPlayed] = useState(false)
  const shouldLoadManifest = audioQuery !== undefined
  const isManifestLoading =
    shouldLoadManifest && manifestLoadState !== 'ready'

  useEffect(() => {
    if (!shouldLoadManifest) return
    let active = true
    void loadAudioManifest()
      // loadAudioManifest currently resolves to an empty manifest on failure;
      // keep this defensive fallback so a future loader cannot strand controls.
      .catch(() => EMPTY_AUDIO_MANIFEST)
      .then((loaded) => {
        if (!active) return
        setManifest(loaded)
        setManifestLoadState('ready')
      })
    return () => {
      active = false
    }
  }, [shouldLoadManifest])

  const normalResolution = useMemo(
    () =>
      audioQuery
        ? resolveAudio(manifest, {
            ...audioQuery,
            mode: 'normal',
            fallbackText: text,
          })
        : null,
    [audioQuery, manifest, text],
  )
  const reviewedUrl = normalResolution?.kind === 'static' ? normalResolution.url : audioUrl
  const {
    supported,
    playing,
    playbackFailed,
    paused,
    play,
    stop,
    pause,
    resume,
  } = useLinePlayback(reviewedUrl)
  const isUnavailable =
    normalResolution?.kind === 'unavailable' && typeof audioUrl !== 'string'

  useEffect(() => {
    onPlaybackStateChange?.(
      playing === null ? 'idle' : paused ? 'paused' : 'playing',
    )
  }, [onPlaybackStateChange, paused, playing])

  if (!isManifestLoading && (!supported || isUnavailable)) {
    return (
      <p role="status" className="rounded-xl bg-sky-100 p-3 text-ink-700">
        {t('speechUnavailable')}
      </p>
    )
  }

  const startPlayback = (mode: 'normal' | 'slow') => {
    if (isManifestLoading) return
    const resolution = audioQuery
      ? resolveAudio(manifest, { ...audioQuery, mode, fallbackText: text })
      : null
    if (resolution?.kind === 'unavailable' && !audioUrl) return

    setHasPlayed(true)
    if (resolution?.kind === 'static') {
      play(text, mode, resolution.url, {
        language: audioQuery?.language ?? language,
        rate: resolution.playbackRate,
      })
      return
    }
    play(text, mode, audioUrl, {
      language: resolution?.kind === 'browser-fallback' ? resolution.language : language,
      rate:
        resolution?.kind === 'browser-fallback'
          ? resolution.playbackRate
          : undefined,
    })
  }

  return (
    <div className="flex flex-col gap-2" aria-busy={isManifestLoading}>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          onClick={() => startPlayback('normal')}
          disabled={isManifestLoading || playing !== null}
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
          disabled={isManifestLoading || playing !== null}
        >
          <Turtle size={20} aria-hidden="true" />
          {t('slowPlay')}
        </Button>
        {playing !== null && (
          <>
            <Button variant="secondary" onClick={paused ? resume : pause}>
              {paused ? (
                <Play size={18} aria-hidden="true" />
              ) : (
                <Pause size={18} aria-hidden="true" />
              )}
              {t(paused ? 'resumeAudio' : 'pauseAudio')}
            </Button>
            <Button variant="secondary" onClick={stop}>
              <Square size={18} aria-hidden="true" />
              {t('stop')}
            </Button>
          </>
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
