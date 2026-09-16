import type { ContentStatus } from '../../types/content'
import type { StoryChapter } from '../../types/story'

export interface StoryAvailabilityPolicy {
  /** Development previews may expose draft content without making it production-ready. */
  allowUnapprovedContent: boolean
}

export const STORY_AVAILABILITY_POLICIES = {
  development: Object.freeze({ allowUnapprovedContent: true }),
  production: Object.freeze({ allowUnapprovedContent: false }),
} as const satisfies Record<'development' | 'production', StoryAvailabilityPolicy>

export const RUNTIME_STORY_AVAILABILITY_POLICY: StoryAvailabilityPolicy =
  import.meta.env.PROD
    ? STORY_AVAILABILITY_POLICIES.production
    : STORY_AVAILABILITY_POLICIES.development

/** Draft/editorial content is interactive only in development builds. */
export function isStoryContentAvailable(
  status: ContentStatus,
  policy: StoryAvailabilityPolicy = RUNTIME_STORY_AVAILABILITY_POLICY,
): boolean {
  return status === 'approved' || policy.allowUnapprovedContent
}

/** Shared boundary for every reducer mutation that can create story progress. */
export function isStoryChapterAvailable<
  T extends Pick<StoryChapter, 'contentStatus'>,
>(
  chapter: T | undefined,
  policy: StoryAvailabilityPolicy = RUNTIME_STORY_AVAILABILITY_POLICY,
): chapter is T {
  return Boolean(chapter && isStoryContentAvailable(chapter.contentStatus, policy))
}
