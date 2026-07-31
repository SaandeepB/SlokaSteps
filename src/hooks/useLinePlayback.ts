import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getPlaybackForLine,
  pauseAllPlayback,
  resumeAllPlayback,
  stopAllPlayback,
} from '../services/audioPlayback'

export type PlaybackMode = 'normal' | 'slow'

export interface UseLinePlaybackResult {
  supported: boolean
  playing: PlaybackMode | null
  playbackFailed: boolean
  paused: boolean
  play: (
    text: string,
    mode?: PlaybackMode,
    audioUrl?: string,
    options?: { rate?: number; language?: string },
  ) => void
  stop: () => void
  pause: () => void
  resume: () => void
}

/**
 * Plays one utterance at a time: starting playback cancels any active one,
 * rapid re-clicks of the same button are ignored while starting, and playback
 * always cancels when the component unmounts or the route changes.
 */
export function useLinePlayback(audioUrl?: string): UseLinePlaybackResult {
  const [playing, setPlaying] = useState<PlaybackMode | null>(null)
  const [playbackFailed, setPlaybackFailed] = useState(false)
  const [paused, setPaused] = useState(false)
  const startingRef = useRef(false)
  const mountedRef = useRef(true)
  const operationRef = useRef(0)

  const supported = getPlaybackForLine(audioUrl).service.isSupported()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      operationRef.current += 1
      stopAllPlayback()
    }
  }, [])

  const play = useCallback(
    (
      text: string,
      mode: PlaybackMode = 'normal',
      audioUrl?: string,
      options?: { rate?: number; language?: string },
    ) => {
      if (startingRef.current) return
      // Each hook owns its UI state, but the browser has shared speech and
      // media channels. Stop both engines so separate controls cannot overlap.
      stopAllPlayback()
      const operation = operationRef.current + 1
      operationRef.current = operation
      startingRef.current = true
      setPlaybackFailed(false)
      setPaused(false)
      setPlaying(mode)

      const { service, usesUrl } = getPlaybackForLine(audioUrl)
      const payload = usesUrl && audioUrl ? audioUrl : text
      const rate = options?.rate ?? (usesUrl ? (mode === 'slow' ? 0.65 : 1) : mode === 'slow' ? 0.6 : 0.85)
      const language = options?.language ?? 'hi-IN'

      const start = async () => {
        try {
          await service.playText(payload, { rate, language })
        } catch (error) {
          // A missing/broken static asset degrades to the clearly labelled
          // browser voice; no lesson is allowed to crash or dead-end.
          const fallback = getPlaybackForLine().service
          if (!usesUrl || !fallback.isSupported()) throw error
          await fallback.playText(text, {
            rate: mode === 'slow' ? 0.6 : 0.85,
            language,
          })
        }
      }

      void start()
        .catch(() => {
          if (mountedRef.current && operationRef.current === operation) {
            setPlaybackFailed(true)
          }
        })
        .finally(() => {
          if (operationRef.current === operation) {
            startingRef.current = false
            if (mountedRef.current) setPlaying(null)
            if (mountedRef.current) setPaused(false)
          }
        })
    },
    [],
  )

  const stop = useCallback(() => {
    operationRef.current += 1
    startingRef.current = false
    stopAllPlayback()
    setPlaying(null)
    setPaused(false)
  }, [])

  const pause = useCallback(() => {
    if (playing === null || paused) return
    pauseAllPlayback()
    setPaused(true)
  }, [paused, playing])

  const resume = useCallback(() => {
    if (playing === null || !paused) return
    resumeAllPlayback()
    setPaused(false)
  }, [paused, playing])

  return { supported, playing, playbackFailed, paused, play, stop, pause, resume }
}
