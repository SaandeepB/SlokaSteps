import { describe, expect, it } from 'vitest'
import {
  EPICS,
  STORY_AVAILABILITY_POLICIES,
  STORY_LOCALES,
  getEpicChapters,
  isStoryChapterAvailable,
  isStoryContentAvailable,
} from '../content/stories'
import type { LocalizedText } from '../types/story'

function collectLocalizedText(value: unknown, output: LocalizedText[] = []) {
  if (!value || typeof value !== 'object') return output
  if ('en-IN' in value) {
    output.push(value as LocalizedText)
    return output
  }
  for (const nested of Object.values(value)) {
    collectLocalizedText(nested, output)
  }
  return output
}

describe('V2 story content', () => {
  it('ships one functional demonstration chapter for each epic', () => {
    expect(EPICS.map((epic) => epic.id)).toEqual(['ramayana', 'mahabharata'])

    for (const epic of EPICS) {
      const chapters = getEpicChapters(epic)
      expect(epic.contentStatus).toBe('editorial-review')
      expect(chapters).toHaveLength(1)

      const chapter = chapters[0]
      expect(chapter.contentStatus).toBe('editorial-review')
      expect(chapter.scenes.length).toBeGreaterThanOrEqual(4)
      expect(chapter.scenes.length).toBeLessThanOrEqual(6)
      expect(chapter.characters.length).toBeGreaterThan(0)
      expect(chapter.activities.map((activity) => activity.type)).toEqual([
        'event-ordering',
        'comprehension-quiz',
        'values-reflection',
      ])

      const quiz = chapter.activities.find(
        (activity) => activity.type === 'comprehension-quiz',
      )
      expect(quiz?.questions).toHaveLength(3)
      expect(chapter.recap['en-IN']).toBeTruthy()
      expect(chapter.completionReward.xp).toBeGreaterThan(0)
    }
  })

  it('provides a non-empty value for every supported locale field', () => {
    const localizedValues = collectLocalizedText(EPICS)
    expect(localizedValues.length).toBeGreaterThan(20)

    for (const value of localizedValues) {
      expect(Object.keys(value).sort()).toEqual([...STORY_LOCALES].sort())
      for (const locale of STORY_LOCALES) {
        expect(value[locale].trim()).not.toBe('')
      }
    }
  })

  it('keeps editorial-review content out of production interaction', () => {
    const realEditorialChapter = getEpicChapters(EPICS[0])[0]
    const approvedChapter = {
      ...realEditorialChapter,
      contentStatus: 'approved' as const,
    }

    expect(
      isStoryChapterAvailable(
        realEditorialChapter,
        STORY_AVAILABILITY_POLICIES.development,
      ),
    ).toBe(true)
    expect(
      isStoryChapterAvailable(
        realEditorialChapter,
        STORY_AVAILABILITY_POLICIES.production,
      ),
    ).toBe(false)
    expect(
      isStoryChapterAvailable(
        approvedChapter,
        STORY_AVAILABILITY_POLICIES.production,
      ),
    ).toBe(true)
    expect(
      isStoryChapterAvailable(
        undefined,
        STORY_AVAILABILITY_POLICIES.production,
      ),
    ).toBe(false)
    expect(
      isStoryContentAvailable(
        'approved',
        STORY_AVAILABILITY_POLICIES.production,
      ),
    ).toBe(true)
  })
})
