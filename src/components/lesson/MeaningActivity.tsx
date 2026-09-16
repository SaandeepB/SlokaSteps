import { Button } from '../common/Button'
import { Mitra } from '../common/Mitra'
import { PlayLineControls } from '../audio/PlayLineControls'
import { useTranslation } from '../../hooks/useTranslation'
import type { SlokaMeaning } from '../../types'
import type { SupportedLanguage } from '../../types'

export interface MeaningActivityProps {
  meaning: SlokaMeaning
  slokaId?: string
  narrationText?: string
  narrationLanguage?: SupportedLanguage
  onContinue: () => void
}

export function MeaningActivity({
  meaning,
  slokaId,
  narrationText,
  narrationLanguage,
  onContinue,
}: MeaningActivityProps) {
  const { t, language } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Mitra size={72} decorative float={false} />
        <h2 className="text-2xl font-bold text-teal-700">{t('meaningIntro')}</h2>
      </div>
      <div lang={language} className="flex flex-col gap-4">
        <p className="text-xl text-ink-900">{meaning.simpleMeaning}</p>
        <ul className="flex flex-col gap-2">
          {meaning.lineMeanings.slice(0, 2).map((idea, index) => (
            <li
              key={index}
              className="rounded-2xl bg-cream-100 p-3 text-lg text-ink-700"
            >
              {idea}
            </li>
          ))}
        </ul>
        <div>
          <h3 className="font-bold text-ink-900">{t('culturalNoteTitle')}</h3>
          <p className="mt-1 text-ink-700">{meaning.culturalNote}</p>
        </div>
      </div>
      {slokaId && (
        <PlayLineControls
          text={narrationText ?? meaning.simpleMeaning}
          language={narrationLanguage ?? language}
          audioQuery={{
            contentId: slokaId,
            segmentId: 'meaning-summary',
            purpose: 'meaning-narration',
            language: narrationLanguage ?? language,
          }}
        />
      )}
      <Button size="lg" onClick={onContinue} className="self-start">
        {t('continueAction')}
      </Button>
    </div>
  )
}
