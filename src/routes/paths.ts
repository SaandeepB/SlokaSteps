/** Centralized V2 route builders. Legacy V1 patterns remain redirect-only. */
export const routes = {
  home: '/',
  setup: '/setup',
  learn: '/learn',
  path: '/slokas',
  slokas: '/slokas',
  lesson: (slokaId: string) => `/slokas/${slokaId}`,
  activity: (slokaId: string, activityId: string) =>
    `/slokas/${slokaId}/activity/${activityId}`,
  stories: '/stories',
  epic: (epicId: string) => `/stories/${epicId}`,
  storyChapter: (epicId: string, chapterId: string) =>
    `/stories/${epicId}/${chapterId}`,
  practice: '/practice',
  rewards: '/rewards',
  complete: (slokaId: string) => `/complete/sloka/${slokaId}`,
  contentComplete: (contentType: 'sloka' | 'story', contentId: string) =>
    `/complete/${contentType}/${contentId}`,
  parent: '/parent',
  settings: '/settings',
  privacy: '/privacy',
  audioLab: '/dev/audio-lab',
  chantLab: '/dev/chant-lab',
} as const

export const routePatterns = {
  home: '/',
  setup: '/setup',
  learn: '/learn',
  path: '/slokas',
  lesson: '/slokas/:slokaId',
  activity: '/slokas/:slokaId/activity/:activityId',
  stories: '/stories',
  epic: '/stories/:epicId',
  storyChapter: '/stories/:epicId/:chapterId',
  practice: '/practice',
  rewards: '/rewards',
  complete: '/complete/:contentType/:contentId',
  parent: '/parent',
  settings: '/settings',
  privacy: '/privacy',
  audioLab: '/dev/audio-lab',
  chantLab: '/dev/chant-lab',
  legacyPath: '/path',
  legacyLesson: '/lesson/:slokaId',
  legacyActivity: '/lesson/:slokaId/activity/:activityId',
  legacyComplete: '/complete/:slokaId',
} as const
