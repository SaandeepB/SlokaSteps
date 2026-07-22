import type { Sloka, SlokaLine } from '../../types'

const id = 'sarve-bhavantu'

const lines: SlokaLine[] = [
  {
    id: `${id}-line-1`,
    devanagari: 'सर्वे भवन्तु सुखिनः ।',
    transliteration: 'Sarve Bhavantu Sukhinah',
  },
  {
    id: `${id}-line-2`,
    devanagari: 'सर्वे सन्तु निरामयाः ।',
    transliteration: 'Sarve Santu Niramayah',
  },
  {
    id: `${id}-line-3`,
    devanagari: 'सर्वे भद्राणि पश्यन्तु ।',
    transliteration: 'Sarve Bhadrani Pashyantu',
  },
  {
    id: `${id}-line-4`,
    devanagari: 'मा कश्चिद्दुःखभाग्भवेत् ।',
    transliteration: 'Ma Kashchid Duhkhabhag Bhavet',
  },
  {
    id: `${id}-line-5`,
    devanagari: 'ॐ शान्तिः शान्तिः शान्तिः ॥',
    transliteration: 'Om Shantih Shantih Shantih',
  },
]

/**
 * Coming-soon preview lesson: full overview and content exist, but the
 * activity flow ships in a future Level 1 expansion. It never awards
 * completion, XP, stars, or badges in Version 1.
 */
export const sarveBhavantu: Sloka = {
  id,
  order: 9,
  level: 1,
  title: 'Sarve Bhavantu Sukhinah',
  theme: 'Kindness and Well-Being for All',
  estimatedMinutes: 8,
  implementationStatus: 'coming-soon',
  contentStatus: 'draft',
  editorial: { status: 'draft' },
  practiceStatus: 'not-started',
  contentReviewStatus: 'prototype',
  badge: { id: 'badge-kind-heart', name: 'Kindness Badge', motif: 'heart' },
  lines,
  meanings: {
    'en-IN': {
      title: 'Happiness for everyone',
      simpleMeaning:
        'This prayer wishes happiness, health, and goodness for everyone, everywhere — and that no one suffers.',
      culturalNote:
        'This well-known peace prayer expresses kindness and care for all beings.',
      lineMeanings: [
        'May everyone be happy.',
        'May everyone be healthy.',
        'May everyone see goodness around them.',
        'May no one experience sorrow.',
        'Om, peace, peace, peace.',
      ],
      reviewStatus: 'prototype-draft',
    },
  },
  activities: [],
}
