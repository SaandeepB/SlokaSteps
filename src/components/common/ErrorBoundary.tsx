import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { FriendlyError } from './FriendlyError'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Application-level boundary. Copy is intentionally hardcoded English:
 * the boundary must render even when state/translation providers crash.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('Sloka Steps error boundary caught:', error, info)
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-cream-50 p-4">
          <FriendlyError
            title="Something went wrong"
            body="Please reload the page. Previously saved progress should still be available when browser storage is enabled."
            actions={
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-11 rounded-2xl bg-teal-600 px-6 py-2 font-semibold text-white hover:bg-teal-700"
              >
                Reload
              </button>
            }
          />
        </div>
      )
    }
    return this.props.children
  }
}
