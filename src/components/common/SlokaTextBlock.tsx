import type { SlokaLine } from '../../types'
import { useTranslation } from '../../hooks/useTranslation'

export interface SlokaTextBlockProps {
  lines: SlokaLine[]
  /** Line meaning shown under each line, when available. */
  lineMeanings?: string[]
  size?: 'md' | 'lg'
}

/**
 * Displays Sanskrit source text (always Devanagari) with Roman
 * transliteration. Regional-script renderings appear only when reviewed
 * content exists in the data; otherwise the transliteration stands in.
 */
export function SlokaTextBlock({ lines, lineMeanings, size = 'md' }: SlokaTextBlockProps) {
  const { t, language } = useTranslation()
  const devanagariSize = size === 'lg' ? 'text-3xl' : 'text-2xl'

  const hasRegionalScript =
    language !== 'en' &&
    language !== 'hi' &&
    language !== 'mr' &&
    lines.some((line) => line.regionalScripts?.[language])

  const needsRegionalFallback =
    language !== 'en' && language !== 'hi' && language !== 'mr' && !hasRegionalScript

  return (
    <div className="flex flex-col gap-5">
      {lines.map((line, index) => (
        <div key={line.id} className="flex flex-col gap-1">
          <p lang="sa" className={`${devanagariSize} font-semibold text-teal-800`}>
            {line.devanagari}
          </p>
          {hasRegionalScript && line.regionalScripts?.[language] && (
            <p lang={language} className="text-xl text-teal-700">
              {line.regionalScripts[language]}
            </p>
          )}
          <p className="text-lg italic text-ink-700">{line.transliteration}</p>
          {lineMeanings?.[index] && (
            <p lang={language} className="text-base text-ink-500">
              {lineMeanings[index]}
            </p>
          )}
        </div>
      ))}
      {needsRegionalFallback && (
        <p className="rounded-xl bg-cream-100 p-3 text-sm text-ink-700">
          {t('regionalScriptFallback')}
        </p>
      )}
    </div>
  )
}
