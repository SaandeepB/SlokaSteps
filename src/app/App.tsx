import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { RequireProfile } from '../routes/RequireProfile'
import { routePatterns } from '../routes/paths'
import { WelcomePage } from '../pages/WelcomePage'
import { SetupPage } from '../pages/SetupPage'
import { PathPage } from '../pages/PathPage'
import { LessonOverviewPage } from '../pages/LessonOverviewPage'
import { ActivityPage } from '../pages/ActivityPage'
import { CompletePage } from '../pages/CompletePage'
import { ParentPage } from '../pages/ParentPage'
import { SettingsPage } from '../pages/SettingsPage'
import { PrivacyPage } from '../pages/PrivacyPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={routePatterns.home} element={<WelcomePage />} />
        <Route path={routePatterns.setup} element={<SetupPage />} />
        <Route path={routePatterns.privacy} element={<PrivacyPage />} />
        <Route path={routePatterns.settings} element={<SettingsPage />} />
        <Route path={routePatterns.parent} element={<ParentPage />} />
        <Route element={<RequireProfile />}>
          <Route path={routePatterns.path} element={<PathPage />} />
          <Route path={routePatterns.lesson} element={<LessonOverviewPage />} />
          <Route path={routePatterns.activity} element={<ActivityPage />} />
          <Route path={routePatterns.complete} element={<CompletePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
