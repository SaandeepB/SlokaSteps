import { Bookmark, BookmarkCheck, Image as ImageIcon } from 'lucide-react'
import type { SupportedLanguage } from '../../types/content'
import type { StoryScene } from '../../types/story'
import { resolveLocalizedText } from '../../content/stories'
import { PlayLineControls } from '../audio/PlayLineControls'
import { Button } from '../common/Button'
import { useState } from 'react'

export interface StorySceneCardProps {
  scene: StoryScene
  contentId: string
  sceneNumber: number
  sceneCount: number
  language: SupportedLanguage
  narrationLanguage: SupportedLanguage
  bookmarked: boolean
  onToggleBookmark: () => void
}

export function StorySceneCard({
  scene,
  contentId,
  sceneNumber,
  sceneCount,
  language,
  narrationLanguage,
  bookmarked,
  onToggleBookmark,
}: StorySceneCardProps) {
  const text = resolveLocalizedText(scene.text, language)
  const narrationText = resolveLocalizedText(scene.text, narrationLanguage)
  const [playbackState, setPlaybackState] = useState<'idle' | 'playing' | 'paused'>(
    'idle',
  )
  const readWithMeActive = playbackState !== 'idle'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-500">
          Scene {sceneNumber} of {sceneCount}
        </p>
        <Button
          variant="ghost"
          onClick={onToggleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? 'Remove scene bookmark' : 'Bookmark this scene'}
        >
          {bookmarked ? (
            <BookmarkCheck size={20} aria-hidden="true" />
          ) : (
            <Bookmark size={20} aria-hidden="true" />
          )}
          {bookmarked ? 'Saved' : 'Save'}
        </Button>
      </div>

      {scene.imageUrl ? (
        <img
          src={scene.imageUrl}
          alt={scene.imageAlt ? resolveLocalizedText(scene.imageAlt, language) : ''}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={
            scene.imageAlt
              ? resolveLocalizedText(scene.imageAlt, language)
              : 'Story illustration coming soon'
          }
          className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-saffron-100 via-lotus-100 to-sky-100 text-teal-700"
        >
          <span className="flex flex-col items-center gap-2 font-semibold">
            <ImageIcon size={44} aria-hidden="true" />
            Illustration coming soon
          </span>
        </div>
      )}

      <p
        lang={language}
        aria-current={readWithMeActive ? 'true' : undefined}
        className={`rounded-2xl p-4 text-xl leading-relaxed text-ink-900 transition-colors ${
          readWithMeActive
            ? 'bg-saffron-200 ring-2 ring-saffron-400'
            : 'bg-saffron-100/60'
        }`}
      >
        {text}
      </p>

      {readWithMeActive && (
        <p role="status" className="text-sm font-semibold text-saffron-700">
          Read with me · current story segment
        </p>
      )}

      <div>
        <h3 className="mb-2 font-bold text-ink-900">Hear this scene</h3>
        <PlayLineControls
          text={narrationText}
          language={narrationLanguage}
          audioQuery={{
            contentId,
            segmentId: scene.id,
            purpose: 'story-narration',
            language: narrationLanguage,
          }}
          onPlaybackStateChange={setPlaybackState}
        />
      </div>
    </div>
  )
}
