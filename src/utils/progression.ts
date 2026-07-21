import type { LessonProgress, Sloka } from '../types'

export type LessonAvailability =
  | 'locked'
  | 'available'
  | 'in-progress'
  | 'completed'
  | 'coming-soon'

/**
 * Sequential unlocking: lesson 1 starts available; each later lesson unlocks
 * when the lesson before it (by `order`) is completed. Coming-soon lessons
 * are never enterable and never award progress.
 */
export function getLessonAvailability(
  sloka: Sloka,
  lessons: Record<string, LessonProgress>,
  allSlokas: Sloka[],
): LessonAvailability {
  if (sloka.implementationStatus === 'coming-soon') return 'coming-soon'

  const progress = lessons[sloka.id]
  if (progress?.status === 'completed') return 'completed'

  if (sloka.order > 1) {
    const previous = allSlokas.find((s) => s.order === sloka.order - 1)
    if (previous && lessons[previous.id]?.status !== 'completed') {
      return 'locked'
    }
  }
  if (progress?.status === 'in-progress') return 'in-progress'
  return 'available'
}

export function canEnterLesson(availability: LessonAvailability): boolean {
  return (
    availability === 'available' ||
    availability === 'in-progress' ||
    availability === 'completed'
  )
}

export function getCompletionPercent(
  sloka: Sloka,
  progress: LessonProgress | undefined,
): number {
  if (!progress || sloka.activities.length === 0) return 0
  if (progress.status === 'completed') return 100
  if (progress.status === 'not-started') return 0
  return Math.min(
    99,
    Math.round((progress.currentActivityIndex / sloka.activities.length) * 100),
  )
}
