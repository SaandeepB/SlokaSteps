import type { Sloka, SlokaLine } from '../../types'
import { buildStandardActivities } from './buildActivities'

const id = 'tvameva-mata'

const lines: SlokaLine[] = [
  {
    id: `${id}-line-1`,
    devanagari: 'त्वमेव माता च पिता त्वमेव ।',
    transliteration: 'Tvameva Mata Cha Pita Tvameva',
  },
  {
    id: `${id}-line-2`,
    devanagari: 'त्वमेव बन्धुश्च सखा त्वमेव ।',
    transliteration: 'Tvameva Bandhushcha Sakha Tvameva',
  },
  {
    id: `${id}-line-3`,
    devanagari: 'त्वमेव विद्या द्रविणं त्वमेव ।',
    transliteration: 'Tvameva Vidya Dravinam Tvameva',
  },
  {
    id: `${id}-line-4`,
    devanagari: 'त्वमेव सर्वं मम देवदेव ॥',
    transliteration: 'Tvameva Sarvam Mama Deva Deva',
  },
]

export const tvamevaMata: Sloka = {
  id,
  order: 4,
  level: 1,
  title: 'Tvameva Mata Cha Pita Tvameva',
  theme: 'Gratitude and Support',
  estimatedMinutes: 8,
  implementationStatus: 'complete',
  contentStatus: 'editorial-review',
  editorial: { status: 'editorial-review' },
  practiceStatus: 'available',
  contentReviewStatus: 'prototype',
  badge: {
    id: 'badge-grateful-heart',
    name: 'Grateful Heart Badge',
    motif: 'heart',
  },
  lines,
  meanings: {
    'en-IN': {
      title: 'You are everything to me',
      simpleMeaning:
        'You are like a mother, father, family member, friend, knowledge, and support to me. You are everything to me.',
      culturalNote:
        'This sloka expresses gratitude for the guidance, care, friendship, and knowledge we receive.',
      lineMeanings: [
        'You are like a mother and a father to me.',
        'You are like my family and my dear friend.',
        'You are knowledge and everything that supports me.',
        'You are everything to me.',
      ],
      reviewStatus: 'prototype-reviewed',
    },
    'hi-IN': {
      title: 'तुम ही मेरे सब कुछ हो',
      simpleMeaning:
        'आप ही मेरी माता, पिता, परिवार, मित्र, विद्या और सहारा हैं। आप ही मेरे सब कुछ हैं।',
      culturalNote:
        'यह श्लोक हमें मिलने वाले मार्गदर्शन, देखभाल, मित्रता और ज्ञान के लिए कृतज्ञता व्यक्त करता है।',
      lineMeanings: [
        'आप ही मेरी माता हैं और आप ही पिता हैं।',
        'आप ही मेरा परिवार हैं और आप ही मित्र हैं।',
        'आप ही विद्या हैं और आप ही मेरा सहारा हैं।',
        'आप ही मेरे सब कुछ हैं।',
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
      distractors: ['Sakha', 'Vidya'],
    },
    arrangeLineIndex: 3,
  }),
}
