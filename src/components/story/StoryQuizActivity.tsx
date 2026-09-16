import { useId, useState } from 'react'
import type { SupportedLanguage } from '../../types/content'
import type { StoryQuizQuestion } from '../../types/story'
import { resolveLocalizedText } from '../../content/stories'
import { Button } from '../common/Button'

export interface StoryQuizActivityProps {
  question: StoryQuizQuestion
  questionNumber: number
  questionCount: number
  language: SupportedLanguage
  onComplete: () => void
  onIncorrectAttempt?: () => void
}

export function StoryQuizActivity({
  question,
  questionNumber,
  questionCount,
  language,
  onComplete,
  onIncorrectAttempt,
}: StoryQuizActivityProps) {
  const groupName = useId()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const solved = feedback === 'correct'

  const checkAnswer = () => {
    if (!selectedId || solved) return
    if (selectedId === question.correctChoiceId) {
      setFeedback('correct')
    } else {
      setFeedback('incorrect')
      setSelectedId(null)
      onIncorrectAttempt?.()
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-semibold text-ink-500">
        Question {questionNumber} of {questionCount}
      </p>
      <fieldset disabled={solved} className="flex flex-col gap-3">
        <legend lang={language} className="mb-2 text-xl font-bold text-ink-900">
          {resolveLocalizedText(question.prompt, language)}
        </legend>
        {question.choices.map((choice) => {
          const checked = selectedId === choice.id
          return (
            <label
              key={choice.id}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-lg transition-colors ${
                checked
                  ? 'border-teal-600 bg-teal-100 text-teal-800'
                  : 'border-cream-300 bg-white text-ink-900 hover:border-teal-300'
              }`}
            >
              <input
                type="radio"
                name={groupName}
                value={choice.id}
                checked={checked}
                onChange={() => {
                  setSelectedId(choice.id)
                  setFeedback(null)
                }}
                className="h-5 w-5 shrink-0"
              />
              <span lang={language}>{resolveLocalizedText(choice.text, language)}</span>
            </label>
          )
        })}
      </fieldset>

      <div role="status" aria-live="polite" className="min-h-12">
        {feedback === 'correct' && (
          <p lang={language} className="font-semibold text-leaf-700">
            Correct. {resolveLocalizedText(question.explanation, language)}
          </p>
        )}
        {feedback === 'incorrect' && (
          <p className="font-semibold text-lotus-700">
            Not quite. Try another answer.
          </p>
        )}
      </div>

      {solved ? (
        <Button size="lg" onClick={onComplete} className="self-start">
          Continue
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={checkAnswer}
          disabled={!selectedId}
          className="self-start"
        >
          Check answer
        </Button>
      )}
    </div>
  )
}
