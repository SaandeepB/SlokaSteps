import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import { App } from './app/App'
import { AppStateProvider } from './context/AppStateProvider'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import {
  APP_ROUTER_BASENAME,
} from './routes/basePath'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppStateProvider>
        <BrowserRouter basename={APP_ROUTER_BASENAME}>
          <App />
        </BrowserRouter>
      </AppStateProvider>
    </ErrorBoundary>
  </StrictMode>,
)
