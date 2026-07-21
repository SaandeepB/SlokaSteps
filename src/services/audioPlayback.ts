import type { AudioPlaybackService } from '../types'

/**
 * Prototype fallback voice using the browser SpeechSynthesis API.
 *
 * IMPORTANT: this is NOT an authoritative Sanskrit pronunciation model. It
 * exists so children can hear an approximate reading until reviewed,
 * professionally recorded audio is added (see PrerecordedAudioPlayback).
 */
class SpeechSynthesisPlayback implements AudioPlaybackService {
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
}

/**
 * Future implementation for reviewed, locally bundled recordings. When a
 * SlokaLine has an `audioUrl`, callers should prefer this service. Version 1
 * ships no audio assets, so this class is exercised only when content adds
 * them in a future update.
 */
export class PrerecordedAudioPlayback implements AudioPlaybackService {
  private current: HTMLAudioElement | null = null

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
      if (options?.rate) audio.playbackRate = options.rate
      audio.onended = () => resolve()
      audio.onerror = () => reject(new Error('audio-playback-failed'))
      audio.play().catch((error: unknown) => reject(error))
    })
  }

  stop(): void {
    if (this.current) {
      this.current.pause()
      this.current.src = ''
      this.current = null
    }
  }
}

const speechPlayback = new SpeechSynthesisPlayback()
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
