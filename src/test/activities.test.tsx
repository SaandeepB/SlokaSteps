import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FillBlankActivity } from '../components/lesson/FillBlankActivity'
import { MatchActivity } from '../components/lesson/MatchActivity'
import { ArrangeWordsActivity } from '../components/lesson/ArrangeWordsActivity'
import { renderWithProviders } from './testUtils'

describe('fill-in-the-blank activity', () => {
  const words = ['Saraswati', 'Namastubhyam', 'Varade', 'Kamarupini']

  function setup() {
    const onComplete = vi.fn()
    const onIncorrectAttempt = vi.fn()
    renderWithProviders(
      <FillBlankActivity
        words={words}
        blankIndex={1}
        distractors={['Karishyami', 'Sada']}
        onComplete={onComplete}
        onIncorrectAttempt={onIncorrectAttempt}
      />,
    )
    return { onComplete, onIncorrectAttempt }
  }

  it('does not reveal the correct answer before submission', () => {
    setup()
    const options = screen.getAllByTestId('fill-option')
    expect(options).toHaveLength(3)
    const classNames = new Set(options.map((option) => option.className))
    expect(classNames.size).toBe(1)
  })

  it('a wrong answer does not advance and records one attempt', async () => {
    const user = userEvent.setup()
    const { onComplete, onIncorrectAttempt } = setup()

    await user.click(screen.getByRole('radio', { name: 'Sada' }))
    await user.click(screen.getByRole('button', { name: 'Check Answer' }))

    expect(onIncorrectAttempt).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: 'Continue' }),
    ).not.toBeInTheDocument()

    // Repeated clicking cannot record duplicate attempts: the selection was
    // cleared, so Check Answer is disabled until a new choice is made.
    expect(screen.getByRole('button', { name: 'Check Answer' })).toBeDisabled()
  })

  it('the correct answer advances after Check Answer', async () => {
    const user = userEvent.setup()
    const { onComplete, onIncorrectAttempt } = setup()

    await user.click(screen.getByRole('radio', { name: 'Namastubhyam' }))
    await user.click(screen.getByRole('button', { name: 'Check Answer' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onIncorrectAttempt).not.toHaveBeenCalled()
  })
})

describe('matching activity', () => {
  const items = [
    { id: 'p1', phrase: 'Phrase One', meaning: 'Meaning One' },
    { id: 'p2', phrase: 'Phrase Two', meaning: 'Meaning Two' },
  ]

  function setup() {
    const onComplete = vi.fn()
    const onIncorrectAttempt = vi.fn()
    renderWithProviders(
      <MatchActivity
        items={items}
        onComplete={onComplete}
        onIncorrectAttempt={onIncorrectAttempt}
      />,
    )
    return { onComplete, onIncorrectAttempt }
  }

  it('an incorrect pair does not advance and resets gently', async () => {
    const user = userEvent.setup()
    const { onComplete, onIncorrectAttempt } = setup()

    await user.click(screen.getByRole('button', { name: /Phrase One/ }))
    await user.click(screen.getByRole('button', { name: /Meaning Two/ }))

    expect(onIncorrectAttempt).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    expect(screen.queryByText('Matched')).not.toBeInTheDocument()
  })

  it('matching every pair enables Continue and advances', async () => {
    const user = userEvent.setup()
    const { onComplete } = setup()

    await user.click(screen.getByRole('button', { name: /Phrase One/ }))
    await user.click(screen.getByRole('button', { name: /Meaning One/ }))
    await user.click(screen.getByRole('button', { name: /Phrase Two/ }))
    await user.click(screen.getByRole('button', { name: /Meaning Two/ }))

    expect(screen.getAllByText('Matched')).toHaveLength(2)
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    expect(continueButton).toBeEnabled()
    await user.click(continueButton)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})

describe('arrange-words activity', () => {
  const words = ['Vidyarambham', 'Karishyami', 'Siddhir']

  function setup() {
    const onComplete = vi.fn()
    const onIncorrectAttempt = vi.fn()
    renderWithProviders(
      <ArrangeWordsActivity
        words={words}
        onComplete={onComplete}
        onIncorrectAttempt={onIncorrectAttempt}
      />,
    )
    return { onComplete, onIncorrectAttempt }
  }

  it('a wrong order does not advance and records one attempt', async () => {
    const user = userEvent.setup()
    const { onComplete, onIncorrectAttempt } = setup()

    // Build a deliberately wrong order.
    await user.click(screen.getByRole('button', { name: 'Add Siddhir' }))
    await user.click(screen.getByRole('button', { name: 'Add Karishyami' }))
    await user.click(screen.getByRole('button', { name: 'Add Vidyarambham' }))
    await user.click(screen.getByRole('button', { name: 'Check Answer' }))

    expect(onIncorrectAttempt).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('the correct order advances', async () => {
    const user = userEvent.setup()
    const { onComplete } = setup()

    for (const word of words) {
      await user.click(screen.getByRole('button', { name: `Add ${word}` }))
    }
    await user.click(screen.getByRole('button', { name: 'Check Answer' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('chips can be removed and cleared before checking', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Add Siddhir' }))
    await user.click(screen.getByRole('button', { name: 'Remove Siddhir' }))
    expect(screen.getByRole('button', { name: 'Add Siddhir' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add Karishyami' }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(
      screen.getByRole('button', { name: 'Add Karishyami' }),
    ).toBeInTheDocument()
  })
})
