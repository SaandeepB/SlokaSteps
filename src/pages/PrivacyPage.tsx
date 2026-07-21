import { Card } from '../components/common/Card'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function PrivacyPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('privacyTitle'))

  const paragraphs = [
    t('privacyLocal'),
    t('privacyNoAccount'),
    t('privacyAudio'),
    t('privacyMicrophone'),
    t('privacyReview'),
  ]

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 py-4">
      <h1 className="text-3xl font-extrabold text-teal-700">
        {t('privacyHeading')}
      </h1>
      <Card className="flex flex-col gap-4">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-ink-700">
            {paragraph}
          </p>
        ))}
      </Card>
    </div>
  )
}
