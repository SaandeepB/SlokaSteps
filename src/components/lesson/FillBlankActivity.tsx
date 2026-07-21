import { useState } from 'react'
import { Button } from '../common/Button'
import { useTranslation } from '../../hooks/useTranslation'
import { shuffle } from '../../utils/shuffle'

export interface FillBlankActivityProps {
  /** Words of the line in order; the blank replaces words[blankIndex]. */
  words: string[]
  blankIndex: number
  distractors: string[]
  onComplete: () => void
  onIncorrectAttempt: () => void
}

/**
 * Choose the missing word, then press Check Answer. Option order is
 * shuffled once per attempt and every option renders identically — nothing
 * reveals the correct answer before submission. Wrong answers never advance
 * and each one counts a single scored attempt.
 */
export function FillBlankActivity({
  words,
  blankIndex,
  distractors,
  onComplete,
  onIncorrectAttempt,
}: FillBlankActivityProps) {
  const { t } = useTranslation()
  const correctWord = words[blankIndex]
  const [options] = useState(() => shuffle([correctWord, ...distractors]))
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)

  const solved = feedback === 'correct'

  const check = () => {
    if (!selected || solved) return
    if (selected === correctWord) {
      setFeedback('correct')
    } else {
      setFeedback('incorrect')
      onIncorrectAttempt()
      // Require a fresh choice so repeated clicking cannot re-record.
      setSelected(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-lg text-ink-700">{t('fillBlankInstruction')}</p>

      <p className="rounded-2xl bg-cream-100 p-4 text-xl italic text-ink-900">
        {words.map((word, index) => (
          <span key={index}>
            {index === blankIndex ? (
              <span
                aria-label="blank"
                className="mx-1 inline-block min-w-24 rounded-lg border-b-4 border-dashed border-saffron-500 px-2 text-center font-bold not-italic text-teal-700"
              >
                {solved ? correctWord : selected ?? '﹏﹏'}
              </span>
            ) : (
              word
            )}
            {index < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>

      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t('fillBlankInstruction')}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected === option}
            data-testid="fill-option"
            disabled={solved}
            onClick={() => {
              setSelected(option)
              setFeedback(null)
            }}
            className={`min-h-12 rounded-2xl border-2 px-5 py-2 text-lg font-semibold transition-colors ${
              selected === option
                ? 'border-teal-600 bg-teal-100 text-teal-800'
                : 'border-cream-300 bg-white text-ink-900 hover:border-teal-300'
            }`}
          >
            {option}
          </button>
        ))}
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
          <Button size="lg" onClick={check} disabled={!selected}>
            {t('checkAnswer')}
          </Button>
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
