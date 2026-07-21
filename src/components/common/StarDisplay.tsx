import { Star } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'

export interface StarDisplayProps {
  stars: number
  size?: number
  className?: string
}

/** Three-star display with an accessible text description. */
export function StarDisplay({ stars, size = 24, className = '' }: StarDisplayProps) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      role="img"
      aria-label={t('starsAria', { stars })}
    >
      {[1, 2, 3].map((slot) => (
        <Star
          key={slot}
          size={size}
          aria-hidden="true"
          className={
            slot <= stars ? 'fill-saffron-400 text-saffron-500' : 'text-cream-300'
          }
        />
      ))}
    </span>
  )
}
