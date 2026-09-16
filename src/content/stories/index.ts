import type { Epic, StoryChapter } from '../../types/story'
import { mahabharataEpic } from './mahabharata'
import { ramayanaEpic } from './ramayana'

export { draftLocalizedText, resolveLocalizedText, STORY_LOCALES } from './localization'
export {
  isStoryChapterAvailable,
  isStoryContentAvailable,
  RUNTIME_STORY_AVAILABILITY_POLICY,
  STORY_AVAILABILITY_POLICIES,
} from './availability'
export type { StoryAvailabilityPolicy } from './availability'
export { mahabharataEpic, kuruFamilyChapter } from './mahabharata'
export { ramayanaEpic, ayodhyaAndDasharathaChapter } from './ramayana'

export const EPICS: Epic[] = [ramayanaEpic, mahabharataEpic]

export function getEpicById(epicId: string | undefined): Epic | undefined {
  if (!epicId) return undefined
  return EPICS.find((epic) => epic.id === epicId)
}

export function getStoryChapter(
  epicId: string | undefined,
  chapterId: string | undefined,
): { epic: Epic; chapter: StoryChapter } | undefined {
  const epic = getEpicById(epicId)
  if (!epic || !chapterId) return undefined

  for (const book of epic.books) {
    const chapter = book.chapters.find((candidate) => candidate.id === chapterId)
    if (chapter) return { epic, chapter }
  }
  return undefined
}

export function getStoryChapterById(
  chapterId: string | undefined,
): StoryChapter | undefined {
  if (!chapterId) return undefined
  return EPICS.flatMap((epic) => getEpicChapters(epic)).find(
    (chapter) => chapter.id === chapterId,
  )
}

export function getEpicChapters(epic: Epic): StoryChapter[] {
  return epic.books
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((book) => book.chapters.slice().sort((a, b) => a.order - b.order))
}
