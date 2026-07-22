import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Bookmark, Search, Sparkles } from 'lucide-react'
import { Card } from '../components/common/Card'
import { LearningModeSelector } from '../components/learn/LearningModeSelector'
import { SLOKAS } from '../content/slokas'
import {
  EPICS,
  getEpicChapters,
  resolveLocalizedText,
} from '../content/stories'
import { useAppState } from '../hooks/useAppState'
import { useTranslation } from '../hooks/useTranslation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { routes } from '../routes/paths'

interface SearchResult {
  id: string
  title: string
  detail: string
  to: string
}

export function LearnPage() {
  const { state, dispatch } = useAppState()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  useDocumentTitle(t('learn'))

  const language = state.preferences.displayLanguage
  const mode = state.progress.lastMode
  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language)
    if (!normalized) return []
    const results: SearchResult[] = []
    for (const sloka of SLOKAS) {
      if (`${sloka.title} ${sloka.theme}`.toLocaleLowerCase().includes(normalized)) {
        results.push({
          id: `sloka:${sloka.id}`,
          title: sloka.title,
          detail: sloka.theme,
          to: routes.lesson(sloka.id),
        })
      }
    }
    for (const epic of EPICS) {
      const epicTitle = resolveLocalizedText(epic.title, language)
      if (epicTitle.toLocaleLowerCase(language).includes(normalized)) {
        results.push({
          id: `epic:${epic.id}`,
          title: epicTitle,
          detail: t('stories'),
          to: routes.epic(epic.id),
        })
      }
      for (const chapter of getEpicChapters(epic)) {
        const chapterTitle = resolveLocalizedText(chapter.title, language)
        const searchable = [
          chapterTitle,
          ...chapter.characters.flatMap((character) => [
            resolveLocalizedText(character.name, language),
            resolveLocalizedText(character.description, language),
          ]),
          ...chapter.values.map((value) => resolveLocalizedText(value, language)),
        ]
          .join(' ')
          .toLocaleLowerCase(language)
        if (searchable.includes(normalized)) {
          results.push({
            id: `chapter:${chapter.id}`,
            title: chapterTitle,
            detail: epicTitle,
            to: routes.storyChapter(epic.id, chapter.id),
          })
        }
      }
    }
    return results.slice(0, 8)
  }, [language, query, t])

  const selectMode = (nextMode: 'slokas' | 'stories') => {
    dispatch({ type: 'SET_LEARNING_MODE', mode: nextMode })
    navigate(nextMode === 'slokas' ? routes.slokas : routes.stories)
  }

  const inProgressSloka = SLOKAS.find(
    (sloka) => state.progress.slokas[sloka.id]?.status === 'in-progress',
  )
  const inProgressStory = EPICS.flatMap((epic) =>
    getEpicChapters(epic).map((chapter) => ({ epic, chapter })),
  ).find(
    ({ chapter }) =>
      state.progress.storyChapters[chapter.id]?.status === 'in-progress',
  )

  const recommendation = inProgressSloka
    ? {
        title: `Continue ${inProgressSloka.title}`,
        body: 'Pick up at your saved step whenever you are ready.',
        to: routes.lesson(inProgressSloka.id),
      }
    : inProgressStory
      ? {
          title: `Continue ${resolveLocalizedText(inProgressStory.chapter.title, language)}`,
          body: 'Return to the next calm story moment.',
          to: routes.storyChapter(inProgressStory.epic.id, inProgressStory.chapter.id),
        }
      : {
          title: mode === 'stories' ? 'Begin a short story chapter' : 'Take one small sloka step',
          body: 'A few focused minutes is a wonderful way to learn today.',
          to: mode === 'stories' ? routes.stories : routes.slokas,
        }

  return (
    <div
      className={`flex flex-col gap-6 py-2 ${
        state.profile?.ageBand === '4-6' ? 'text-lg' : ''
      }`}
    >
      <header className="flex flex-col gap-2">
        <p className="text-sm font-bold uppercase tracking-wide text-saffron-700">
          Namaste, {state.profile?.nickname}
        </p>
        <h1 className="text-3xl font-extrabold text-teal-700">{t('learn')}</h1>
        <p className="text-ink-700">Choose a calm path and learn one small step at a time.</p>
      </header>

      <LearningModeSelector
        value={mode}
        onChange={selectMode}
        slokasLabel={t('slokas')}
        storiesLabel={t('stories')}
      />

      <Card className="flex flex-col gap-3 border-saffron-200 bg-saffron-50">
        <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-saffron-700">
          <Sparkles size={18} aria-hidden="true" />
          Today’s gentle suggestion
        </span>
        <h2 className="text-xl font-bold text-ink-900">{recommendation.title}</h2>
        <p className="text-ink-700">{recommendation.body}</p>
        <Link
          to={recommendation.to}
          className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-2xl bg-teal-600 px-5 font-bold text-white hover:bg-teal-700"
        >
          {t('continueAction')}
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
      </Card>

      <Card className="flex flex-col gap-3">
        <label htmlFor="learning-search" className="font-bold text-ink-900">
          <Search className="mr-2 inline" size={20} aria-hidden="true" />
          {t('search')}
        </label>
        <input
          id="learning-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Sloka, chapter, character, or value"
          className="min-h-12 rounded-xl border-2 border-cream-300 px-4 text-base"
        />
        {query && (
          <div aria-live="polite">
            {searchResults.length === 0 ? (
              <p className="text-sm text-ink-500">No matching learning content yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {searchResults.map((result) => (
                  <li key={result.id}>
                    <Link
                      to={result.to}
                      className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-cream-200 px-3 hover:border-teal-300"
                    >
                      <span>
                        <span className="block font-semibold text-ink-900">{result.title}</span>
                        <span className="block text-sm text-ink-500">{result.detail}</span>
                      </span>
                      <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-700">
        <Bookmark size={18} aria-hidden="true" />
        {state.progress.bookmarks.length} {t('bookmarks').toLocaleLowerCase()} saved on this device
      </p>
    </div>
  )
}
