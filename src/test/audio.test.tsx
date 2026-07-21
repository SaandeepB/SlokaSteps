import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListenActivity } from '../components/lesson/ListenActivity'
import { RepeatActivity } from '../components/lesson/RepeatActivity'
import { FullChantActivity } from '../components/lesson/FullChantActivity'
import { createObjectUrlManager } from '../utils/objectUrl'
import { en } from '../content/translations/en'
import { renderWithProviders } from './testUtils'

const line = {
  id: 'l1',
  devanagari: 'सरस्वति नमस्तुभ्यं',
  transliteration: 'Saraswati Namastubhyam',
}

// jsdom has neither speechSynthesis nor MediaRecorder, which is exactly the
// unsupported-browser environment these behaviors must survive.
describe('speech synthesis unsupported', () => {
  it('shows the friendly fallback and still allows continuing', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    renderWithProviders(<ListenActivity line={line} onContinue={onContinue} />)

    expect(screen.getByText(en.strings.speechUnavailable)).toBeInTheDocument()
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    expect(continueButton).toBeEnabled()
    await user.click(continueButton)
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})

describe('recording unsupported', () => {
  it('repeat activity shows the message and unlocks Continue', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    const onRecordingAttempted = vi.fn()
    renderWithProviders(
      <RepeatActivity
        line={line}
        onContinue={onContinue}
        onRecordingAttempted={onRecordingAttempted}
      />,
    )

    expect(screen.getByText(en.strings.micUnsupported)).toBeInTheDocument()
    const continueButton = await screen.findByRole('button', { name: 'Continue' })
    expect(continueButton).toBeEnabled()
    await user.click(continueButton)
    expect(onContinue).toHaveBeenCalledTimes(1)
    expect(onRecordingAttempted).toHaveBeenCalled()
  })

  it('full chant still allows finishing the lesson', async () => {
    const user = userEvent.setup()
    const onFinish = vi.fn()
    renderWithProviders(
      <FullChantActivity
        lines={[line]}
        onFinish={onFinish}
        onRecordingAttempted={() => {}}
      />,
    )

    const finishButton = await screen.findByRole('button', {
      name: 'Finish Lesson',
    })
    expect(finishButton).toBeEnabled()
    await user.click(finishButton)
    expect(onFinish).toHaveBeenCalledTimes(1)
  })
})

describe('temporary recording URLs', () => {
  it('revokes the previous object URL when replaced or released', () => {
    // jsdom does not implement object URLs; install simple stubs.
    let counter = 0
    const createMock = vi.fn(() => `blob:mock-${counter++}`)
    const revokeMock = vi.fn()
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = createMock as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeMock as typeof URL.revokeObjectURL

    try {
      const manager = createObjectUrlManager()
      const first = manager.set(new Blob(['a']))
      manager.set(new Blob(['b']))
      expect(revokeMock).toHaveBeenCalledWith(first)

      const second = manager.get()
      manager.revoke()
      expect(revokeMock).toHaveBeenCalledWith(second)
      expect(manager.get()).toBeNull()
    } finally {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
    }
  })
})
