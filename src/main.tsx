import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import { App } from './app/App'
import { AppStateProvider } from './context/AppStateProvider'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { ChantCoachManager } from './hooks/useChantCoach'
import {
  APP_ROUTER_BASENAME,
} from './routes/basePath'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppStateProvider>
        {/* Drives the on-device Chant Coach runtime from parent settings. */}
        <ChantCoachManager />
        <BrowserRouter basename={APP_ROUTER_BASENAME}>
          <App />
        </BrowserRouter>
      </AppStateProvider>
    </ErrorBoundary>
  </StrictMode>,
)
