import type { Sloka, SlokaLine } from '../../types'
import { buildStandardActivities } from './buildActivities'

const id = 'saraswati-namastubhyam'

const lines: SlokaLine[] = [
  {
    id: `${id}-line-1`,
    devanagari: 'सरस्वति नमस्तुभ्यं वरदे कामरूपिणि ।',
    transliteration: 'Saraswati Namastubhyam Varade Kamarupini',
  },
  {
    id: `${id}-line-2`,
    devanagari: 'विद्यारम्भं करिष्यामि सिद्धिर्भवतु मे सदा ॥',
    transliteration: 'Vidyarambham Karishyami Siddhir Bhavatu Me Sada',
  },
]

export const saraswatiNamastubhyam: Sloka = {
  id,
  order: 1,
  level: 1,
  title: 'Saraswati Namastubhyam',
  theme: 'Learning and Wisdom',
  estimatedMinutes: 6,
  implementationStatus: 'complete',
  contentStatus: 'editorial-review',
  editorial: { status: 'editorial-review' },
  practiceStatus: 'available',
  contentReviewStatus: 'prototype',
  badge: { id: 'badge-wisdom', name: 'Wisdom Badge', motif: 'book' },
  lines,
  meanings: {
    'en-IN': {
      title: 'A prayer to begin learning',
      simpleMeaning:
        'I bow to Goddess Saraswati, who represents knowledge and wisdom. Please bless me as I begin learning.',
      culturalNote:
        'Children often chant this sloka before studying, reading, or beginning schoolwork.',
      lineMeanings: [
        'I bow to Goddess Saraswati, who blesses us with knowledge and wisdom.',
        'As I begin my learning, may I always be blessed with success.',
      ],
      reviewStatus: 'prototype-reviewed',
    },
    'hi-IN': {
      title: 'पढ़ाई शुरू करने की प्रार्थना',
      simpleMeaning:
        'मैं ज्ञान और विद्या की देवी सरस्वती को प्रणाम करती/करता हूँ। पढ़ाई शुरू करते समय मुझे आशीर्वाद दें।',
      culturalNote:
        'बच्चे अक्सर पढ़ाई, किताब पढ़ने या स्कूल का काम शुरू करने से पहले यह श्लोक बोलते हैं।',
      lineMeanings: [
        'मैं देवी सरस्वती को प्रणाम करती/करता हूँ, जो हमें ज्ञान देती हैं।',
        'जैसे ही मैं पढ़ाई शुरू करूँ, मुझे हमेशा सफलता मिले।',
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
      distractors: ['Karishyami', 'Sada'],
    },
    arrangeLineIndex: 1,
  }),
}
