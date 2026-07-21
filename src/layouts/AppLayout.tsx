import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, matchPath } from 'react-router-dom'
import { Settings as SettingsIcon, ShieldCheck } from 'lucide-react'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { routePatterns, routes } from '../routes/paths'

/**
 * App frame: skip link, warm decorated background, tablet-width content
 * column on desktop, and a minimal header hidden during immersive lesson
 * activities. Moves focus to main content on route changes.
 */
export function AppLayout() {
  const { state } = useAppState()
  const { t } = useTranslation()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const isFirstRender = useRef(true)

  const isImmersive =
    matchPath(routePatterns.activity, location.pathname) !== null

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    mainRef.current?.focus()
  }, [location.pathname])

  return (
    <div
      className={`min-h-screen bg-cream-50 ${
        state.settings.reducedMotion ? 'reduce-motion' : ''
      }`}
    >
      {/* Subtle decorative background geometry (desktop only). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden lg:block"
        style={{
          backgroundImage:
            'radial-gradient(circle at 8% 15%, rgb(242 191 206 / 0.25) 0, transparent 22rem), radial-gradient(circle at 92% 20%, rgb(246 193 92 / 0.18) 0, transparent 20rem), radial-gradient(circle at 88% 85%, rgb(169 211 232 / 0.25) 0, transparent 24rem), radial-gradient(circle at 10% 88%, rgb(205 191 235 / 0.22) 0, transparent 20rem)',
        }}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-teal-700 focus:px-4 focus:py-2 focus:text-white"
      >
        {t('skipToContent')}
      </a>

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-10 sm:px-6">
        {!isImmersive && (
          <header className="flex items-center justify-between gap-3 py-4">
            <Link
              to={state.profile ? routes.path : routes.home}
              className="flex items-center gap-2 text-xl font-extrabold text-teal-700"
            >
              <LotusMark />
              Sloka Steps
            </Link>
            <nav aria-label="Main" className="flex items-center gap-1">
              <Link
                to={routes.settings}
                aria-label={t('settings')}
                title={t('settings')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-ink-700 hover:bg-cream-100"
              >
                <SettingsIcon size={22} aria-hidden="true" />
              </Link>
              <Link
                to={routes.parent}
                aria-label={t('parentArea')}
                title={t('parentArea')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-ink-700 hover:bg-cream-100"
              >
                <ShieldCheck size={22} aria-hidden="true" />
              </Link>
            </nav>
          </header>
        )}

        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 outline-none"
        >
          <Outlet />
        </main>

        {!isImmersive && (
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-cream-200 pt-4 text-sm text-ink-500">
            <span>{t('prototypeNote')}</span>
            <Link to={routes.privacy} className="font-medium text-teal-700 underline">
              {t('privacyTitle')}
            </Link>
          </footer>
        )}
      </div>
    </div>
  )
}

/** Tiny original lotus wordmark glyph. */
function LotusMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M14 4 C11 9 11 13 14 16 C17 13 17 9 14 4Z" fill="#D9829B" />
      <path d="M5 10 C7 14 10 16 14 16 C13 12 10 10 5 10Z" fill="#E8A0B4" />
      <path d="M23 10 C21 14 18 16 14 16 C15 12 18 10 23 10Z" fill="#E8A0B4" />
      <path d="M6 20 Q14 25 22 20 Q14 30 6 20Z" fill="#2A7F7F" />
    </svg>
  )
}
