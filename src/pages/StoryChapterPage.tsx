import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Headphones,
  Sparkles,
  Users,
} from 'lucide-react'
import type {
  StoryChapter,
  StoryOrderingActivity as StoryOrderingActivityModel,
  StoryQuizQuestion,
  StoryValuesReflectionActivity,
} from '../types/story'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { FriendlyError } from '../components/common/FriendlyError'
import { ProgressBar } from '../components/common/ProgressBar'
import { StoryOrderingActivity } from '../components/story/StoryOrderingActivity'
import { StoryQuizActivity } from '../components/story/StoryQuizActivity'
import { StoryReflectionActivity } from '../components/story/StoryReflectionActivity'
import { StoryReviewNotice } from '../components/story/StoryReviewNotice'
import { StorySceneCard } from '../components/story/StorySceneCard'
import {
  getStoryChapter,
  isStoryContentAvailable,
  resolveLocalizedText,
} from '../content/stories'
import { useAppState } from '../hooks/useAppState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { routes } from '../routes/paths'
import { storyRoutes } from '../routes/storyPaths'

type ChapterExperience =
  | 'choose'
  | 'lesson'
  | 'listen-only'
  | 'listen-complete'

type LessonStep =
  | { kind: 'scene'; sceneIndex: number }
  | { kind: 'characters' }
  | { kind: 'ordering'; activity: StoryOrderingActivityModel }
  | {
      kind: 'quiz'
      question: StoryQuizQuestion
      questionNumber: number
      questionCount: number
    }
  | { kind: 'reflection'; activity: StoryValuesReflectionActivity }
  | { kind: 'recap' }

function buildLessonSteps(chapter: StoryChapter): LessonStep[] {
  const steps: LessonStep[] = chapter.scenes.map((_scene, sceneIndex) => ({
    kind: 'scene',
    sceneIndex,
  }))
  steps.push({ kind: 'characters' })

  const ordering = chapter.activities.find(
    (activity) => activity.type === 'event-ordering',
  )
  if (ordering) steps.push({ kind: 'ordering', activity: ordering })

  const quiz = chapter.activities.find(
    (activity) => activity.type === 'comprehension-quiz',
  )
  quiz?.questions.forEach((question, index) => {
    steps.push({
      kind: 'quiz',
      question,
      questionNumber: index + 1,
      questionCount: quiz.questions.length,
    })
  })

  const reflection = chapter.activities.find(
    (activity) => activity.type === 'values-reflection',
  )
  if (reflection) steps.push({ kind: 'reflection', activity: reflection })
  steps.push({ kind: 'recap' })
  return steps
}

function stepHeading(step: LessonStep): string {
  switch (step.kind) {
    case 'scene':
      return `Story scene ${step.sceneIndex + 1}`
    case 'characters':
      return 'Meet the characters'
    case 'ordering':
      return 'Put the events in order'
    case 'quiz':
      return `Story question ${step.questionNumber}`
    case 'reflection':
      return 'Think about the story'
    case 'recap':
      return 'Chapter recap'
  }
}

function stepActivityId(chapter: StoryChapter, step: LessonStep): string {
  switch (step.kind) {
    case 'scene':
      return chapter.scenes[step.sceneIndex].id
    case 'characters':
      return `${chapter.id}-characters`
    case 'ordering':
      return step.activity.id
    case 'quiz':
      return step.question.id
    case 'reflection':
      return step.activity.id
    case 'recap':
      return `${chapter.id}-recap`
  }
}

