import { Button } from '../common/Button'
import { Mitra } from '../common/Mitra'
import { BadgeMedal } from '../common/BadgeMedal'
import { useTranslation } from '../../hooks/useTranslation'
import type { Badge } from '../../types'

export interface IntroductionActivityProps {
  title: string
  theme: string
  badge: Badge
  onContinue: () => void
}

export function IntroductionActivity({
  title,
  theme,
  badge,
  onContinue,
}: IntroductionActivityProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <Mitra size={120} label={t('mitraAlt')} />
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-extrabold text-teal-700">{t('introReady')}</h2>
        <p className="text-lg font-semibold text-ink-900">{title}</p>
        <p className="text-ink-700">{theme}</p>
        <p className="text-ink-700">{t('introHint')}</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <BadgeMedal badge={badge} earned={false} size="lg" />
        <p className="text-sm text-ink-500">{t('badgeReward', { name: badge.name })}</p>
      </div>
      <Button size="lg" onClick={onContinue}>
        {t('start')}
      </Button>
    </div>
  )
}
