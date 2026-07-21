/** Centralized route builders — no string paths scattered in components. */
export const routes = {
  home: '/',
  setup: '/setup',
  path: '/path',
  lesson: (slokaId: string) => `/lesson/${slokaId}`,
  activity: (slokaId: string, activityId: string) =>
    `/lesson/${slokaId}/activity/${activityId}`,
  complete: (slokaId: string) => `/complete/${slokaId}`,
  parent: '/parent',
  settings: '/settings',
  privacy: '/privacy',
} as const

export const routePatterns = {
  home: '/',
  setup: '/setup',
  path: '/path',
  lesson: '/lesson/:slokaId',
  activity: '/lesson/:slokaId/activity/:activityId',
  complete: '/complete/:slokaId',
  parent: '/parent',
  settings: '/settings',
  privacy: '/privacy',
} as const
