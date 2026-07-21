import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '../common/Button'
import { useTranslation } from '../../hooks/useTranslation'
import { shuffle } from '../../utils/shuffle'

export interface MatchItem {
  id: string
  phrase: string
  meaning: string
}

export interface MatchActivityProps {
  items: MatchItem[]
  onComplete: () => void
  onIncorrectAttempt: () => void
}

/**
 * Two-step clickable matching (no drag-and-drop): tap a phrase, then tap its
 * meaning. Correct pairs stay completed with a checkmark + text; incorrect
 * pairs reset gently and count one scored attempt. Wrong answers never
 * advance the activity.
 */
export function MatchActivity({
  items,
  onComplete,
  onIncorrectAttempt,
}: MatchActivityProps) {
  const { t, language } = useTranslation()
  const [meaningOrder] = useState(() => shuffle(items.map((item) => item.id)))
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)

  const allMatched = matched.size === items.length

  const onMeaningClick = (meaningId: string) => {
    if (!selectedPhrase || matched.has(meaningId)) return
    if (meaningId === selectedPhrase) {
      const next = new Set(matched)
      next.add(meaningId)
      setMatched(next)
      setFeedback('correct')
    } else {
      setFeedback('incorrect')
      onIncorrectAttempt()
    }
    setSelectedPhrase(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-lg text-ink-700">{t('matchInstruction')}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const isMatched = matched.has(item.id)
            const isSelected = selectedPhrase === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={isMatched}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedPhrase(isSelected ? null : item.id)
                    setFeedback(null)
                  }}
                  className={`w-full rounded-2xl border-2 p-3 text-left text-base font-medium transition-colors ${
                    isMatched
                      ? 'border-leaf-500 bg-leaf-100 text-ink-700'
                      : isSelected
                        ? 'border-teal-600 bg-teal-100 text-teal-800 ring-2 ring-teal-300'
                        : 'border-cream-300 bg-white text-ink-900 hover:border-teal-300'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="italic">{item.phrase}</span>
                    {isMatched && (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-700">
                        <Check size={16} aria-hidden="true" />
                        {t('matchedLabel')}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <ul className="flex flex-col gap-3">
          {meaningOrder.map((meaningId) => {
            const item = items.find((candidate) => candidate.id === meaningId)
            if (!item) return null
            const isMatched = matched.has(meaningId)
            return (
              <li key={meaningId}>
                <button
                  type="button"
                  disabled={isMatched || !selectedPhrase}
                  onClick={() => onMeaningClick(meaningId)}
                  lang={language}
                  className={`w-full rounded-2xl border-2 p-3 text-left text-base transition-colors ${
                    isMatched
                      ? 'border-leaf-500 bg-leaf-100 text-ink-700'
                      : selectedPhrase
                        ? 'border-lavender-300 bg-white text-ink-900 hover:border-lavender-500'
                        : 'border-cream-200 bg-cream-50 text-ink-700'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    {item.meaning}
                    {isMatched && (
                      <Check size={16} aria-hidden="true" className="text-leaf-700" />
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <p role="status" className="min-h-6 font-semibold">
        {feedback === 'correct' && !allMatched && (
          <span className="text-leaf-700">{t('correctFeedback')}</span>
        )}
        {feedback === 'incorrect' && (
          <span className="text-lotus-700">{t('incorrectFeedback')}</span>
        )}
        {allMatched && <span className="text-leaf-700">{t('correctFeedback')}</span>}
      </p>

      <Button
        size="lg"
        onClick={onComplete}
        disabled={!allMatched}
        className="self-start"
      >
        {t('continueAction')}
      </Button>
    </div>
  )
}
