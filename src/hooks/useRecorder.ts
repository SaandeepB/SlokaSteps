import { useCallback, useEffect, useRef, useState } from 'react'
import { createObjectUrlManager } from '../utils/objectUrl'

export type RecorderStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'recorded'
  | 'error'

export type RecorderErrorKind =
  | 'unsupported'
  | 'permission-denied'
  | 'no-microphone'
  | 'failed'

export interface UseRecorderResult {
  supported: boolean
  status: RecorderStatus
  errorKind: RecorderErrorKind | null
  elapsedSeconds: number
  /** Session-only object URL for immediate playback; never persisted. */
  recordingUrl: string | null
  recordingBlob: Blob | null
  start: () => void
  stop: () => void
  reset: () => void
}

const MAX_RECORDING_SECONDS = 90

function isRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder === 'function'
  )
}

/**
 * In-memory, session-only recording. Audio blobs are never uploaded or
 * persisted; the microphone is requested only when start() is called from an
 * explicit user action, and its tracks stop as soon as recording ends.
 */
export function useRecorder(): UseRecorderResult {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [errorKind, setErrorKind] = useState<RecorderErrorKind | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)

  const supported = isRecordingSupported()
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const urlManagerRef = useRef(createObjectUrlManager())
  const mountedRef = useRef(true)
  const requestGenerationRef = useRef(0)

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const urlManager = urlManagerRef.current
    return () => {
      mountedRef.current = false
      requestGenerationRef.current += 1
      stopTimer()
      try {
        if (recorderRef.current) {
          recorderRef.current.onstop = null
          recorderRef.current.ondataavailable = null
          recorderRef.current.onerror = null
          recorderRef.current.stop()
        }
      } catch {
        // Recorder already inactive — nothing to stop.
      }
      releaseStream()
      urlManager.revoke()
    }
  }, [stopTimer, releaseStream])

  const fail = useCallback(
    (kind: RecorderErrorKind) => {
      stopTimer()
      releaseStream()
      if (mountedRef.current) {
        setStatus('error')
        setErrorKind(kind)
      }
    },
    [stopTimer, releaseStream],
  )

  const start = useCallback(() => {
    if (!supported) {
      fail('unsupported')
      return
    }
    if (status === 'recording' || status === 'requesting') return

    setStatus('requesting')
    setErrorKind(null)
    const requestGeneration = requestGenerationRef.current + 1
    requestGenerationRef.current = requestGeneration
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (
          !mountedRef.current ||
          requestGeneration !== requestGenerationRef.current
        ) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        chunksRef.current = []
        const recorder = new MediaRecorder(stream)
        recorderRef.current = recorder

        recorder.ondataavailable = (event) => {
          if (mountedRef.current && event.data && event.data.size > 0) {
            chunksRef.current.push(event.data)
          }
        }
        recorder.onerror = () => fail('failed')
        recorder.onstop = () => {
          stopTimer()
          releaseStream()
          if (!mountedRef.current) return
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          })
          if (blob.size === 0) {
            fail('failed')
            return
          }
          setRecordingBlob(blob)
          setRecordingUrl(urlManagerRef.current.set(blob))
          setStatus('recorded')
        }

        recorder.start()
        setElapsedSeconds(0)
        setStatus('recording')
        timerRef.current = window.setInterval(() => {
          setElapsedSeconds((seconds) => {
            if (seconds + 1 >= MAX_RECORDING_SECONDS) {
              try {
                recorderRef.current?.stop()
              } catch {
                // Already stopped.
              }
            }
            return seconds + 1
          })
        }, 1000)
      })
      .catch((error: unknown) => {
        if (
          !mountedRef.current ||
          requestGeneration !== requestGenerationRef.current
        ) {
          return
        }
        const name = error instanceof DOMException ? error.name : ''
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          fail('permission-denied')
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          fail('no-microphone')
        } else {
          fail('failed')
        }
      })
  }, [supported, status, fail, stopTimer, releaseStream])

  const stop = useCallback(() => {
    if (status !== 'recording') return
    try {
      recorderRef.current?.stop()
    } catch {
      fail('failed')
    }
  }, [status, fail])

  const reset = useCallback(() => {
    requestGenerationRef.current += 1
    stopTimer()
    releaseStream()
    urlManagerRef.current.revoke()
    setRecordingUrl(null)
    setRecordingBlob(null)
    setElapsedSeconds(0)
    setErrorKind(null)
    setStatus('idle')
  }, [stopTimer, releaseStream])

  return {
    supported,
    status,
    errorKind,
    elapsedSeconds,
    recordingUrl,
    recordingBlob,
    start,
    stop,
    reset,
  }
}
