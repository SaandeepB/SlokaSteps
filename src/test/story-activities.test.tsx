import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StoryOrderingActivity } from '../components/story/StoryOrderingActivity'
import { StoryQuizActivity } from '../components/story/StoryQuizActivity'
import { draftLocalizedText as l } from '../content/stories'

describe('story activities', () => {
  it('supports button-based event ordering and never completes a wrong order', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const onIncorrectAttempt = vi.fn()

    render(
      <StoryOrderingActivity
        language="en-IN"
        activity={{
          id: 'order-test',
          type: 'event-ordering',
          instruction: l('Put these in order.'),
          events: [
            { id: 'first', order: 1, text: l('First event') },
            { id: 'second', order: 2, text: l('Second event') },
          ],
        }}
        onComplete={onComplete}
        onIncorrectAttempt={onIncorrectAttempt}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Check order' }))
    expect(onIncorrectAttempt).toHaveBeenCalledOnce()
    expect(onComplete).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', { name: /Move “First event” earlier/ }),
    )
    await user.click(screen.getByRole('button', { name: 'Check order' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('requires the correct quiz answer before continuing', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const onIncorrectAttempt = vi.fn()

    render(
      <StoryQuizActivity
        language="en-IN"
        questionNumber={1}
        questionCount={1}
        question={{
          id: 'question-test',
          prompt: l('Which answer is right?'),
          choices: [
            { id: 'right', text: l('Kind answer') },
            { id: 'wrong', text: l('Unkind answer') },
          ],
          correctChoiceId: 'right',
          explanation: l('Kindness is the answer.'),
        }}
        onComplete={onComplete}
        onIncorrectAttempt={onIncorrectAttempt}
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Unkind answer' }))
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(onIncorrectAttempt).toHaveBeenCalledOnce()
    expect(onComplete).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: 'Kind answer' }))
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
