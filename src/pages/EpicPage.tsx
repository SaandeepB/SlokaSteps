import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Clock, LockKeyhole, Play } from 'lucide-react'
import { Card } from '../components/common/Card'
import { ProgressBar } from '../components/common/ProgressBar'
import { FriendlyError } from '../components/common/FriendlyError'
import { StoryReviewNotice } from '../components/story/StoryReviewNotice'
import {
  getEpicById,
  isStoryContentAvailable,
  resolveLocalizedText,
} from '../content/stories'
import { useAppState } from '../hooks/useAppState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { storyRoutes } from '../routes/storyPaths'

export function EpicPage() {
  const { epicId } = useParams()
  const { state } = useAppState()
  const language = state.preferences.displayLanguage
  const epic = getEpicById(epicId)

  useDocumentTitle(epic ? resolveLocalizedText(epic.title, language) : 'Story path')

  if (!epic) {
    return (
      <FriendlyError
        title="Story path not found"
        body="This story path may have moved. Your progress is still safe."
        actions={
          <Link to={storyRoutes.stories} className="font-semibold text-teal-700 underline">
            Return to Stories
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <Link
        to={storyRoutes.stories}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-2 font-semibold text-teal-700 hover:bg-teal-100"
      >
        <ArrowLeft size={20} aria-hidden="true" />
        All stories
      </Link>

      <header className="flex flex-col gap-3">
        <h1 lang={language} className="text-3xl font-extrabold text-teal-700">
          {resolveLocalizedText(epic.title, language)}
        </h1>
        <p lang={language} className="max-w-2xl text-lg text-ink-700">
          {resolveLocalizedText(epic.description, language)}
        </p>
        <StoryReviewNotice status={epic.contentStatus} />
      </header>

      {epic.books
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((book) => (
          <section key={book.id} aria-labelledby={`${book.id}-title`}>
            <h2
              id={`${book.id}-title`}
              lang={language}
              className="mb-3 text-xl font-bold text-ink-900"
            >
              {resolveLocalizedText(book.title, language)}
            </h2>
            <ol className="flex flex-col gap-4">
              {book.chapters
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((chapter) => {
                  const progress = state.progress.storyChapters[chapter.id]
                  const completed = progress?.status === 'completed'
                  const inProgress = progress?.status === 'in-progress'
                  const unavailableInProduction = !isStoryContentAvailable(
                    chapter.contentStatus,
                  )

                  return (
                    <li key={chapter.id}>
                      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                            completed
                              ? 'bg-leaf-100 text-leaf-700'
                              : unavailableInProduction
                                ? 'bg-cream-100 text-ink-500'
                                : 'bg-saffron-100 text-saffron-700'
                          }`}
                        >
                          {completed ? (
                            <Check size={24} />
                          ) : unavailableInProduction ? (
                            <LockKeyhole size={22} />
                          ) : (
                            <Play size={22} />
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink-500">
                            Chapter {chapter.order}
                          </p>
                          <h3 lang={language} className="text-xl font-bold text-ink-900">
                            {resolveLocalizedText(chapter.title, language)}
                          </h3>
                          <p lang={language} className="mt-1 text-ink-700">
                            {resolveLocalizedText(chapter.summary, language)}
                          </p>
                          <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ink-500">
                            <Clock size={16} aria-hidden="true" />
                            About {chapter.estimatedMinutes} min ·{' '}
                            {completed
                              ? 'Completed'
                              : inProgress
                                ? 'In progress'
                                : unavailableInProduction
                                  ? 'Coming soon'
                                  : 'Ready'}
                          </p>
                          {inProgress && (
                            <ProgressBar
                              value={1}
                              max={2}
                              label={`${resolveLocalizedText(chapter.title, language)} in progress`}
                              className="mt-2"
                            />
                          )}
                        </div>

                        {unavailableInProduction ? (
                          <span
                            aria-disabled="true"
                            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-cream-100 px-4 font-semibold text-ink-700"
                          >
                            Coming soon
                          </span>
                        ) : (
                          <Link
                            to={storyRoutes.chapter(epic.id, chapter.id)}
                            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 px-4 font-semibold text-white hover:bg-teal-700"
                          >
                            {completed ? 'Replay' : inProgress ? 'Continue' : 'Start'}
                          </Link>
                        )}
                      </Card>
                    </li>
                  )
                })}
            </ol>
          </section>
        ))}
    </div>
  )
}