export function StoryChapterPage() {
  const { epicId, chapterId } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useAppState()
  const language = state.preferences.displayLanguage
  const result = getStoryChapter(epicId, chapterId)
  const chapter = result?.chapter
  const epic = result?.epic
  const [experience, setExperience] = useState<ChapterExperience>('choose')
  const [stepIndex, setStepIndex] = useState(0)
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const lessonSteps = useMemo(
    () => (chapter ? buildLessonSteps(chapter) : []),
    [chapter],
  )

  useDocumentTitle(
    chapter ? resolveLocalizedText(chapter.title, language) : 'Story chapter',
  )

  useEffect(() => {
    setExperience('choose')
    setStepIndex(0)
  }, [chapterId])

  useEffect(() => {
    if (experience === 'lesson' || experience === 'listen-only') {
      stepHeadingRef.current?.focus()
    }
  }, [experience, stepIndex])

  if (!chapter || !epic) {
    return (
      <FriendlyError
        title="Story chapter not found"
        body="This chapter may have moved. Your progress is still safe."
        actions={
          <Link to={storyRoutes.stories} className="font-semibold text-teal-700 underline">
            Return to Stories
          </Link>
        }
      />
    )
  }

  const unavailableInProduction = !isStoryContentAvailable(chapter.contentStatus)

  if (unavailableInProduction) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 py-6">
        <Link
          to={storyRoutes.epic(epic.id)}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-2 font-semibold text-teal-700 hover:bg-teal-100"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Back to {resolveLocalizedText(epic.title, language)}
        </Link>
        <Card className="flex flex-col items-center gap-4 text-center">
          <Headphones size={54} aria-hidden="true" className="text-lavender-700" />
          <h1 lang={language} className="text-3xl font-extrabold text-teal-700">
            {resolveLocalizedText(chapter.title, language)}
          </h1>
          <p className="text-lg font-semibold text-ink-700">Coming soon</p>
          <p className="text-ink-500">
            This chapter will open after cultural and editorial review.
          </p>
        </Card>
      </div>
    )
  }

  const ageBand = state.profile?.ageBand ?? '7-8'
  const readingClass =
    ageBand === '4-6'
      ? 'text-lg sm:text-xl'
      : ageBand === '9-10'
        ? 'text-base'
        : 'text-lg'
  const bookmarks = state.progress.bookmarks
  const chapterBookmarkId = `story-chapter:${chapter.id}`
  const chapterBookmarked = bookmarks.some(
    (bookmark) =>
      bookmark.type === 'story-chapter' && bookmark.contentId === chapter.id,
  )

  const toggleChapterBookmark = () => {
    dispatch({
      type: 'TOGGLE_BOOKMARK',
      bookmark: {
        id: chapterBookmarkId,
        type: 'story-chapter',
        contentId: chapter.id,
        createdAt: new Date().toISOString(),
      },
    })
  }

  const toggleSceneBookmark = (sceneId: string) => {
    dispatch({
      type: 'TOGGLE_BOOKMARK',
      bookmark: {
        id: `story-scene:${sceneId}`,
        type: 'story-scene',
        contentId: sceneId,
        parentContentId: chapter.id,
        createdAt: new Date().toISOString(),
      },
    })
  }

  const startLesson = () => {
    dispatch({ type: 'START_STORY_CHAPTER', chapterId: chapter.id })
    const savedActivityId =
      state.progress.storyChapters[chapter.id]?.status === 'in-progress'
        ? state.progress.storyChapters[chapter.id]?.currentActivityId
        : null
    const savedIndex = savedActivityId
      ? lessonSteps.findIndex(
          (candidate) => stepActivityId(chapter, candidate) === savedActivityId,
        )
      : -1
    setStepIndex(savedIndex >= 0 ? savedIndex : 0)
    setExperience('lesson')
  }

  const startListenOnly = () => {
    // Passive listening deliberately does not dispatch completion or award XP.
    setStepIndex(0)
    setExperience('listen-only')
  }

  const finishLesson = () => {
    dispatch({
      type: 'COMPLETE_STORY_CHAPTER',
      chapterId: chapter.id,
      completedAt: new Date().toISOString(),
      xpEarned: chapter.completionReward.xp,
    })
    navigate(routes.contentComplete('story', chapter.id), { replace: true })
  }

  const advanceLesson = () => {
    const currentStep = lessonSteps[stepIndex]
    if (stepIndex >= lessonSteps.length - 1) {
      finishLesson()
    } else {
      const nextStep = lessonSteps[stepIndex + 1]
      dispatch({
        type: 'ADVANCE_STORY_ACTIVITY',
        chapterId: chapter.id,
        activityId: stepActivityId(chapter, nextStep),
        completedActivityId: stepActivityId(chapter, currentStep),
      })
      setStepIndex((current) => current + 1)
    }
  }

  const recordIncorrectAttempt = () => {
    dispatch({
      type: 'RECORD_STORY_INCORRECT_ATTEMPT',
      chapterId: chapter.id,
    })
  }

  if (experience === 'choose') {
    return (
      <div className="flex flex-col gap-5 py-2">
        <Link
          to={storyRoutes.epic(epic.id)}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-2 font-semibold text-teal-700 hover:bg-teal-100"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Back to {resolveLocalizedText(epic.title, language)}
        </Link>

        <StoryReviewNotice status={chapter.contentStatus} />

        <Card className={`flex flex-col gap-5 ${readingClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink-500">
                Chapter {chapter.order} · About {chapter.estimatedMinutes} min
              </p>
              <h1 lang={language} className="mt-1 text-3xl font-extrabold text-teal-700">
                {resolveLocalizedText(chapter.title, language)}
              </h1>
            </div>
            <Button
              variant="ghost"
              onClick={toggleChapterBookmark}
              aria-pressed={chapterBookmarked}
            >
              {chapterBookmarked ? (
                <BookmarkCheck size={20} aria-hidden="true" />
              ) : (
                <Bookmark size={20} aria-hidden="true" />
              )}
              {chapterBookmarked ? 'Saved' : 'Save chapter'}
            </Button>
          </div>

          <p lang={language} className="text-ink-700">
            {resolveLocalizedText(chapter.summary, language)}
          </p>

          <div className="grid grid-cols-2 gap-3 text-center text-sm font-semibold text-ink-700">
            <span className="rounded-2xl bg-sky-100 p-3">
              {chapter.scenes.length} short scenes
            </span>
            <span className="rounded-2xl bg-lavender-100 p-3">
              3 story activities
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={startLesson}>
              <Sparkles size={21} aria-hidden="true" />
              Start chapter
            </Button>
            <Button variant="secondary" size="lg" onClick={startListenOnly}>
              <Headphones size={21} aria-hidden="true" />
              Listen only
            </Button>
          </div>
          <p className="text-sm text-ink-500">
            Listen-only mode is for relaxed replay. Complete the activities to earn
            the chapter reward.
          </p>
        </Card>
      </div>
    )
  }

  if (experience === 'listen-complete') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 py-8 text-center">
        <Headphones size={64} aria-hidden="true" className="mx-auto text-teal-700" />
        <h1 className="text-3xl font-extrabold text-teal-700">Listening complete</h1>
        <p className="text-lg text-ink-700">
          You heard the whole chapter. No lesson completion or XP was awarded in
          listen-only mode.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={startLesson}>
            Try the activities
          </Button>
          <Link
            to={storyRoutes.epic(epic.id)}
            className="inline-flex min-h-13 items-center rounded-2xl px-5 font-semibold text-teal-700 hover:bg-teal-100"
          >
            Return to path
          </Link>
        </div>
      </div>
    )
  }

  if (experience === 'listen-only') {
    const scene = chapter.scenes[stepIndex]
    const sceneBookmarked = bookmarks.some(
      (bookmark) =>
        bookmark.type === 'story-scene' && bookmark.contentId === scene.id,
    )

    return (
      <div className={`flex min-h-screen flex-col gap-5 py-3 ${readingClass}`}>
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() =>
                stepIndex === 0
                  ? setExperience('choose')
                  : setStepIndex((current) => current - 1)
              }
              aria-label={stepIndex === 0 ? 'Leave listen-only mode' : 'Previous scene'}
            >
              <ArrowLeft size={20} aria-hidden="true" />
              Back
            </Button>
            <span className="text-sm font-bold text-teal-700">Listen only</span>
            <span className="w-16" aria-hidden="true" />
          </div>
          <ProgressBar
            value={stepIndex + 1}
            max={chapter.scenes.length}
            label="Listen-only chapter progress"
          />
        </header>

        <section aria-labelledby="listen-step-heading">
          <h2
            id="listen-step-heading"
            ref={stepHeadingRef}
            tabIndex={-1}
            className="mb-3 text-2xl font-bold text-teal-700 outline-none"
          >
            Story scene {stepIndex + 1}
          </h2>
          <Card>
            <StorySceneCard
              scene={scene}
              contentId={chapter.id}
              sceneNumber={stepIndex + 1}
              sceneCount={chapter.scenes.length}
              language={language}
              narrationLanguage={state.preferences.narrationLanguage}
              bookmarked={sceneBookmarked}
              onToggleBookmark={() => toggleSceneBookmark(scene.id)}
            />
          </Card>
        </section>

        <Button
          size="lg"
          onClick={() => {
            if (stepIndex === chapter.scenes.length - 1) {
              // Intentionally no COMPLETE_STORY_CHAPTER dispatch here.
              setExperience('listen-complete')
            } else {
              setStepIndex((current) => current + 1)
            }
          }}
          className="self-end"
        >
          {stepIndex === chapter.scenes.length - 1 ? 'Finish listening' : 'Next scene'}
        </Button>
      </div>
    )
  }

  const step = lessonSteps[stepIndex]
  if (!step) return null

  const renderStep = () => {
    switch (step.kind) {
      case 'scene': {
        const scene = chapter.scenes[step.sceneIndex]
        const bookmarked = bookmarks.some(
          (bookmark) =>
            bookmark.type === 'story-scene' && bookmark.contentId === scene.id,
        )
        return (
          <StorySceneCard
            scene={scene}
            contentId={chapter.id}
            sceneNumber={step.sceneIndex + 1}
            sceneCount={chapter.scenes.length}
            language={language}
            narrationLanguage={state.preferences.narrationLanguage}
            bookmarked={bookmarked}
            onToggleBookmark={() => toggleSceneBookmark(scene.id)}
          />
        )
      }
      case 'characters':
        return (
          <div className="flex flex-col gap-5">
            <p className="text-lg text-ink-700">
              Notice how each person belongs to this part of the story.
            </p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {chapter.characters.map((character) => (
                <li key={character.id} className="rounded-2xl bg-cream-100 p-4">
                  <h3 lang={language} className="font-bold text-teal-800">
                    {resolveLocalizedText(character.name, language)}
                  </h3>
                  <p lang={language} className="text-sm font-semibold text-saffron-700">
                    {resolveLocalizedText(character.role, language)}
                  </p>
                  <p lang={language} className="mt-2 text-ink-700">
                    {resolveLocalizedText(character.description, language)}
                  </p>
                </li>
              ))}
            </ul>
            <Button size="lg" onClick={advanceLesson} className="self-start">
              Continue
            </Button>
          </div>
        )
      case 'ordering':
        return (
          <StoryOrderingActivity
            key={step.activity.id}
            activity={step.activity}
            language={language}
            onComplete={advanceLesson}
            onIncorrectAttempt={recordIncorrectAttempt}
          />
        )
      case 'quiz':
        return (
          <StoryQuizActivity
            key={step.question.id}
            question={step.question}
            questionNumber={step.questionNumber}
            questionCount={step.questionCount}
            language={language}
            onComplete={advanceLesson}
            onIncorrectAttempt={recordIncorrectAttempt}
          />
        )
      case 'reflection':
        return (
          <StoryReflectionActivity
            key={step.activity.id}
            activity={step.activity}
            language={language}
            onComplete={advanceLesson}
          />
        )
      case 'recap':
        return (
          <div className="flex flex-col gap-5">
            <p lang={language} className="text-xl leading-relaxed text-ink-900">
              {resolveLocalizedText(chapter.recap, language)}
            </p>
            <div>
              <h3 className="mb-2 font-bold text-ink-900">Values in this chapter</h3>
              <ul className="flex flex-wrap gap-2">
                {chapter.values.map((value, index) => (
                  <li
                    key={index}
                    lang={language}
                    className="rounded-full bg-lavender-100 px-4 py-2 font-semibold text-lavender-700"
                  >
                    {resolveLocalizedText(value, language)}
                  </li>
                ))}
              </ul>
            </div>
            <Button size="lg" onClick={advanceLesson} className="self-start">
              Complete chapter
            </Button>
          </div>
        )
    }
  }

  return (
    <div className={`flex min-h-screen flex-col gap-5 py-3 ${readingClass}`}>
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() =>
              stepIndex === 0
                ? setExperience('choose')
                : setStepIndex((current) => current - 1)
            }
            aria-label={stepIndex === 0 ? 'Leave chapter activities' : 'Previous step'}
          >
            <ArrowLeft size={20} aria-hidden="true" />
            Back
          </Button>
          <span className="truncate text-sm font-bold text-teal-700">
            {resolveLocalizedText(chapter.title, language)}
          </span>
          <Link
            to={storyRoutes.epic(epic.id)}
            className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-ink-700 hover:bg-cream-100"
          >
            Exit
          </Link>
        </div>
        <ProgressBar
          value={stepIndex + 1}
          max={lessonSteps.length}
          label="Chapter activity progress"
        />
        <p className="text-center text-sm font-semibold text-ink-500">
          Step {stepIndex + 1} of {lessonSteps.length}
        </p>
      </header>

      <section aria-labelledby="story-step-heading">
        <h2
          id="story-step-heading"
          ref={stepHeadingRef}
          tabIndex={-1}
          className="mb-3 flex items-center gap-2 text-2xl font-bold text-teal-700 outline-none"
        >
          {step.kind === 'characters' && <Users size={25} aria-hidden="true" />}
          {stepHeading(step)}
        </h2>
        <Card>{renderStep()}</Card>
      </section>
    </div>
  )
}
