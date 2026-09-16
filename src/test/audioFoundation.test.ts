import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLinePlayback } from '../hooks/useLinePlayback'
import { PrerecordedAudioPlayback } from '../services/audioPlayback'
import {
  AUDIO_MANIFEST_TIMEOUT_MS,
  EMPTY_AUDIO_MANIFEST,
  clearAudioManifestCache,
  loadAudioManifest,
  resolveAudio,
  validateAudioManifest,
} from '../services/audioManifest'
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

function manifestResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
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

  it('prefixes reviewed audio with a nested deployment base', () => {
    const reviewed = asset()
    const resolved = resolveAudio(
      manifest([reviewed]),
      {
        contentId: reviewed.contentId,
        segmentId: reviewed.segmentId,
        purpose: reviewed.purpose,
        language: reviewed.language,
        fallbackText: 'Saraswati Namastubhyam',
      },
      '/SlokaSteps/',
    )

    expect(resolved).toMatchObject({
      kind: 'static',
      url: '/SlokaSteps/audio/slokas/saraswati/line-1.mp3',
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

  it('loads valid assets when another manifest entry is invalid', async () => {
    clearAudioManifestCache()
    const valid = asset()
    const fetchMock = vi.fn().mockResolvedValue(
      manifestResponse({
        schemaVersion: 1,
        generatedAt: null,
        assets: [valid, { ...valid, id: 'unsafe', url: '../secret.mp3' }],
      }),
    )
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', fetchMock)

    try {
      await expect(loadAudioManifest()).resolves.toEqual(manifest([valid]))
      await expect(loadAudioManifest()).resolves.toEqual(manifest([valid]))
      expect(fetchMock).toHaveBeenCalledOnce()
    } finally {
      clearAudioManifestCache()
      vi.unstubAllGlobals()
      warning.mockRestore()
    }
  })

  it('times out a stalled request and retries on the next call', async () => {
    clearAudioManifestCache()
    vi.useFakeTimers()
    const valid = asset()
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => new Promise<Response>(() => {}))
      .mockResolvedValueOnce(
        manifestResponse({ schemaVersion: 1, generatedAt: null, assets: [valid] }),
      )
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', fetchMock)

    try {
      const stalledLoad = loadAudioManifest()
      await vi.advanceTimersByTimeAsync(AUDIO_MANIFEST_TIMEOUT_MS)
      await expect(stalledLoad).resolves.toBe(EMPTY_AUDIO_MANIFEST)
      await expect(loadAudioManifest()).resolves.toEqual(manifest([valid]))
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      clearAudioManifestCache()
      vi.useRealTimers()
      vi.unstubAllGlobals()
      warning.mockRestore()
    }
  })
})

describe('global playback coordination', () => {
  it('stops speech and prerecorded engines when another control starts', async () => {
    const cancel = vi.fn()
    const speak = vi.fn()
    const createdAudios: FakeAudio[] = []

    class FakeUtterance {
      lang = ''
      rate = 1
      onend: (() => void) | null = null
      onerror: ((event: { error: string }) => void) | null = null

      constructor(readonly text: string) {}
    }

    class FakeAudio {
      playbackRate = 1
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      pause = vi.fn()
      removeAttribute = vi.fn()
      play = vi.fn(() => new Promise<void>(() => {}))

      constructor(readonly url: string) {
        createdAudios.push(this)
      }
    }

    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.stubGlobal('speechSynthesis', {
      cancel,
      pause: vi.fn(),
      paused: false,
      resume: vi.fn(),
      speak,
      speaking: true,
    })
    vi.stubGlobal('Audio', FakeAudio)

    const firstSpeech = renderHook(() => useLinePlayback())
    const staticAudio = renderHook(() => useLinePlayback('/audio/reviewed.mp3'))
    const secondSpeech = renderHook(() => useLinePlayback())

    try {
      act(() => firstSpeech.result.current.play('first voice'))
      expect(speak).toHaveBeenCalledOnce()
      const cancelsAfterSpeechStart = cancel.mock.calls.length

      act(() =>
        staticAudio.result.current.play(
          'reviewed recording',
          'normal',
          '/audio/reviewed.mp3',
        ),
      )
      expect(cancel.mock.calls.length).toBeGreaterThan(cancelsAfterSpeechStart)
      expect(createdAudios).toHaveLength(1)

      await act(async () => {
        secondSpeech.result.current.play('second voice')
        await Promise.resolve()
      })
      expect(createdAudios[0].pause).toHaveBeenCalledOnce()
      expect(createdAudios[0].removeAttribute).toHaveBeenCalledWith('src')
    } finally {
      firstSpeech.unmount()
      staticAudio.unmount()
      secondSpeech.unmount()
      vi.unstubAllGlobals()
    }
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
