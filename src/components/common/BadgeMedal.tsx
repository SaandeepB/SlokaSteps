import { BellRing, BookOpen, Flower2, Heart, Lamp, Sun } from 'lucide-react'
import type { Badge, BadgeMotif } from '../../types'

const motifIcons: Record<
  BadgeMotif,
  typeof BookOpen
> = {
  book: BookOpen,
  sun: Sun,
  bell: BellRing,
  heart: Heart,
  lotus: Flower2,
  lamp: Lamp,
}

const motifColors: Record<BadgeMotif, string> = {
  book: 'bg-sky-100 text-sky-700 border-sky-300',
  sun: 'bg-saffron-100 text-saffron-700 border-saffron-300',
  bell: 'bg-lavender-100 text-lavender-700 border-lavender-300',
  heart: 'bg-lotus-100 text-lotus-700 border-lotus-300',
  lotus: 'bg-lotus-100 text-lotus-700 border-lotus-300',
  lamp: 'bg-saffron-100 text-saffron-700 border-saffron-300',
}

export interface BadgeMedalProps {
  badge: Badge
  earned?: boolean
  size?: 'sm' | 'lg'
  showName?: boolean
}

export function BadgeMedal({
  badge,
  earned = true,
  size = 'sm',
  showName = false,
}: BadgeMedalProps) {
  const Icon = motifIcons[badge.motif]
  const dimension = size === 'lg' ? 'h-20 w-20' : 'h-10 w-10'
  const iconSize = size === 'lg' ? 36 : 20
  return (
    <span className="inline-flex flex-col items-center gap-1 text-center">
      <span
        className={`inline-flex items-center justify-center rounded-full border-2 ${dimension} ${
          earned ? motifColors[badge.motif] : 'border-cream-300 bg-cream-100 text-ink-500 opacity-60'
        }`}
        role="img"
        aria-label={badge.name}
      >
        <Icon size={iconSize} aria-hidden="true" />
      </span>
      {showName && (
        <span className="max-w-24 text-xs font-medium text-ink-700">
          {badge.name}
        </span>
      )}
    </span>
  )
}
