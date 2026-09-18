import type { SlokaLine } from '../../types'
import { useTranslation } from '../../hooks/useTranslation'
import { useAppState } from '../../hooks/useAppState'
import { Bookmark } from 'lucide-react'

export interface SlokaTextBlockProps {
  lines: SlokaLine[]
  /** Line meaning shown under each line, when available. */
  lineMeanings?: string[]
  size?: 'md' | 'lg'
  bookmarkedLineIds?: ReadonlySet<string>
  onToggleLineBookmark?: (line: SlokaLine) => void
}

/**
 * Displays Sanskrit source text (always Devanagari) with Roman
 * transliteration. Regional-script renderings appear only when reviewed
 * content exists in the data; otherwise the transliteration stands in.
 */
export function SlokaTextBlock({
  lines,
  lineMeanings,
  size = 'md',
  bookmarkedLineIds,
  onToggleLineBookmark,
}: SlokaTextBlockProps) {
  const { t, language } = useTranslation()
  const { state } = useAppState()
  const devanagariSize = size === 'lg' ? 'text-3xl' : 'text-2xl'
  const preference = state.preferences.scriptPreference
  const devanagariIsRegional =
    language === 'en-IN' || language === 'hi-IN' || language === 'mr-IN'
  const romanIsRegional = false
  const wantsRegional =
    preference === 'regional' || preference === 'regional-and-transliteration'
  const wantsDevanagari =
    preference === 'devanagari' || (wantsRegional && devanagariIsRegional)
  const wantsRoman =
    preference === 'roman-transliteration' ||
    preference === 'regional-and-transliteration' ||
    (preference === 'regional' && romanIsRegional)
  const needsRegionalFallback =
    wantsRegional &&
    !devanagariIsRegional &&
    !romanIsRegional &&
    lines.some((line) => !line.regionalScripts?.[language])

  return (
    <div className="flex flex-col gap-5">
      {lines.map((line, index) => (
        <div key={line.id} className="relative flex flex-col gap-1 pr-12">
          {onToggleLineBookmark && (
            <button
              type="button"
              onClick={() => onToggleLineBookmark(line)}
              aria-pressed={bookmarkedLineIds?.has(line.id) ?? false}
              aria-label={`${bookmarkedLineIds?.has(line.id) ? 'Remove' : 'Add'} line bookmark`}
              className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-xl text-teal-700 hover:bg-teal-100"
            >
              <Bookmark
                size={20}
                aria-hidden="true"
                fill={bookmarkedLineIds?.has(line.id) ? 'currentColor' : 'none'}
              />
            </button>
          )}
          {wantsDevanagari && (
            <p
              lang="sa-Deva"
              // whitespace-pre-line: multi-pada verses (e.g. an ashtakam
              // verse per line entry) break where the content breaks.
              className={`${devanagariSize} whitespace-pre-line font-semibold text-teal-800`}
            >
              {line.devanagari}
            </p>
          )}
          {wantsRegional && !devanagariIsRegional && line.regionalScripts?.[language] && (
            <p lang={language} className="text-xl text-teal-700">
              {line.regionalScripts[language]}
            </p>
          )}
          {wantsRoman && (
            <p lang="sa-Latn" className="text-lg italic text-ink-700">
              {line.transliteration}
            </p>
          )}
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
