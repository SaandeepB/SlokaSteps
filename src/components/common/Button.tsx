import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 shadow-soft',
  secondary:
    'bg-cream-100 text-ink-900 border-2 border-cream-300 hover:border-saffron-400 hover:bg-cream-50',
  ghost: 'bg-transparent text-teal-700 hover:bg-teal-100',
  danger:
    'bg-white text-lotus-700 border-2 border-lotus-300 hover:bg-lotus-100',
}

const sizeClasses: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 py-2 text-base',
  lg: 'min-h-13 px-6 py-3 text-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
