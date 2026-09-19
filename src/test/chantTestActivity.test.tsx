import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppStateProvider } from '../context/AppStateProvider'
import { makeStateWithProfile } from './testUtils'
import type { AppState } from '../types'
import { FullChantActivity } from '../components/lesson/FullChantActivity'
import {
  InMemoryChantReferenceStore,
  setChantReferenceStore,
  type StoredChantReference,
} from '../services/chantAnalysis/chantReferenceStore'
import * as grading from '../services/chantAnalysis/chantGrading'
import type { UseRecorderResult } from '../hooks/useRecorder'
import type { SlokaLine } from '../types'

// Controllable fake recorder shared with the component under test.
const recorderState: { current: UseRecorderResult } = {
  current: {
    supported: true,
    status: 'idle',
    errorKind: null,
    elapsedSeconds: 0,
    recordingUrl: null,
    recordingBlob: null,
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  },
}
vi.mock('../hooks/useRecorder', () => ({
  useRecorder: () => recorderState.current,
}))

const lines: SlokaLine[] = [
  { id: 'l1', devanagari: 'अ', transliteration: 'A' },
  { id: 'l2', devanagari: 'इ', transliteration: 'I' },
]

function setRecorded() {
  recorderState.current = {
    ...recorderState.current,
    status: 'recorded',
    recordingBlob: new Blob(['audio'], { type: 'audio/webm' }),
    recordingUrl: 'blob:mock',
  }
}

function reference(): StoredChantReference {
  return {
    slokaId: 'test-sloka',
    samples: new Float32Array(16000),
    sampleRate: 16000,
    durationMs: 3000,
    createdAt: '2026-09-18T00:00:00Z',
  }
}

/** Render with a stable provider wrapper so rerender keeps the context. */
function renderChant(onFinish: () => void, state: AppState) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AppStateProvider initialState={state}>
      <MemoryRouter>{children}</MemoryRouter>
    </AppStateProvider>
  )
  return render(
    <FullChantActivity
      lines={lines}
      slokaId="test-sloka"
      onFinish={onFinish}
      onRecordingAttempted={vi.fn()}
    />,
    { wrapper: Wrapper },
  )
}

describe('FullChantActivity — the gated Chant Test', () => {
  beforeEach(() => {
    recorderState.current = {
      supported: true,
      status: 'idle',
      errorKind: null,
      elapsedSeconds: 0,
      recordingUrl: null,
      recordingBlob: null,
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
    }
    setChantReferenceStore(new InMemoryChantReferenceStore())
  })
  afterEach(() => {
    setChantReferenceStore(null)
    vi.restoreAllMocks()
  })

  it('finishes without grading when the microphone is off', async () => {
    const base = makeStateWithProfile()
    const state: AppState = {
      ...base,
      preferences: {
        ...base.preferences,
        voicePrivacy: { ...base.preferences.voicePrivacy, allowMicrophone: false },
      },
    }
    const onFinish = vi.fn()
    renderChant(onFinish, state)
    expect(screen.getByText(/not graded/i)).toBeInTheDocument()
    const finish = await screen.findByRole('button', { name: /finish lesson/i })
    expect(finish).toBeEnabled()
    await userEvent.click(finish)
    expect(onFinish).toHaveBeenCalledWith(undefined)
  })

  it('gates finishing until a graded attempt passes', async () => {
    const store = new InMemoryChantReferenceStore()
    await store.set(reference())
    setChantReferenceStore(store)
    const gradeSpy = vi.spyOn(grading, 'gradeChantAttempt').mockResolvedValue({
      status: 'graded',
      result: { similarity: 0.5, scorePercent: 50, grade: 'keep-practising', passed: false },
      durationMs: 3000,
    })
    const onFinish = vi.fn()

    const { rerender } = renderChant(onFinish, makeStateWithProfile())
    // Reference loads asynchronously; wait for the test-mode copy.
    await screen.findByText(/take the test/i)
    expect(screen.getByRole('button', { name: /finish lesson/i })).toBeDisabled()

    // A failing attempt keeps finishing gated.
    setRecorded()
    rerender(
      <FullChantActivity
        lines={lines}
        slokaId="test-sloka"
        onFinish={onFinish}
        onRecordingAttempted={vi.fn()}
      />,
    )
    await screen.findByText(/not quite yet/i)
    expect(screen.getByRole('button', { name: /finish lesson/i })).toBeDisabled()
    expect(gradeSpy).toHaveBeenCalledTimes(1)
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('prompts to record a reference when none exists yet', async () => {
    renderChant(vi.fn(), makeStateWithProfile())
    await screen.findByText(/record your reference chant/i)
    // With a workable mic and no reference/pass yet, finishing is gated.
    expect(screen.getByRole('button', { name: /finish lesson/i })).toBeDisabled()
  })
})
