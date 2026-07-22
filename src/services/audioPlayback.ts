import type { AudioPlaybackService } from '../types'

/**
 * Prototype fallback voice using the browser SpeechSynthesis API.
 *
 * IMPORTANT: this is NOT an authoritative Sanskrit pronunciation model. It
 * exists so children can hear an approximate reading until reviewed,
 * professionally recorded audio is added (see PrerecordedAudioPlayback).
 */
export class BrowserSpeechFallback implements AudioPlaybackService {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  playText(text: string, options?: { rate?: number; language?: string }): Promise<void> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('speech-synthesis-unsupported'))
    }
    // Cancel anything already speaking so utterances never overlap.
    window.speechSynthesis.cancel()

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      // hi-IN is the closest widely available voice for Devanagari-based text.
      utterance.lang = options?.language ?? 'hi-IN'
      utterance.rate = options?.rate ?? 0.85
      utterance.onend = () => resolve()
      utterance.onerror = (event) => {
        // Cancellation (navigation, replay) is expected, not a failure.
        if (event.error === 'canceled' || event.error === 'interrupted') {
          resolve()
        } else {
          reject(new Error(`speech-synthesis-error:${event.error}`))
        }
      }
      window.speechSynthesis.speak(utterance)
    })
  }

  stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel()
    }
  }

  pause(): void {
    if (this.isSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
    }
  }

  resume(): void {
    if (this.isSupported() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }
  }
}

/**
 * Future implementation for reviewed, locally bundled recordings. When a
 * SlokaLine has an `audioUrl`, callers should prefer this service. Version 1
 * ships no audio assets, so this class is exercised only when content adds
 * them in a future update.
 */
export class PrerecordedAudioPlayback implements AudioPlaybackService {
  private current: HTMLAudioElement | null = null
  private finishCurrent: (() => void) | null = null

  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.Audio === 'function'
  }

  playText(url: string, options?: { rate?: number }): Promise<void> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('audio-unsupported'))
    }
    this.stop()
    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      this.current = audio
      let settled = false
      const settle = (error?: Error) => {
        if (settled) return
        settled = true
        audio.onended = null
        audio.onerror = null
        if (this.current === audio) {
          this.current = null
          this.finishCurrent = null
        }
        if (error) reject(error)
        else resolve()
      }
      this.finishCurrent = () => settle()
      if (options?.rate) audio.playbackRate = options.rate
      audio.onended = () => settle()
      audio.onerror = () => settle(new Error('audio-playback-failed'))
      audio.play().catch((error: unknown) =>
        settle(error instanceof Error ? error : new Error('audio-playback-failed')),
      )
    })
  }

  stop(): void {
    const audio = this.current
    const finish = this.finishCurrent
    this.current = null
    this.finishCurrent = null
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
    }
    // Cancellation is expected and must settle the caller's Promise.
    finish?.()
  }

  pause(): void {
    this.current?.pause()
  }

  resume(): void {
    void this.current?.play().catch(() => {
      this.finishCurrent?.()
    })
  }
}

const speechPlayback = new BrowserSpeechFallback()
const prerecordedPlayback = new PrerecordedAudioPlayback()

/**
 * Returns the service to use for a line: reviewed prerecorded audio when an
 * asset exists, otherwise the speech-synthesis prototype fallback.
 */
export function getPlaybackForLine(audioUrl?: string): {
  service: AudioPlaybackService
  /** What to pass to playText: the URL for recordings, text for synthesis. */
  usesUrl: boolean
} {
  if (audioUrl && prerecordedPlayback.isSupported()) {
    return { service: prerecordedPlayback, usesUrl: true }
  }
  return { service: speechPlayback, usesUrl: false }
}

export function getSpeechPlayback(): AudioPlaybackService {
  return speechPlayback
}

/** Stops any active playback from every playback service. */
export function stopAllPlayback(): void {
  speechPlayback.stop()
  prerecordedPlayback.stop()
}

export function pauseAllPlayback(): void {
  speechPlayback.pause()
  prerecordedPlayback.pause()
}

export function resumeAllPlayback(): void {
  speechPlayback.resume()
  prerecordedPlayback.resume()
}
