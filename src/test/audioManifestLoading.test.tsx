import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PlayLineControls } from '../components/audio/PlayLineControls'
import { clearAudioManifestCache } from '../services/audioManifest'
import type { AudioManifest } from '../types/audio'
import { renderWithProviders } from './testUtils'

describe('audio manifest loading', () => {
  it('waits for a deferred manifest so approved static audio keeps priority', async () => {
    clearAudioManifestCache()
    const user = userEvent.setup()
    const createdAudioUrls: string[] = []
    const speak = vi.fn()
    let resolveManifestRequest!: (response: Response) => void
    const manifestRequest = new Promise<Response>((resolve) => {
      resolveManifestRequest = resolve
    })

    class FakeAudio {
      playbackRate = 1
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      pause = vi.fn()
      removeAttribute = vi.fn()
      play = vi.fn(() => Promise.resolve())

      constructor(url: string) {
        createdAudioUrls.push(url)
      }
    }

    vi.stubGlobal('fetch', vi.fn(() => manifestRequest))
    vi.stubGlobal('Audio', FakeAudio)
    vi.stubGlobal('speechSynthesis', {
      cancel: vi.fn(),
      pause: vi.fn(),
      paused: false,
      resume: vi.fn(),
      speak,
      speaking: false,
    })

    const view = renderWithProviders(
      <PlayLineControls
        text="Saraswati Namastubhyam"
        audioQuery={{
          contentId: 'saraswati-namastubhyam',
          segmentId: 'line-1',
          purpose: 'canonical-chant',
          language: 'sa-IN',
        }}
      />,
    )

    try {
      const listenButton = screen.getByRole('button', { name: 'Listen' })
      expect(listenButton).toBeDisabled()

      await user.click(listenButton)
      expect(speak).not.toHaveBeenCalled()
      expect(createdAudioUrls).toHaveLength(0)

      const loadedManifest: AudioManifest = {
        schemaVersion: 1,
        generatedAt: null,
        assets: [
          {
            id: 'reviewed-saraswati-line-1',
            contentId: 'saraswati-namastubhyam',
            segmentId: 'line-1',
            purpose: 'canonical-chant',
            language: 'sa-IN',
            source: 'human',
            url: '/audio/slokas/saraswati/line-1.mp3',
            version: 1,
            reviewStatus: 'approved',
          },
        ],
      }
      await act(async () => {
        resolveManifestRequest({
          ok: true,
          json: async () => loadedManifest,
        } as Response)
      })

      await waitFor(() => expect(listenButton).toBeEnabled())
      await user.click(listenButton)

      expect(createdAudioUrls).toEqual([
        '/audio/slokas/saraswati/line-1.mp3',
      ])
      expect(speak).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      clearAudioManifestCache()
      vi.unstubAllGlobals()
    }
  })
})
