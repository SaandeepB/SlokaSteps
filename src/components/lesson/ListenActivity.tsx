import { Button } from '../common/Button'
import { SlokaTextBlock } from '../common/SlokaTextBlock'
import { PlayLineControls } from '../audio/PlayLineControls'
import { useTranslation } from '../../hooks/useTranslation'
import type { SlokaLine } from '../../types'

export interface ListenActivityProps {
  line: SlokaLine
  slokaId?: string
  lineMeaning?: string
  onContinue: () => void
}

/**
 * Listen step: hear the line (normal or slow), read it, then continue.
 * When playback is unsupported the child can still read and continue.
 */
export function ListenActivity({ line, slokaId, lineMeaning, onContinue }: ListenActivityProps) {
  const { t } = useTranslation()
  const segmentId =
    slokaId && line.id.startsWith(`${slokaId}-`)
      ? line.id.slice(slokaId.length + 1)
      : line.id
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-ink-700">{t('listenInstruction')}</p>
      <SlokaTextBlock
        lines={[line]}
        lineMeanings={lineMeaning ? [lineMeaning] : undefined}
        size="lg"
      />
      <PlayLineControls
        text={line.transliteration}
        audioUrl={line.audioUrl}
        audioQuery={
          slokaId
            ? {
                contentId: slokaId,
                segmentId,
                purpose: 'canonical-chant',
                language: 'sa-IN',
              }
            : undefined
        }
      />
      <Button size="lg" onClick={onContinue} className="self-start">
        {t('continueAction')}
      </Button>
    </div>
  )
}
