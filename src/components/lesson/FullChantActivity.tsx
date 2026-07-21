import { useState } from 'react'
import { Button } from '../common/Button'
import { SlokaTextBlock } from '../common/SlokaTextBlock'
import { PlayLineControls } from '../audio/PlayLineControls'
import { RecorderPanel } from '../audio/RecorderPanel'
import { useTranslation } from '../../hooks/useTranslation'
import type { SlokaLine } from '../../types'

export interface FullChantActivityProps {
  lines: SlokaLine[]
  onFinish: () => void
  onRecordingAttempted: () => void
}

/**
 * Final practice: listen to the whole sloka, record a full chant, replay it,
 * and finish the lesson. Recording is encouraged but a microphone problem
 * unlocks finishing anyway.
 */
export function FullChantActivity({
  lines,
  onFinish,
  onRecordingAttempted,
}: FullChantActivityProps) {
  const { t } = useTranslation()
  const [attempted, setAttempted] = useState(false)
  const fullText = lines.map((line) => line.transliteration).join('. ')

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-teal-700">{t('fullChantTitle')}</h2>
      <p className="text-lg text-ink-700">{t('fullChantInstruction')}</p>
      <SlokaTextBlock lines={lines} />
      <PlayLineControls text={fullText} playLabelKey="listenFull" />
      <RecorderPanel
        expectedText={fullText}
        onAttempted={() => {
          setAttempted(true)
          onRecordingAttempted()
        }}
      />
      <Button
        size="lg"
        onClick={onFinish}
        disabled={!attempted}
        className="self-start"
      >
        {t('finishLesson')}
      </Button>
    </div>
  )
}
