export interface ProgressBarProps {
  value: number
  max: number
  label: string
  className?: string
}

export function ProgressBar({ value, max, label, className = '' }: ProgressBarProps) {
  const safeMax = Math.max(1, max)
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.min(value, safeMax)}
      className={`h-3 w-full overflow-hidden rounded-full bg-cream-200 ${className}`}
    >
      <div
        className="h-full rounded-full bg-saffron-500 transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
