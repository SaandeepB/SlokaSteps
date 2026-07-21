import type { ReactNode } from 'react'
import { Mitra } from './Mitra'

export interface FriendlyErrorProps {
  title: string
  body: string
  actions?: ReactNode
}

/** Reassuring, child-friendly error display — never raw stack traces. */
export function FriendlyError({ title, body, actions }: FriendlyErrorProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center shadow-soft">
      <Mitra size={96} decorative float={false} />
      <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
      <p className="text-ink-700">{body}</p>
      {actions && (
        <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>
      )}
    </div>
  )
}
