import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { RequireProfile } from '../routes/RequireProfile'
import { routePatterns, routes } from '../routes/paths'

const WelcomePage = lazy(() =>
  import('../pages/WelcomePage').then((module) => ({ default: module.WelcomePage })),
)
const SetupPage = lazy(() =>
  import('../pages/SetupPage').then((module) => ({ default: module.SetupPage })),
)
const LearnPage = lazy(() =>
  import('../pages/LearnPage').then((module) => ({ default: module.LearnPage })),
)
const PathPage = lazy(() =>
  import('../pages/PathPage').then((module) => ({ default: module.PathPage })),
)
const LessonOverviewPage = lazy(() =>
  import('../pages/LessonOverviewPage').then((module) => ({
    default: module.LessonOverviewPage,
  })),
)
const ActivityPage = lazy(() =>
  import('../pages/ActivityPage').then((module) => ({ default: module.ActivityPage })),
)
const CompletePage = lazy(() =>
  import('../pages/CompletePage').then((module) => ({ default: module.CompletePage })),
)
const StoriesPage = lazy(() =>
  import('../pages/StoriesPage').then((module) => ({ default: module.StoriesPage })),
)
const EpicPage = lazy(() =>
  import('../pages/EpicPage').then((module) => ({ default: module.EpicPage })),
)
const StoryChapterPage = lazy(() =>
  import('../pages/StoryChapterPage').then((module) => ({
    default: module.StoryChapterPage,
  })),
)
const PracticePage = lazy(() =>
  import('../pages/PracticePage').then((module) => ({ default: module.PracticePage })),
)
const RewardsPage = lazy(() =>
  import('../pages/RewardsPage').then((module) => ({ default: module.RewardsPage })),
)
const ParentPage = lazy(() =>
  import('../pages/ParentPage').then((module) => ({ default: module.ParentPage })),
)
const SettingsPage = lazy(() =>
  import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)
const PrivacyPage = lazy(() =>
  import('../pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })),
)
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)
const AudioLabPage = import.meta.env.DEV
  ? lazy(() =>
      import('../pages/AudioLabPage').then((module) => ({
        default: module.AudioLabPage,
      })),
    )
  : null
const ChantLabPage = import.meta.env.DEV
  ? lazy(() =>
      import('../pages/ChantLabPage').then((module) => ({
        default: module.ChantLabPage,
      })),
    )
  : null

export function App() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={routePatterns.home} element={<WelcomePage />} />
          <Route path={routePatterns.setup} element={<SetupPage />} />
          <Route path={routePatterns.privacy} element={<PrivacyPage />} />
          <Route path={routePatterns.settings} element={<SettingsPage />} />
          <Route path={routePatterns.parent} element={<ParentPage />} />

          <Route element={<RequireProfile />}>
            <Route path={routePatterns.learn} element={<LearnPage />} />
            <Route path={routePatterns.path} element={<PathPage />} />
            <Route path={routePatterns.lesson} element={<LessonOverviewPage />} />
            <Route path={routePatterns.activity} element={<ActivityPage />} />
            <Route path={routePatterns.stories} element={<StoriesPage />} />
            <Route path={routePatterns.epic} element={<EpicPage />} />
            <Route path={routePatterns.storyChapter} element={<StoryChapterPage />} />
            <Route path={routePatterns.practice} element={<PracticePage />} />
            <Route path={routePatterns.rewards} element={<RewardsPage />} />
            <Route path={routePatterns.complete} element={<CompletePage />} />

            <Route path={routePatterns.legacyPath} element={<Navigate to={routes.slokas} replace />} />
            <Route path={routePatterns.legacyLesson} element={<LegacySlokaRedirect kind="overview" />} />
            <Route path={routePatterns.legacyActivity} element={<LegacySlokaRedirect kind="activity" />} />
            <Route path={routePatterns.legacyComplete} element={<LegacySlokaRedirect kind="complete" />} />
          </Route>

          {AudioLabPage && ChantLabPage && (
            <>
              <Route path={routePatterns.audioLab} element={<AudioLabPage />} />
              <Route path={routePatterns.chantLab} element={<ChantLabPage />} />
            </>
          )}

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function LegacySlokaRedirect({ kind }: { kind: 'overview' | 'activity' | 'complete' }) {
  const { slokaId, activityId } = useParams()
  if (!slokaId) return <Navigate to={routes.slokas} replace />
  if (kind === 'activity' && activityId) {
    return <Navigate to={routes.activity(slokaId, activityId)} replace />
  }
  if (kind === 'complete') return <Navigate to={routes.complete(slokaId)} replace />
  return <Navigate to={routes.lesson(slokaId)} replace />
}

function LoadingState() {
  return (
    <div role="status" className="flex min-h-48 items-center justify-center text-lg font-semibold text-teal-700">
      Mitra is getting the next step ready…
    </div>
  )
}
