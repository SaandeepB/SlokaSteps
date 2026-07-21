import type { Sloka, SlokaLine } from '../../types'
import { buildStandardActivities } from './buildActivities'

const id = 'shubham-karoti'

const lines: SlokaLine[] = [
  {
    id: `${id}-line-1`,
    devanagari: 'शुभं करोति कल्याणम् आरोग्यं धनसम्पदा ।',
    transliteration: 'Shubham Karoti Kalyanam Arogyam Dhana Sampada',
  },
  {
    id: `${id}-line-2`,
    devanagari: 'शत्रुबुद्धिविनाशाय दीपज्योतिर्नमोऽस्तु ते ॥',
    transliteration: 'Shatru Buddhi Vinashaya Deepa Jyotir Namostute',
  },
]

export const shubhamKaroti: Sloka = {
  id,
  order: 6,
  level: 1,
  title: 'Shubham Karoti Kalyanam',
  theme: 'Light and Well-Being',
  estimatedMinutes: 6,
  implementationStatus: 'complete',
  contentReviewStatus: 'prototype',
  badge: { id: 'badge-little-light', name: 'Little Light Badge', motif: 'lamp' },
  lines,
  meanings: {
    en: {
      title: 'Bowing to the light',
      simpleMeaning:
        'I bow to the light that represents goodness, health, well-being, and the removal of harmful thoughts.',
      culturalNote:
        'This sloka is often associated with lighting a lamp and remembering the positive meaning of light.',
      lineMeanings: [
        'The light brings goodness, well-being, health, and prosperity.',
        'I bow to the lamp’s light that removes harmful thoughts.',
      ],
      reviewStatus: 'prototype-reviewed',
    },
    hi: {
      title: 'दीप ज्योति को प्रणाम',
      simpleMeaning:
        'मैं उस ज्योति को प्रणाम करती/करता हूँ जो शुभता, स्वास्थ्य, कल्याण और बुरे विचारों को दूर करने का प्रतीक है।',
      culturalNote:
        'यह श्लोक अक्सर दीपक जलाने और प्रकाश के शुभ अर्थ को याद करने से जुड़ा है।',
      lineMeanings: [
        'ज्योति शुभता, कल्याण, आरोग्य और समृद्धि लाती है।',
        'बुरे विचारों को दूर करने वाली दीप ज्योति को मैं प्रणाम करती/करता हूँ।',
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
      distractors: ['Namostute', 'Vinashaya'],
    },
    arrangeLineIndex: 1,
  }),
}
