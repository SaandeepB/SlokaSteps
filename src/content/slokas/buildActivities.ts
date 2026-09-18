import type { LessonActivity, SlokaLine } from '../../types'

export interface StandardActivityOptions {
  slokaId: string
  lines: SlokaLine[]
  fillBlank: {
    lineIndex: number
    blankWordIndex: number
    distractors: string[]
  }
  arrangeLineIndex: number
}

/**
 * Builds the standard lesson flow used by every fully interactive lesson:
 * introduction → (listen + repeat per line) → match → fill-blank →
 * arrange-words → full chant → completion. Longer slokas automatically get
 * more listen/repeat steps.
 *
 * The meaning is intentionally NOT a gated step: it is already presented on
 * the lesson overview before the child starts and is woven into the match
 * activity, so forcing a separate "read the meaning, press Continue" screen
 * added friction without adding learning.
 */
export function buildStandardActivities(
  options: StandardActivityOptions,
): LessonActivity[] {
  const { slokaId, lines, fillBlank, arrangeLineIndex } = options
  const activities: LessonActivity[] = [
    { id: `${slokaId}-intro`, type: 'introduction' },
  ]

  lines.forEach((_line, index) => {
    activities.push({
      id: `${slokaId}-listen-${index + 1}`,
      type: 'listen',
      lineIndex: index,
    })
    activities.push({
      id: `${slokaId}-repeat-${index + 1}`,
      type: 'repeat',
      lineIndex: index,
    })
  })

  activities.push({
    id: `${slokaId}-match`,
    type: 'match',
    pairs: lines.map((line, index) => ({
      id: `${slokaId}-pair-${index + 1}`,
      phrase: line.transliteration,
      lineIndex: index,
    })),
  })
  activities.push({
    id: `${slokaId}-fill`,
    type: 'fillBlank',
    lineIndex: fillBlank.lineIndex,
    blankWordIndex: fillBlank.blankWordIndex,
    distractors: fillBlank.distractors,
  })
  activities.push({
    id: `${slokaId}-arrange`,
    type: 'arrangeWords',
    lineIndex: arrangeLineIndex,
  })
  activities.push({ id: `${slokaId}-chant`, type: 'fullChant' })
  activities.push({ id: `${slokaId}-done`, type: 'completion' })
  return activities
}
