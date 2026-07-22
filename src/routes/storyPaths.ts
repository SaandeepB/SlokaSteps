/** Isolated while the shared V2 route table is being integrated in parallel. */
export const storyRoutes = {
  stories: '/stories',
  slokas: '/slokas',
  epic: (epicId: string) => `/stories/${epicId}`,
  chapter: (epicId: string, chapterId: string) =>
    `/stories/${epicId}/${chapterId}`,
} as const
