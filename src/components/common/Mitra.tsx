export interface MitraProps {
  size?: number
  /** Decorative instances are hidden from screen readers. */
  decorative?: boolean
  float?: boolean
  /** Accessible label; pages may pass a localized value via t('mitraAlt'). */
  label?: string
}

/**
 * Mitra — the original Sloka Steps guide: a friendly glowing lotus drawn as
 * inline SVG for this project. Not derived from any existing mascot. Kept
 * free of context hooks so it can render inside the error boundary.
 */
export function Mitra({
  size = 120,
  decorative = false,
  float = true,
  label = 'Mitra, your friendly lotus guide',
}: MitraProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={float ? 'animate-gentle-float' : undefined}
    >
      {/* Soft glow */}
      <circle cx="60" cy="62" r="46" fill="#F6C15C" opacity="0.25" />
      <circle cx="60" cy="62" r="36" fill="#F6C15C" opacity="0.25" />
      {/* Outer petals */}
      <path d="M60 18 C50 36 50 52 60 62 C70 52 70 36 60 18Z" fill="#D9829B" />
      <path d="M28 40 C36 54 46 62 60 62 C56 48 46 40 28 40Z" fill="#E8A0B4" />
      <path d="M92 40 C84 54 74 62 60 62 C64 48 74 40 92 40Z" fill="#E8A0B4" />
      <path d="M20 66 C32 76 46 78 60 72 C50 62 34 60 20 66Z" fill="#F2BFCE" />
      <path d="M100 66 C88 76 74 78 60 72 C70 62 86 60 100 66Z" fill="#F2BFCE" />
      {/* Face petal */}
      <ellipse cx="60" cy="74" rx="24" ry="20" fill="#FBE9EE" />
      {/* Eyes */}
      <circle cx="52" cy="72" r="2.8" fill="#33291E" />
      <circle cx="68" cy="72" r="2.8" fill="#33291E" />
      {/* Smile */}
      <path
        d="M52 80 Q60 87 68 80"
        stroke="#33291E"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cheeks */}
      <circle cx="45" cy="78" r="3.4" fill="#F2BFCE" />
      <circle cx="75" cy="78" r="3.4" fill="#F2BFCE" />
      {/* Base leaf curves */}
      <path d="M36 94 Q60 104 84 94 Q60 112 36 94Z" fill="#7FBCBA" />
    </svg>
  )
}
