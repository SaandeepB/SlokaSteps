import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import { useTranslation } from '../../hooks/useTranslation'

export interface GateQuestion {
  a: number
  b: number
}

const GATE_QUESTIONS: GateQuestion[] = [
  { a: 4, b: 3 },
  { a: 5, b: 2 },
  { a: 6, b: 3 },
  { a: 7, b: 4 },
  { a: 8, b: 5 },
]

function pickGateQuestion(): GateQuestion {
  return GATE_QUESTIONS[Math.floor(Math.random() * GATE_QUESTIONS.length)]
}

export interface ParentGateProps {
  onPassed: () => void
  /** Test seam: fixes the question instead of picking one at random. */
  fixedQuestion?: GateQuestion
}

/**
 * A simple addition question that deters young children from wandering into
 * the Parent Area. Deliberately NOT authentication or a security feature,
 * and the passed state is never persisted.
 */
export function ParentGate({ onPassed, fixedQuestion }: ParentGateProps) {
  const { t } = useTranslation()
  const answerId = useId()
  const errorId = useId()
  const [question] = useState<GateQuestion>(() => fixedQuestion ?? pickGateQuestion())
  const [answer, setAnswer] = useState('')
  const [wrong, setWrong] = useState(false)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (Number.parseInt(answer.trim(), 10) === question.a + question.b) {
      onPassed()
    } else {
      setWrong(true)
      setAnswer('')
    }
  }

  return (
    <Card className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-bold text-ink-900">{t('parentGateTitle')}</h1>
      <p className="text-ink-700">{t('parentGateHint')}</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <label htmlFor={answerId} className="text-lg font-semibold text-ink-900">
          {t('parentGateQuestion', { a: question.a, b: question.b })}
        </label>
        <input
          id={answerId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={answer}
          onChange={(event) => {
            setAnswer(event.target.value)
            setWrong(false)
          }}
          aria-describedby={wrong ? errorId : undefined}
          aria-label={t('parentGateAnswerLabel')}
          className="min-h-12 w-32 rounded-xl border-2 border-cream-300 px-4 text-lg"
        />
        {wrong && (
          <p id={errorId} role="alert" className="font-semibold text-lotus-700">
            {t('parentGateWrong')}
          </p>
        )}
        <Button type="submit" className="self-start">
          {t('enter')}
        </Button>
      </form>
      <p className="text-xs text-ink-500">{t('gateNotSecurityNote')}</p>
    </Card>
  )
}
