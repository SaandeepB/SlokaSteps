import { useCallback, useEffect, useRef, useState } from 'react'
import { getPlaybackForLine, stopAllPlayback } from '../services/audioPlayback'

export type PlaybackMode = 'normal' | 'slow'

export interface UseLinePlaybackResult {
  supported: boolean
  playing: PlaybackMode | null
  playbackFailed: boolean
  play: (text: string, mode?: PlaybackMode, audioUrl?: string) => void
  stop: () => void
}

/**
 * Plays one utterance at a time: starting playback cancels any active one,
 * rapid re-clicks of the same button are ignored while starting, and playback
 * always cancels when the component unmounts or the route changes.
 */
export function useLinePlayback(): UseLinePlaybackResult {
  const [playing, setPlaying] = useState<PlaybackMode | null>(null)
  const [playbackFailed, setPlaybackFailed] = useState(false)
  const startingRef = useRef(false)
  const mountedRef = useRef(true)

  const supported = getPlaybackForLine().service.isSupported()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopAllPlayback()
    }
  }, [])

  const play = useCallback(
    (text: string, mode: PlaybackMode = 'normal', audioUrl?: string) => {
      if (startingRef.current) return
      startingRef.current = true
      setPlaybackFailed(false)
      setPlaying(mode)

      const { service, usesUrl } = getPlaybackForLine(audioUrl)
      const payload = usesUrl && audioUrl ? audioUrl : text
      const rate = mode === 'slow' ? 0.6 : 0.85

      service
        .playText(payload, { rate, language: 'hi-IN' })
        .catch(() => {
          if (mountedRef.current) setPlaybackFailed(true)
        })
        .finally(() => {
          startingRef.current = false
          if (mountedRef.current) setPlaying(null)
        })
    },
    [],
  )

  const stop = useCallback(() => {
    stopAllPlayback()
    setPlaying(null)
  }, [])

  return { supported, playing, playbackFailed, play, stop }
}
