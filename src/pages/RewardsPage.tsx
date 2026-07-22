import { Award, Flame, Sparkles } from 'lucide-react'
import { BadgeMedal } from '../components/common/BadgeMedal'
import { Card } from '../components/common/Card'
import { SLOKAS } from '../content/slokas'
import { EPICS, getEpicChapters, resolveLocalizedText } from '../content/stories'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function RewardsPage() {
  const { state } = useAppState()
  const { t } = useTranslation()
  const language = state.preferences.displayLanguage
  useDocumentTitle(t('rewards'))

  const earnedIds = new Set(state.progress.badges.map((badge) => badge.id))
  const storyRewards = EPICS.flatMap((epic) =>
    getEpicChapters(epic).map((chapter) => chapter.completionReward),
  ).filter((reward) => earnedIds.has(reward.badgeId))

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <h1 className="text-3xl font-extrabold text-teal-700">{t('rewards')}</h1>
        <p className="mt-2 text-ink-700">A gentle record of learning, practice, and kindness.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex items-center gap-3">
          <Sparkles className="text-saffron-600" aria-hidden="true" />
          <div><p className="text-sm text-ink-500">{t('totalXpLabel')}</p><p className="text-2xl font-extrabold text-ink-900">{state.progress.totalXp}</p></div>
        </Card>
        <Card className="flex items-center gap-3">
          <Flame className="text-lotus-600" aria-hidden="true" />
          <div><p className="text-sm text-ink-500">Current streak</p><p className="text-2xl font-extrabold text-ink-900">{state.progress.streak.current} days</p></div>
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink-900">
          <Award aria-hidden="true" /> {t('badgesLabel')}
        </h2>
        {earnedIds.size === 0 ? (
          <p className="text-ink-500">Badges appear here after a first lesson or chapter completion.</p>
        ) : (
          <div className="flex flex-wrap gap-5">
            {SLOKAS.filter((sloka) => earnedIds.has(sloka.badge.id)).map((sloka) => (
              <BadgeMedal key={sloka.badge.id} badge={sloka.badge} earned size="lg" showName />
            ))}
            {storyRewards.map((reward) => (
              <div key={reward.badgeId} className="flex max-w-32 flex-col items-center gap-2 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lavender-100 text-lavender-700">
                  <Award aria-hidden="true" />
                </span>
                <span lang={language} className="text-sm font-semibold text-ink-900">
                  {resolveLocalizedText(reward.badgeTitle, language)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
