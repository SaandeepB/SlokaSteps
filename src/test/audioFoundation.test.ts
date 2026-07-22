import { afterEach, describe, expect, it, vi } from 'vitest'
import { PrerecordedAudioPlayback } from '../services/audioPlayback'
import { resolveAudio, validateAudioManifest } from '../services/audioManifest'
import type { AudioAsset, AudioManifest } from '../types/audio'

const originalAudio = window.Audio

afterEach(() => {
  Object.defineProperty(window, 'Audio', {
    configurable: true,
    writable: true,
    value: originalAudio,
  })
})

function asset(overrides: Partial<AudioAsset> = {}): AudioAsset {
  return {
    id: 'asset-default',
    contentId: 'saraswati-namastubhyam',
    segmentId: 'line-1',
    purpose: 'canonical-chant',
    language: 'sa-IN',
    source: 'human',
    url: '/audio/slokas/saraswati/line-1.mp3',
    version: 1,
    reviewStatus: 'approved',
    ...overrides,
  }
}

function manifest(assets: AudioAsset[]): AudioManifest {
  return { schemaVersion: 1, generatedAt: null, assets }
}

describe('V2 audio resolution', () => {
  it('prioritizes an approved human recording over generated static audio', () => {
    const generated = asset({
      id: 'sarvam',
      source: 'sarvam',
      url: '/audio/generated/line-1.mp3',
      version: 9,
    })
    const human = asset({ id: 'human', version: 1 })

    const resolved = resolveAudio(manifest([generated, human]), {
      contentId: human.contentId,
      segmentId: human.segmentId,
      purpose: human.purpose,
      language: human.language,
      fallbackText: 'Saraswati Namastubhyam',
    })

    expect(resolved.kind).toBe('static')
    if (resolved.kind === 'static') expect(resolved.asset.id).toBe('human')
  })

  it('uses approved static narration but excludes unreviewed assets', () => {
    const draftHuman = asset({
      id: 'draft-human',
      purpose: 'meaning-narration',
      language: 'te-IN',
      reviewStatus: 'needs-review',
    })
    const narration = asset({
      id: 'approved-sarvam',
      purpose: 'meaning-narration',
      language: 'te-IN',
      source: 'sarvam',
      url: '/audio/generated/meaning-te.mp3',
    })

    const resolved = resolveAudio(manifest([draftHuman, narration]), {
      contentId: narration.contentId,
      segmentId: narration.segmentId,
      purpose: 'meaning-narration',
      language: 'te-IN',
      fallbackText: 'అర్థం',
    })

    expect(resolved.kind).toBe('static')
    if (resolved.kind === 'static') expect(resolved.asset.id).toBe('approved-sarvam')
  })

  it('uses a dedicated slow URL without changing playback rate', () => {
    const reviewed = asset({ slowUrl: '/audio/slokas/saraswati/line-1-slow.mp3' })
    const resolved = resolveAudio(manifest([reviewed]), {
      contentId: reviewed.contentId,
      segmentId: reviewed.segmentId,
      purpose: reviewed.purpose,
      language: reviewed.language,
      mode: 'slow',
      fallbackText: 'Saraswati Namastubhyam',
    })

    expect(resolved).toMatchObject({
      kind: 'static',
      url: reviewed.slowUrl,
      playbackRate: 1,
    })
  })

  it('returns labelled browser fallback data when reviewed audio is missing', () => {
    const resolved = resolveAudio(manifest([]), {
      contentId: 'missing',
      segmentId: 'line-1',
      purpose: 'canonical-chant',
      language: 'sa-IN',
      mode: 'slow',
      fallbackText: 'Saraswati Namastubhyam',
    })

    expect(resolved).toEqual({
      kind: 'browser-fallback',
      text: 'Saraswati Namastubhyam',
      language: 'sa-IN',
      playbackRate: 0.6,
    })
  })

  it('fails gracefully when fallback is disabled', () => {
    expect(
      resolveAudio(manifest([]), {
        contentId: 'missing',
        segmentId: 'line-1',
        purpose: 'canonical-chant',
        language: 'sa-IN',
        fallbackText: 'text',
        allowBrowserFallback: false,
      }),
    ).toEqual({ kind: 'unavailable', reason: 'fallback-disabled' })
  })

  it('never treats Suno as canonical teaching audio', () => {
    const suno = asset({ id: 'suno', source: 'suno' })
    const resolved = resolveAudio(manifest([suno]), {
      contentId: suno.contentId,
      segmentId: suno.segmentId,
      purpose: 'canonical-chant',
      language: 'sa-IN',
      fallbackText: 'fallback',
    })
    expect(resolved.kind).toBe('browser-fallback')
  })
})

describe('audio manifest validation', () => {
  it('omits unsafe entries and reports duplicate IDs', () => {
    const valid = asset()
    const result = validateAudioManifest({
      schemaVersion: 1,
      generatedAt: null,
      assets: [valid, { ...valid }, { ...valid, id: 'unsafe', url: '../secret.mp3' }],
    })

    expect(result.manifest.assets).toHaveLength(2)
    expect(result.errors).toContain(`Duplicate audio asset id: ${valid.id}`)
    expect(result.errors.some((error) => error.includes('safe /audio/ URL'))).toBe(true)
  })
})

describe('prerecorded playback cancellation', () => {
  it('settles playback when stopped so replay cannot remain locked', async () => {
    const pause = vi.fn()
    const playMock = vi.fn(() => new Promise<void>(() => {}))
    const removeAttribute = vi.fn()
    class FakeAudio {
      playbackRate = 1
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      pause = pause
      removeAttribute = removeAttribute
      play = playMock
    }
    Object.defineProperty(window, 'Audio', {
      configurable: true,
      writable: true,
      value: FakeAudio,
    })

    const playback = new PrerecordedAudioPlayback()
    const pending = playback.playText('/audio/test.mp3')
    playback.pause()
    expect(pause).toHaveBeenCalledOnce()
    playback.resume()
    expect(playMock).toHaveBeenCalledTimes(2)
    playback.stop()

    await expect(pending).resolves.toBeUndefined()
    expect(pause).toHaveBeenCalledTimes(2)
    expect(removeAttribute).toHaveBeenCalledWith('src')
  })
})
