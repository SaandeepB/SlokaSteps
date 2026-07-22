import { useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { SupportedLanguage } from '../../types/content'
import type { StoryOrderingActivity as StoryOrderingActivityModel } from '../../types/story'
import { resolveLocalizedText } from '../../content/stories'
import { shuffleAvoidingOriginal } from '../../utils/shuffle'
import { Button } from '../common/Button'

export interface StoryOrderingActivityProps {
  activity: StoryOrderingActivityModel
  language: SupportedLanguage
  onComplete: () => void
  onIncorrectAttempt?: () => void
}

/**
 * Button-based ordering works with touch, keyboard, switch input, and screen
 * readers. Drag-and-drop is deliberately not required.
 */
export function StoryOrderingActivity({
  activity,
  language,
  onComplete,
  onIncorrectAttempt,
}: StoryOrderingActivityProps) {
  const [events, setEvents] = useState(() =>
    shuffleAvoidingOriginal(
      activity.events.slice().sort((a, b) => a.order - b.order),
    ),
  )
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)

  const solved = feedback === 'correct'

  const move = (index: number, offset: -1 | 1) => {
    if (solved) return
    const destination = index + offset
    if (destination < 0 || destination >= events.length) return
    const next = [...events]
    ;[next[index], next[destination]] = [next[destination], next[index]]
    setEvents(next)
    setFeedback(null)
  }

  const checkOrder = () => {
    const correct = events.every((event, index) => event.order === index + 1)
    if (correct) {
      setFeedback('correct')
    } else {
      setFeedback('incorrect')
      onIncorrectAttempt?.()
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p lang={language} className="text-lg text-ink-700">
        {resolveLocalizedText(activity.instruction, language)}
      </p>

      <ol
        className="flex flex-col gap-3"
        aria-label="Events in your current order"
        aria-live="polite"
      >
        {events.map((event, index) => {
          const eventText = resolveLocalizedText(event.text, language)
          return (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded-2xl border-2 border-cream-200 bg-cream-50 p-3"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800"
              >
                {index + 1}
              </span>
              <span lang={language} className="min-w-0 flex-1 text-ink-900">
                {eventText}
              </span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={solved || index === 0}
                  aria-label={`Move “${eventText}” earlier`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cream-300 bg-white text-teal-700 disabled:opacity-40"
                >
                  <ArrowUp size={20} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={solved || index === events.length - 1}
                  aria-label={`Move “${eventText}” later`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cream-300 bg-white text-teal-700 disabled:opacity-40"
                >
                  <ArrowDown size={20} aria-hidden="true" />
                </button>
              </span>
            </li>
          )
        })}
      </ol>

      <p role="status" aria-live="polite" className="min-h-6 font-semibold">
        {feedback === 'correct' && (
          <span className="text-leaf-700">That order is correct!</span>
        )}
        {feedback === 'incorrect' && (
          <span className="text-lotus-700">
            Almost. Move the events and check again.
          </span>
        )}
      </p>

      {solved ? (
        <Button size="lg" onClick={onComplete} className="self-start">
          Continue
        </Button>
      ) : (
        <Button size="lg" onClick={checkOrder} className="self-start">
          Check order
        </Button>
      )}
    </div>
  )
}
