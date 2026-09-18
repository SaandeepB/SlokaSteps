import { CheckCircle2, Ear, ShieldCheck, Sparkles } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'
import {
  isScoredEvaluation,
  isVerifiedEvaluation,
  type ChantEvaluationResult,
} from '../../types/chant'
import type { TranslationKey } from '../../content/translations'

export interface ChantFeedbackProps {
  result: ChantEvaluationResult
}

/**
 * Renders a Chant Coach result the way a gentle teacher would: per-akshara
 * chips (matched / practice / not sure — icon plus label, never colour
 * alone), a short encouraging summary, and an honest provenance note.
 * Numbers, percentages, and the word "wrong" never appear for children.
 */
export function ChantFeedback({ result }: ChantFeedbackProps) {
  const { t } = useTranslation()

  if (!isScoredEvaluation(result)) {
    // Unavailable/participation results: one calm sentence, no detail.
    return (
      <p role="status" className="rounded-xl bg-sky-100 p-3 text-ink-700">
        {t(result.childMessageKey as TranslationKey)}
      </p>
    )
  }

  if (!isVerifiedEvaluation(result)) {
    // 'analyzed' results (audio-reference comparison) do not exist yet; a
    // future implementation must design its own surface deliberately.
    return null
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border-2 border-teal-200 bg-teal-50 p-4"
    >
      <span className="inline-flex items-center gap-2 self-start rounded-full bg-lotus-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-lotus-700">
        <Sparkles size={14} aria-hidden="true" />
        {t('chantCoachTestingBadge')}
      </span>

      <p className="text-lg font-semibold text-teal-800">{result.childSummary}</p>

      {/*
       * Child surface is deliberately two-state (DECISIONS.md, evaluation
       * contract, D5): a child is never shown a per-akṣara "you got this
       * wrong". A `deviation` is folded into the same gentle "keep practicing"
       * chip as an abstention, so a false positive (measured ~2.1% on correct
       * audio) can only ever under-claim, never accuse. The precise
       * matched/deviation/unclear breakdown stays in the result for the parent
       * summary and the dev Chant Lab.
       */}
      <ul aria-label={t('chantCoachTitle')} className="flex flex-wrap gap-2">
        {result.segments.map((segment) => {
          const matched =
            segment.status === 'assessed' && segment.outcome === 'matched'
          const styles = matched
            ? 'border-leaf-500 bg-leaf-100 text-leaf-700'
            : 'border-cream-300 bg-cream-100 text-ink-500'
          return (
            <li
              key={segment.index}
              className={`flex flex-col items-center gap-0.5 rounded-xl border-2 px-2.5 py-1.5 ${styles}`}
            >
              <span lang="sa-Deva" className="text-xl font-bold">
                {segment.label}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                {matched ? (
                  <CheckCircle2 size={12} aria-hidden="true" />
                ) : (
                  <Ear size={12} aria-hidden="true" />
                )}
                {t(matched ? 'chantCoachMatchedLegend' : 'chantCoachPracticeLegend')}
              </span>
            </li>
          )
        })}
      </ul>

      <p className="inline-flex items-center gap-2 text-sm text-ink-500">
        <ShieldCheck size={16} aria-hidden="true" className="shrink-0" />
        {t('chantCoachProvenanceNote')}
      </p>
    </div>
  )
}
