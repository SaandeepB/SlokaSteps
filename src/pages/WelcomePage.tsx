import { Link } from 'react-router-dom'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { Mitra } from '../components/common/Mitra'
import { LanguageSelector } from '../components/common/LanguageSelector'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { routes } from '../routes/paths'

export function WelcomePage() {
  const { state } = useAppState()
  const { t } = useTranslation()
  useDocumentTitle(t('tagline'))

  const startTarget = state.profile ? routes.learn : routes.setup

  return (
    <div className="flex flex-col items-center gap-8 py-8 text-center">
      <Mitra size={150} label={t('mitraAlt')} />

      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-extrabold text-teal-700 sm:text-5xl">
          Sloka Steps
        </h1>
        <p className="text-xl font-semibold text-saffron-600">{t('tagline')}</p>
        <p className="max-w-md text-lg text-ink-700">{t('welcomeIntro')}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link
          to={startTarget}
          className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 text-lg font-semibold text-white shadow-soft transition-colors hover:bg-teal-700"
        >
          <Sparkles size={22} aria-hidden="true" />
          {t('startLearning')}
        </Link>
        <Link
          to={routes.parent}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-cream-300 bg-white px-6 py-2 text-base font-semibold text-ink-700 transition-colors hover:border-saffron-400"
        >
          <ShieldCheck size={20} aria-hidden="true" />
          {t('parentArea')}
        </Link>
      </div>

      <LanguageSelector />

      {/* Decorative cultural pattern — sparse, original. */}
      <div aria-hidden="true" className="flex items-center gap-3 text-lotus-300">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} width="22" height="22" viewBox="0 0 22 22">
            <path
              d="M11 2 C8.5 6 8.5 9.5 11 12 C13.5 9.5 13.5 6 11 2Z"
              fill="currentColor"
            />
            <path
              d="M4 13 Q11 17.5 18 13 Q11 21 4 13Z"
              fill="currentColor"
              opacity="0.6"
            />
          </svg>
        ))}
      </div>

      <p className="max-w-md text-sm text-ink-500">{t('prototypeNote')}</p>
    </div>
  )
}
