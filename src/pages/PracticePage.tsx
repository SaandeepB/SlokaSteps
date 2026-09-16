import { Link } from 'react-router-dom'
import { BookOpen, Headphones } from 'lucide-react'
import { PlayLineControls } from '../components/audio/PlayLineControls'
import { Card } from '../components/common/Card'
import { SLOKAS } from '../content/slokas'
import {
  EPICS,
  getEpicChapters,
  isStoryChapterAvailable,
  resolveLocalizedText,
} from '../content/stories'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { routes } from '../routes/paths'

export function PracticePage() {
  const { state } = useAppState()
  const { t } = useTranslation()
  const language = state.preferences.displayLanguage
  useDocumentTitle(t('practice'))

  const practicedSlokas = SLOKAS.filter(
    (sloka) => state.progress.slokas[sloka.id]?.status === 'completed',
  )
  const practicedStories = EPICS.flatMap((epic) =>
    getEpicChapters(epic)
      .filter(
        (chapter) =>
          isStoryChapterAvailable(chapter) &&
          state.progress.storyChapters[chapter.id]?.status === 'completed',
      )
      .map((chapter) => ({ epic, chapter })),
  )

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <h1 className="text-3xl font-extrabold text-teal-700">{t('practice')}</h1>
        <p className="mt-2 text-ink-700">
          Replay completed learning or listen quietly. Listen-only playback never marks a lesson complete.
        </p>
      </header>

      <section aria-labelledby="sloka-practice-title" className="flex flex-col gap-3">
        <h2 id="sloka-practice-title" className="text-xl font-bold text-ink-900">
          {t('slokas')}
        </h2>
        {(practicedSlokas.length > 0 ? practicedSlokas : SLOKAS.slice(0, 1)).map(
          (sloka) => (
            <Card key={sloka.id} className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-bold text-ink-900">{sloka.title}</h3>
                <p className="text-sm text-ink-500">Listen only · no XP or completion awarded</p>
              </div>
              <PlayLineControls
                text={sloka.lines.map((line) => line.transliteration).join('. ')}
                playLabelKey="listenFull"
                audioQuery={{
                  contentId: sloka.id,
                  segmentId: 'full',
                  purpose: 'canonical-chant',
                  language: 'sa-IN',
                }}
              />
              <Link
                to={routes.lesson(sloka.id)}
                className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-3 font-semibold text-teal-700 hover:bg-teal-100"
              >
                <BookOpen size={18} aria-hidden="true" />
                Open lesson
              </Link>
            </Card>
          ),
        )}
      </section>

      <section aria-labelledby="story-practice-title" className="flex flex-col gap-3">
        <h2 id="story-practice-title" className="text-xl font-bold text-ink-900">
          {t('stories')}
        </h2>
        {practicedStories.length === 0 ? (
          <Card>
            <p className="text-ink-700">Complete a story chapter to add it here for calm replay.</p>
            <Link to={routes.stories} className="mt-3 inline-flex font-semibold text-teal-700 underline">
              Explore story paths
            </Link>
          </Card>
        ) : (
          practicedStories.map(({ epic, chapter }) => (
            <Card key={chapter.id} className="flex items-center justify-between gap-4">
              <div>
                <h3 lang={language} className="font-bold text-ink-900">
                  {resolveLocalizedText(chapter.title, language)}
                </h3>
                <p lang={language} className="text-sm text-ink-500">
                  {resolveLocalizedText(epic.title, language)}
                </p>
              </div>
              <Link
                to={routes.storyChapter(epic.id, chapter.id)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-600 px-4 font-semibold text-white"
              >
                <Headphones size={18} aria-hidden="true" />
                Replay
              </Link>
            </Card>
          ))
        )}
      </section>
    </div>
  )
}
