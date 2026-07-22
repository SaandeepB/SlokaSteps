import { useId, useState } from 'react'
import type { SupportedLanguage } from '../../types/content'
import type { StoryValuesReflectionActivity } from '../../types/story'
import { resolveLocalizedText } from '../../content/stories'
import { Button } from '../common/Button'

export interface StoryReflectionActivityProps {
  activity: StoryValuesReflectionActivity
  language: SupportedLanguage
  onComplete: () => void
}

/** Guided reflection: every caring response is valid and no free text is collected. */
export function StoryReflectionActivity({
  activity,
  language,
  onComplete,
}: StoryReflectionActivityProps) {
  const groupName = useId()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reflected, setReflected] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <fieldset disabled={reflected} className="flex flex-col gap-3">
        <legend lang={language} className="mb-2 text-xl font-bold text-ink-900">
          {resolveLocalizedText(activity.prompt, language)}
        </legend>
        <p className="text-sm text-ink-500">Choose an idea you would like to try.</p>
        {activity.choices.map((choice) => (
          <label
            key={choice.id}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-lg ${
              selectedId === choice.id
                ? 'border-teal-600 bg-teal-100 text-teal-800'
                : 'border-cream-300 bg-white text-ink-900 hover:border-teal-300'
            }`}
          >
            <input
              type="radio"
              name={groupName}
              checked={selectedId === choice.id}
              onChange={() => setSelectedId(choice.id)}
              className="h-5 w-5 shrink-0"
            />
            <span lang={language}>{resolveLocalizedText(choice.text, language)}</span>
          </label>
        ))}
      </fieldset>

      {reflected && (
        <p role="status" lang={language} className="font-semibold text-leaf-700">
          {resolveLocalizedText(activity.encouragement, language)}
        </p>
      )}

      {reflected ? (
        <Button size="lg" onClick={onComplete} className="self-start">
          Continue
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={() => setReflected(true)}
          disabled={!selectedId}
          className="self-start"
        >
          Share my choice
        </Button>
      )}
    </div>
  )
}
