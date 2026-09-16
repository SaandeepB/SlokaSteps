import { useState } from 'react'
import { Button } from '../common/Button'
import { SlokaTextBlock } from '../common/SlokaTextBlock'
import { PlayLineControls } from '../audio/PlayLineControls'
import { RecorderPanel } from '../audio/RecorderPanel'
import { useTranslation } from '../../hooks/useTranslation'
import type { SlokaLine } from '../../types'

export interface RepeatActivityProps {
  line: SlokaLine
  slokaId?: string
  onContinue: () => void
  onRecordingAttempted: () => void
}

/**
 * Repeat step: the child chants the line and may record themselves.
 * Continue unlocks after a recording attempt — or immediately after any
 * microphone problem, so recording never blocks a lesson.
 */
export function RepeatActivity({
  line,
  slokaId,
  onContinue,
  onRecordingAttempted,
}: RepeatActivityProps) {
  const { t } = useTranslation()
  const [attempted, setAttempted] = useState(false)
  const segmentId =
    slokaId && line.id.startsWith(`${slokaId}-`)
      ? line.id.slice(slokaId.length + 1)
      : line.id

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-ink-700">{t('repeatInstruction')}</p>
      <SlokaTextBlock lines={[line]} size="lg" />
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
      <RecorderPanel
        expectedText={line.transliteration}
        slokaId={slokaId}
        onAttempted={() => {
          setAttempted(true)
          onRecordingAttempted()
        }}
      />
      <Button
        size="lg"
        onClick={onContinue}
        disabled={!attempted}
        className="self-start"
      >
        {t('continueAction')}
      </Button>
    </div>
  )
}
