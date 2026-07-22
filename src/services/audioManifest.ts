import type {
  AudioAsset,
  AudioAssetQuery,
  AudioLanguage,
  AudioManifest,
  AudioPurpose,
  AudioReviewStatus,
  AudioSource,
  ResolvedAudio,
} from '../types/audio'

export const AUDIO_MANIFEST_URL = '/audio/manifest.json'

export const EMPTY_AUDIO_MANIFEST: AudioManifest = {
  schemaVersion: 1,
  generatedAt: null,
  assets: [],
}

const languages = new Set<AudioLanguage>([
  'en-IN',
  'hi-IN',
  'te-IN',
  'kn-IN',
  'ta-IN',
  'mr-IN',
  'sa-IN',
])
const sources = new Set<AudioSource>([
  'human',
  'sarvam',
  'suno',
  'google',
  'azure',
  'browser-fallback',
])
const reviewStatuses = new Set<AudioReviewStatus>([
  'draft',
  'needs-review',
  'approved',
  'rejected',
])
const purposes = new Set<AudioPurpose>([
  'canonical-chant',
  'slow-teaching',
  'melodic-learning',
  'instrumental-practice',
  'meaning-narration',
  'story-narration',
  'background-music',
  'reward-jingle',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSafeAudioUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/audio/') &&
    !value.includes('..') &&
    !value.includes('\\')
  )
}

function parseAsset(value: unknown, index: number, errors: string[]): AudioAsset | null {
  if (!isRecord(value)) {
    errors.push(`assets[${index}] must be an object`)
    return null
  }

  const requiredStrings = ['id', 'contentId', 'segmentId'] as const
  for (const field of requiredStrings) {
    if (typeof value[field] !== 'string' || value[field].trim() === '') {
      errors.push(`assets[${index}].${field} must be a non-empty string`)
      return null
    }
  }
  if (!purposes.has(value.purpose as AudioPurpose)) {
    errors.push(`assets[${index}].purpose is unsupported`)
    return null
  }
  if (!languages.has(value.language as AudioLanguage)) {
    errors.push(`assets[${index}].language is unsupported`)
    return null
  }
  if (!sources.has(value.source as AudioSource)) {
    errors.push(`assets[${index}].source is unsupported`)
    return null
  }
  if (!reviewStatuses.has(value.reviewStatus as AudioReviewStatus)) {
    errors.push(`assets[${index}].reviewStatus is unsupported`)
    return null
  }
  if (!isSafeAudioUrl(value.url)) {
    errors.push(`assets[${index}].url must be a safe /audio/ URL`)
    return null
  }
  if (value.slowUrl !== undefined && !isSafeAudioUrl(value.slowUrl)) {
    errors.push(`assets[${index}].slowUrl must be a safe /audio/ URL`)
    return null
  }
  if (!Number.isInteger(value.version) || (value.version as number) < 1) {
    errors.push(`assets[${index}].version must be a positive integer`)
    return null
  }

  return value as unknown as AudioAsset
}

export interface AudioManifestValidation {
  manifest: AudioManifest
  errors: string[]
  warnings: string[]
}

/** Rebuilds a safe manifest from unknown JSON; invalid entries are omitted. */
export function validateAudioManifest(value: unknown): AudioManifestValidation {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.assets)) {
    return {
      manifest: EMPTY_AUDIO_MANIFEST,
      errors: ['Manifest must have schemaVersion 1 and an assets array'],
      warnings,
    }
  }

  const assets = value.assets
    .map((asset, index) => parseAsset(asset, index, errors))
    .filter((asset): asset is AudioAsset => asset !== null)
  const ids = new Set<string>()
  for (const asset of assets) {
    if (ids.has(asset.id)) errors.push(`Duplicate audio asset id: ${asset.id}`)
    ids.add(asset.id)
    if (
      asset.reviewStatus === 'approved' &&
      asset.purpose === 'canonical-chant' &&
      asset.source !== 'human'
    ) {
      warnings.push(`Approved canonical chant is not human-recorded: ${asset.id}`)
    }
  }

  return {
    manifest: {
      schemaVersion: 1,
      generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : null,
      assets,
    },
    errors,
    warnings,
  }
}

const sourcePriority: Record<AudioSource, number> = {
  human: 600,
  sarvam: 500,
  google: 400,
  azure: 300,
  suno: 200,
  'browser-fallback': 0,
}

function isEligibleStaticAsset(asset: AudioAsset, query: AudioAssetQuery): boolean {
  if (
    asset.contentId !== query.contentId ||
    asset.segmentId !== query.segmentId ||
    asset.purpose !== query.purpose ||
    asset.language !== query.language ||
    asset.reviewStatus !== 'approved' ||
    asset.source === 'browser-fallback'
  ) {
    return false
  }
  // Suno is an offline creative tool, never the canonical teaching voice.
  if (
    asset.source === 'suno' &&
    (query.purpose === 'canonical-chant' || query.purpose === 'slow-teaching')
  ) {
    return false
  }
  return true
}

/**
 * Resolves reviewed static audio first. Human recordings outrank every
 * generated source; browser speech is returned only as an explicit fallback.
 */
export function resolveAudio(manifest: AudioManifest, query: AudioAssetQuery): ResolvedAudio {
  const selected = manifest.assets
    .filter((asset) => isEligibleStaticAsset(asset, query))
    .sort(
      (left, right) =>
        sourcePriority[right.source] - sourcePriority[left.source] ||
        right.version - left.version,
    )[0]

  if (selected) {
    const slowUrl = query.mode === 'slow' ? selected.slowUrl : undefined
    return {
      kind: 'static',
      asset: selected,
      url: slowUrl ?? selected.url,
      playbackRate: query.mode === 'slow' && !slowUrl ? 0.65 : 1,
    }
  }

  if (query.allowBrowserFallback === false) {
    return { kind: 'unavailable', reason: 'fallback-disabled' }
  }
  if (!query.fallbackText?.trim()) {
    return { kind: 'unavailable', reason: 'missing-fallback-text' }
  }
  return {
    kind: 'browser-fallback',
    text: query.fallbackText,
    language: query.language,
    playbackRate: query.mode === 'slow' ? 0.6 : 0.85,
  }
}

let manifestPromise: Promise<AudioManifest> | null = null

export function loadAudioManifest(): Promise<AudioManifest> {
  if (manifestPromise) return manifestPromise
  manifestPromise = fetch(AUDIO_MANIFEST_URL, { credentials: 'same-origin' })
    .then((response) => {
      if (!response.ok) throw new Error(`audio-manifest-http-${response.status}`)
      return response.json() as Promise<unknown>
    })
    .then((raw) => {
      const result = validateAudioManifest(raw)
      if (result.errors.length > 0) throw new Error(result.errors.join('; '))
      return result.manifest
    })
    .catch((error: unknown) => {
      if (import.meta.env.DEV) {
        console.warn('Sloka Steps: audio manifest unavailable; using safe fallbacks.', error)
      }
      return EMPTY_AUDIO_MANIFEST
    })
  return manifestPromise
}

/** Test/development seam for reloading an updated public manifest. */
export function clearAudioManifestCache(): void {
  manifestPromise = null
}
