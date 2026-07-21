import type { Sloka, SlokaLine } from '../../types'

const id = 'asato-ma'

const lines: SlokaLine[] = [
  {
    id: `${id}-line-1`,
    devanagari: 'असतो मा सद्गमय ।',
    transliteration: 'Asato Ma Sadgamaya',
  },
  {
    id: `${id}-line-2`,
    devanagari: 'तमसो मा ज्योतिर्गमय ।',
    transliteration: 'Tamaso Ma Jyotirgamaya',
  },
  {
    id: `${id}-line-3`,
    devanagari: 'मृत्योर्मा अमृतं गमय ।',
    transliteration: 'Mrityor Ma Amritam Gamaya',
  },
  {
    id: `${id}-line-4`,
    devanagari: 'ॐ शान्तिः शान्तिः शान्तिः ॥',
    transliteration: 'Om Shantih Shantih Shantih',
  },
]

/**
 * Coming-soon preview lesson: full overview and content exist, but the
 * activity flow ships in a future Level 1 expansion. It never awards
 * completion, XP, stars, or badges in Version 1.
 */
export const asatoMa: Sloka = {
  id,
  order: 7,
  level: 1,
  title: 'Asato Ma Sadgamaya',
  theme: 'Truth and Inner Light',
  estimatedMinutes: 8,
  implementationStatus: 'coming-soon',
  contentReviewStatus: 'prototype',
  badge: { id: 'badge-inner-light', name: 'Inner Light Badge', motif: 'lamp' },
  lines,
  meanings: {
    en: {
      title: 'From darkness to light',
      simpleMeaning:
        'This prayer asks to be guided from untruth to truth, from darkness to light, and toward what is lasting and peaceful.',
      culturalNote:
        'Many families and schools chant this peace prayer at the end of study or gatherings.',
      lineMeanings: [
        'Lead me from untruth to truth.',
        'Lead me from darkness to light.',
        'Lead me from what fades to what lasts.',
        'Om, peace, peace, peace.',
      ],
      reviewStatus: 'prototype-draft',
    },
  },
  activities: [],
}
