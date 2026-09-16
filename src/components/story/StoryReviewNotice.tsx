import { AlertTriangle } from 'lucide-react'
import type { ContentStatus } from '../../types/content'

export function StoryReviewNotice({ status }: { status: ContentStatus }) {
  if (!import.meta.env.DEV || status === 'approved') return null

  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-2xl border border-saffron-300 bg-saffron-100 p-3 text-sm font-semibold text-saffron-700"
    >
      <AlertTriangle size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
      Draft story content — requires cultural and editorial review.
    </p>
  )
}
