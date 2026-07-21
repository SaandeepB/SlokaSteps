import type { Sloka, SlokaLine } from '../../types'
import { buildStandardActivities } from './buildActivities'

const id = 'guru-brahma'

const lines: SlokaLine[] = [
  {
    id: `${id}-line-1`,
    devanagari: 'गुरुर्ब्रह्मा गुरुर्विष्णुर्गुरुर्देवो महेश्वरः ।',
    transliteration: 'Gurur Brahma Gurur Vishnuh Gurur Devo Maheshvarah',
  },
  {
    id: `${id}-line-2`,
    devanagari: 'गुरुः साक्षात् परं ब्रह्म तस्मै श्रीगुरवे नमः ॥',
    transliteration: 'Guruh Sakshat Param Brahma Tasmai Shri Gurave Namah',
  },
]

export const guruBrahma: Sloka = {
  id,
  order: 3,
  level: 1,
  title: 'Guru Brahma',
  theme: 'Respect for Teachers',
  estimatedMinutes: 6,
  implementationStatus: 'complete',
  contentReviewStatus: 'prototype',
  badge: {
    id: 'badge-gratitude-teachers',
    name: 'Gratitude to Teachers Badge',
    motif: 'bell',
  },
  lines,
  meanings: {
    en: {
      title: 'Honoring our teachers',
      simpleMeaning:
        'A teacher helps us create, understand, and transform knowledge. I offer respect and gratitude to my teacher.',
      culturalNote:
        'This sloka teaches children to respect the people who guide them and help them learn.',
      lineMeanings: [
        'A teacher helps us create, care for, and transform what we know.',
        'I offer my respect and gratitude to my teacher.',
      ],
      reviewStatus: 'prototype-reviewed',
    },
    hi: {
      title: 'गुरु का सम्मान',
      simpleMeaning:
        'गुरु हमें ज्ञान बनाना, समझना और बदलना सिखाते हैं। मैं अपने गुरु को आदर और धन्यवाद देती/देता हूँ।',
      culturalNote:
        'यह श्लोक बच्चों को उन लोगों का सम्मान करना सिखाता है जो उन्हें राह दिखाते हैं और सीखने में मदद करते हैं।',
      lineMeanings: [
        'गुरु हमें ज्ञान को बनाना, सँभालना और बदलना सिखाते हैं।',
        'मैं अपने गुरु को आदरपूर्वक प्रणाम करती/करता हूँ।',
      ],
      reviewStatus: 'prototype-draft',
    },
  },
  activities: buildStandardActivities({
    slokaId: id,
    lines,
    fillBlank: {
      lineIndex: 0,
      blankWordIndex: 3,
      distractors: ['Namah', 'Sakshat'],
    },
    arrangeLineIndex: 1,
  }),
}
