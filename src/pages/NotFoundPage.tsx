import { Link } from 'react-router-dom'
import { FriendlyError } from '../components/common/FriendlyError'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { routes } from '../routes/paths'

export function NotFoundPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('notFoundTitle'))
  return (
    <div className="py-10">
      <FriendlyError
        title={t('notFoundTitle')}
        body={t('notFoundBody')}
        actions={
          <Link
            to={routes.home}
            className="inline-flex min-h-11 items-center rounded-2xl bg-teal-600 px-6 font-semibold text-white hover:bg-teal-700"
          >
            {t('goHome')}
          </Link>
        }
      />
    </div>
  )
}
