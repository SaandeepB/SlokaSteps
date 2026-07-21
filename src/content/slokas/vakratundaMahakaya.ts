import type { Sloka, SlokaLine } from '../../types'
import { buildStandardActivities } from './buildActivities'

const id = 'vakratunda-mahakaya'

const lines: SlokaLine[] = [
  {
    id: `${id}-line-1`,
    devanagari: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ ।',
    transliteration: 'Vakratunda Mahakaya Suryakoti Samaprabha',
  },
  {
    id: `${id}-line-2`,
    devanagari: 'निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥',
    transliteration: 'Nirvighnam Kuru Me Deva Sarvakaryeshu Sarvada',
  },
]

export const vakratundaMahakaya: Sloka = {
  id,
  order: 2,
  level: 1,
  title: 'Vakratunda Mahakaya',
  theme: 'New Beginnings',
  estimatedMinutes: 6,
  implementationStatus: 'complete',
  contentReviewStatus: 'prototype',
  badge: {
    id: 'badge-bright-beginning',
    name: 'Bright Beginning Badge',
    motif: 'sun',
  },
  lines,
  meanings: {
    en: {
      title: 'A prayer for good beginnings',
      simpleMeaning:
        'O Ganesha, radiant and powerful, please help remove obstacles from the good things I begin.',
      culturalNote:
        'This sloka is often chanted before beginning a new task, journey, lesson, or celebration.',
      lineMeanings: [
        'O Ganesha, mighty and shining bright like countless suns.',
        'Please remove obstacles from all the good things I begin, always.',
      ],
      reviewStatus: 'prototype-reviewed',
    },
    hi: {
      title: 'शुभ शुरुआत की प्रार्थना',
      simpleMeaning:
        'हे गणेश जी, तेजस्वी और शक्तिशाली, मेरे अच्छे कामों की बाधाएँ दूर करने में मदद करें।',
      culturalNote:
        'यह श्लोक अक्सर कोई नया काम, यात्रा, पाठ या उत्सव शुरू करने से पहले बोला जाता है।',
      lineMeanings: [
        'हे गणेश जी, आप करोड़ों सूर्यों के समान तेजस्वी हैं।',
        'मेरे सभी अच्छे कामों की बाधाएँ हमेशा दूर करें।',
      ],
      reviewStatus: 'prototype-draft',
    },
  },
  activities: buildStandardActivities({
    slokaId: id,
    lines,
    fillBlank: {
      lineIndex: 0,
      blankWordIndex: 1,
      distractors: ['Nirvighnam', 'Sarvada'],
    },
    arrangeLineIndex: 1,
  }),
}
