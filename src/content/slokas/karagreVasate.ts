import type { Sloka, SlokaLine } from '../../types'
import { buildStandardActivities } from './buildActivities'

const id = 'karagre-vasate'

const lines: SlokaLine[] = [
  {
    id: `${id}-line-1`,
    devanagari: 'कराग्रे वसते लक्ष्मीः करमध्ये सरस्वती ।',
    transliteration: 'Karagre Vasate Lakshmih Karamadhye Saraswati',
  },
  {
    id: `${id}-line-2`,
    devanagari: 'करमूले तु गोविन्दः प्रभाते करदर्शनम् ॥',
    transliteration: 'Karamule Tu Govindah Prabhate Karadarshanam',
  },
]

export const karagreVasate: Sloka = {
  id,
  order: 5,
  level: 1,
  title: 'Karagre Vasate Lakshmi',
  theme: 'A Mindful Morning',
  estimatedMinutes: 6,
  implementationStatus: 'complete',
  contentReviewStatus: 'prototype',
  badge: {
    id: 'badge-morning-light',
    name: 'Morning Light Badge',
    motif: 'lotus',
  },
  lines,
  meanings: {
    en: {
      title: 'A gentle morning start',
      simpleMeaning:
        'As I begin my morning, I remember prosperity, knowledge, and divine guidance in the work of my hands.',
      culturalNote:
        'Some families chant this sloka in the morning as a reminder to begin the day with gratitude and good actions.',
      lineMeanings: [
        'At the tips of my hands lives prosperity; in the middle, knowledge.',
        'At the base is divine guidance — so each morning I look at my hands with gratitude.',
      ],
      reviewStatus: 'prototype-reviewed',
    },
    hi: {
      title: 'सुबह की सुंदर शुरुआत',
      simpleMeaning:
        'सुबह की शुरुआत करते हुए मैं अपने हाथों के काम में समृद्धि, ज्ञान और ईश्वर के मार्गदर्शन को याद करती/करता हूँ।',
      culturalNote:
        'कुछ परिवार सुबह यह श्लोक बोलते हैं, ताकि दिन की शुरुआत कृतज्ञता और अच्छे कामों से हो।',
      lineMeanings: [
        'हाथों के अग्रभाग में लक्ष्मी और मध्य में सरस्वती का वास है।',
        'मूल भाग में गोविंद हैं — इसलिए सुबह अपने हाथों के दर्शन करते हैं।',
      ],
      reviewStatus: 'prototype-draft',
    },
  },
  activities: buildStandardActivities({
    slokaId: id,
    lines,
    fillBlank: {
      lineIndex: 0,
      blankWordIndex: 2,
      distractors: ['Govindah', 'Prabhate'],
    },
    arrangeLineIndex: 1,
  }),
}
