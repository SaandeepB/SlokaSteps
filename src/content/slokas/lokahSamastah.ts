import type { Sloka, SlokaLine } from '../../types'
import { buildStandardActivities } from './buildActivities'

const id = 'lokah-samastah-sukhino-bhavantu'

const lines: SlokaLine[] = [
  {
    id: `${id}-line-1`,
    devanagari: 'लोकाः समस्ताः सुखिनो भवन्तु ।',
    transliteration: 'Lokah Samastah Sukhino Bhavantu',
  },
]

/** Prototype content: wording and tradition notes require editorial review. */
export const lokahSamastah: Sloka = {
  id,
  order: 7,
  level: 1,
  title: 'Lokah Samastah Sukhino Bhavantu',
  theme: 'Well-Being for Everyone',
  estimatedMinutes: 5,
  implementationStatus: 'complete',
  contentStatus: 'editorial-review',
  editorial: {
    status: 'editorial-review',
    variationNotes: [
      'Source tradition, Sanskrit form, and common recitation variations require review before approval.',
    ],
  },
  practiceStatus: 'available',
  contentReviewStatus: 'prototype',
  badge: { id: 'badge-world-kindness', name: 'Kind World Badge', motif: 'heart' },
  lines,
  meanings: {
    'en-IN': {
      title: 'A wish for shared well-being',
      simpleMeaning: 'This verse expresses a wish that everyone, everywhere, may be happy.',
      culturalNote:
        'Many families and learning communities use this line to close a practice with kindness toward all.',
      lineMeanings: ['May everyone in all places be happy and well.'],
      reviewStatus: 'prototype-draft',
    },
    'hi-IN': {
      title: 'सबके सुख की कामना',
      simpleMeaning: 'यह पंक्ति हर जगह सभी के सुखी रहने की कामना व्यक्त करती है।',
      culturalNote:
        'कई परिवार और शिक्षण समुदाय अभ्यास के अंत में सबके लिए मंगल की भावना से यह पंक्ति कहते हैं।',
      lineMeanings: ['सभी स्थानों पर सब लोग सुखी और कुशल रहें।'],
      reviewStatus: 'prototype-draft',
    },
  },
  activities: buildStandardActivities({
    slokaId: id,
    lines,
    fillBlank: {
      lineIndex: 0,
      blankWordIndex: 2,
      distractors: ['Sarve', 'Shantih'],
    },
    arrangeLineIndex: 0,
  }),
}
