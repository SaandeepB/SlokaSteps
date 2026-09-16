import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookHeart, Clock } from 'lucide-react'
import { LearningModeSelector } from '../components/learn/LearningModeSelector'
import { Card } from '../components/common/Card'
import { ProgressBar } from '../components/common/ProgressBar'
import { StoryReviewNotice } from '../components/story/StoryReviewNotice'
import {
  EPICS,
  getEpicChapters,
  isStoryContentAvailable,
  resolveLocalizedText,
} from '../content/stories'
import { useAppState } from '../hooks/useAppState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { storyRoutes } from '../routes/storyPaths'

export function StoriesPage() {
  const { state, dispatch } = useAppState()
  const navigate = useNavigate()
  const language = state.preferences.displayLanguage
  useDocumentTitle('Stories')

  useEffect(() => {
    if (state.progress.lastMode !== 'stories') {
      dispatch({ type: 'SET_LEARNING_MODE', mode: 'stories' })
    }
  }, [dispatch, state.progress.lastMode])

  const selectMode = (mode: 'slokas' | 'stories') => {
    dispatch({ type: 'SET_LEARNING_MODE', mode })
    navigate(mode === 'stories' ? storyRoutes.stories : storyRoutes.slokas)
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold uppercase tracking-wide text-saffron-700">
          Learn
        </p>
        <h1 className="text-3xl font-extrabold text-teal-700">Story paths</h1>
        <p className="max-w-2xl text-lg text-ink-700">
          Take one calm chapter at a time through the Ramayana and Mahabharata.
        </p>
      </div>

      <LearningModeSelector value="stories" onChange={selectMode} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {EPICS.map((epic) => {
          const chapters = getEpicChapters(epic)
          const completed = chapters.filter(
            (chapter) =>
              state.progress.storyChapters[chapter.id]?.status === 'completed',
          ).length
          const estimatedMinutes = chapters.reduce(
            (total, chapter) => total + chapter.estimatedMinutes,
            0,
          )
          const unavailableInProduction = !isStoryContentAvailable(
            epic.contentStatus,
          )

          return (
            <Card key={epic.id} className="flex h-full flex-col gap-4">
              <div
                role="img"
                aria-label={`${resolveLocalizedText(epic.title, language)} story illustration placeholder`}
                className="flex aspect-[5/3] items-center justify-center rounded-2xl bg-gradient-to-br from-saffron-100 via-lotus-100 to-lavender-100 text-teal-700"
              >
                <BookHeart size={54} aria-hidden="true" />
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <h2 lang={language} className="text-2xl font-extrabold text-teal-800">
                  {resolveLocalizedText(epic.title, language)}
                </h2>
                <p lang={language} className="text-ink-700">
                  {resolveLocalizedText(epic.description, language)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm font-semibold text-ink-700">
                <span>
                  {completed} of {chapters.length} chapters
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={17} aria-hidden="true" />
                  About {estimatedMinutes} min
                </span>
              </div>
              <ProgressBar
                value={completed}
                max={Math.max(1, chapters.length)}
                label={`${resolveLocalizedText(epic.title, language)} progress`}
              />

              <StoryReviewNotice status={epic.contentStatus} />

              {unavailableInProduction ? (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-cream-100 px-5 font-bold text-ink-700"
                >
                  Coming soon
                </span>
              ) : (
                <Link
                  to={storyRoutes.epic(epic.id)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 font-bold text-white shadow-soft hover:bg-teal-700"
                >
                  {completed > 0 ? 'Continue path' : 'Explore path'}
                  <ArrowRight size={20} aria-hidden="true" />
                </Link>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
