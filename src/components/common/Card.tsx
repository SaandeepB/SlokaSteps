import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-3xl border border-cream-200 bg-white p-5 shadow-soft ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
