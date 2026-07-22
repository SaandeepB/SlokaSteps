import type { SupportedLanguage } from './content'

/** BCP-47 languages used by reviewed audio assets and narration generation. */
export type AudioNarrationLanguage = SupportedLanguage

export type AudioLanguage = AudioNarrationLanguage | 'sa-IN'

export const AUDIO_NARRATION_LANGUAGES: AudioNarrationLanguage[] = [
  'en-IN',
  'hi-IN',
  'te-IN',
  'kn-IN',
  'ta-IN',
  'mr-IN',
]

export type AudioSource =
  | 'human'
  | 'sarvam'
  | 'suno'
  | 'google'
  | 'azure'
  | 'browser-fallback'

export type AudioReviewStatus = 'draft' | 'needs-review' | 'approved' | 'rejected'

export type AudioPurpose =
  | 'canonical-chant'
  | 'slow-teaching'
  | 'melodic-learning'
  | 'instrumental-practice'
  | 'meaning-narration'
  | 'story-narration'
  | 'background-music'
  | 'reward-jingle'

export interface AudioProviderMetadata {
  provider: Exclude<AudioSource, 'human' | 'browser-fallback'>
  model?: string
  requestId?: string
  generatedAt?: string
}

/**
 * One immutable, reviewable static asset. Generated files remain excluded
 * from learner playback until an editor changes `reviewStatus` to approved.
 */
export interface AudioAsset {
  id: string
  contentId: string
  segmentId: string
  purpose: AudioPurpose
  language: AudioLanguage
  source: AudioSource
  voiceId?: string
  url: string
  slowUrl?: string
  durationMs?: number
  /** SHA-256 of the audio file bytes. */
  checksum?: string
  /** SHA-256 of generation inputs, used by build-time cache checks. */
  inputChecksum?: string
  version: number
  reviewStatus: AudioReviewStatus
  providerMetadata?: AudioProviderMetadata
}

export interface AudioManifest {
  schemaVersion: 1
  generatedAt: string | null
  assets: AudioAsset[]
}

export interface AudioAssetQuery {
  contentId: string
  segmentId: string
  purpose: AudioPurpose
  language: AudioLanguage
  mode?: 'normal' | 'slow'
  fallbackText?: string
  allowBrowserFallback?: boolean
}

export type ResolvedAudio =
  | {
      kind: 'static'
      asset: AudioAsset
      url: string
      playbackRate: number
    }
  | {
      kind: 'browser-fallback'
      text: string
      language: AudioLanguage
      playbackRate: number
    }
  | {
      kind: 'unavailable'
      reason: 'missing-reviewed-asset' | 'fallback-disabled' | 'missing-fallback-text'
    }

/** Provider-neutral request used only by protected or build-time adapters. */
export interface TextToSpeechRequest {
  text: string
  language: AudioNarrationLanguage
  speaker?: string
  pace?: number
  pitch?: number
  outputFormat?: 'mp3' | 'wav'
  pronunciationDictionaryId?: string
}

/**
 * Uint8Array keeps the shared contract browser-safe. Node providers return a
 * Buffer, which is a Uint8Array subtype, without importing Node globals into
 * the frontend bundle.
 */
export interface GeneratedAudio {
  buffer: Uint8Array
  mimeType: string
  provider: string
  voiceId: string
  model?: string
  requestId?: string
}

export interface TextToSpeechProvider {
  readonly id: Exclude<AudioSource, 'human' | 'suno' | 'browser-fallback'>
  synthesize(request: TextToSpeechRequest): Promise<GeneratedAudio>
}
