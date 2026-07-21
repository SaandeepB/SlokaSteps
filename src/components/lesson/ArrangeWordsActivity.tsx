import { useState } from 'react'
import { Button } from '../common/Button'
import { useTranslation } from '../../hooks/useTranslation'
import { shuffleAvoidingOriginal } from '../../utils/shuffle'

export interface ArrangeWordsActivityProps {
  /** The words in their correct order. */
  words: string[]
  onComplete: () => void
  onIncorrectAttempt: () => void
}

interface Chip {
  /** Unique per chip — duplicate words in a line stay distinguishable. */
  chipId: number
  word: string
}

/**
 * Clickable word chips (no drag-and-drop): tap chips to build the answer,
 * tap an answer chip to return it, clear to start over. The correct order is
 * never revealed before submission and wrong sequences never advance.
 */
export function ArrangeWordsActivity({
  words,
  onComplete,
  onIncorrectAttempt,
}: ArrangeWordsActivityProps) {
  const { t } = useTranslation()
  const [bank] = useState<Chip[]>(() =>
    shuffleAvoidingOriginal(words).map((word, index) => ({ chipId: index, word })),
  )
  const [answer, setAnswer] = useState<Chip[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)

  const solved = feedback === 'correct'
  const remaining = bank.filter(
    (chip) => !answer.some((placed) => placed.chipId === chip.chipId),
  )

  const addChip = (chip: Chip) => {
    if (solved) return
    setAnswer([...answer, chip])
    setFeedback(null)
  }

  const removeChip = (chip: Chip) => {
    if (solved) return
    setAnswer(answer.filter((placed) => placed.chipId !== chip.chipId))
    setFeedback(null)
  }

  const clearAnswer = () => {
    if (solved) return
    setAnswer([])
    setFeedback(null)
  }

  const check = () => {
    if (solved || answer.length !== words.length) return
    const isCorrect = answer.every((chip, index) => chip.word === words[index])
    if (isCorrect) {
      setFeedback('correct')
    } else {
      setFeedback('incorrect')
      onIncorrectAttempt()
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-lg text-ink-700">{t('arrangeInstruction')}</p>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-500">{t('yourAnswer')}</h3>
        <ul
          aria-label={t('yourAnswer')}
          className="flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-50 p-3"
        >
          {answer.map((chip, index) => (
            <li key={chip.chipId}>
              <button
                type="button"
                onClick={() => removeChip(chip)}
                aria-label={t('removeWord', { word: chip.word })}
                disabled={solved}
                className="min-h-11 rounded-2xl border-2 border-teal-600 bg-teal-100 px-4 py-1 text-lg font-semibold italic text-teal-800"
              >
                {index + 1}. {chip.word}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-500">{t('wordBank')}</h3>
        <ul aria-label={t('wordBank')} className="flex flex-wrap gap-2">
          {remaining.map((chip) => (
            <li key={chip.chipId}>
              <button
                type="button"
                onClick={() => addChip(chip)}
                aria-label={t('addWord', { word: chip.word })}
                disabled={solved}
                className="min-h-11 rounded-2xl border-2 border-cream-300 bg-white px-4 py-1 text-lg font-semibold italic text-ink-900 hover:border-teal-300"
              >
                {chip.word}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p role="status" className="min-h-6 font-semibold">
        {feedback === 'correct' && (
          <span className="text-leaf-700">{t('correctFeedback')}</span>
        )}
        {feedback === 'incorrect' && (
          <span className="text-lotus-700">{t('incorrectFeedback')}</span>
        )}
      </p>

      <div className="flex flex-wrap gap-3">
        {!solved && (
          <>
            <Button
              size="lg"
              onClick={check}
              disabled={answer.length !== words.length}
            >
              {t('checkAnswer')}
            </Button>
            <Button
              variant="secondary"
              onClick={clearAnswer}
              disabled={answer.length === 0}
            >
              {t('clearAnswer')}
            </Button>
          </>
        )}
        {solved && (
          <Button size="lg" onClick={onComplete}>
            {t('continueAction')}
          </Button>
        )}
      </div>
    </div>
  )
}
