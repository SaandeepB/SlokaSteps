import type { Sloka, SlokaLine } from '../../types'
import { buildStandardActivities } from './buildActivities'

const id = 'shuklambaradharam'

const lines: SlokaLine[] = [
  {
    id: `${id}-line-1`,
    devanagari: 'शुक्लाम्बरधरं विष्णुं शशिवर्णं चतुर्भुजम् ।',
    transliteration: 'Shuklambaradharam Vishnum Shashivarnam Chaturbhujam',
  },
  {
    id: `${id}-line-2`,
    devanagari: 'प्रसन्नवदनं ध्यायेत् सर्वविघ्नोपशान्तये ॥',
    transliteration: 'Prasannavadanam Dhyayet Sarvavighnopashantaye',
  },
]

/**
 * PROTOTYPE CONTENT — sourced 2026-09-18 from two independent published
 * renderings (greenmesg.org, templepurohit.com) that agree on this text;
 * awaiting qualified review. See CONTENT_REVIEW.md.
 */
export const shuklambaradharam: Sloka = {
  id,
  order: 8,
  level: 1,
  title: 'Shuklam Baradharam',
  theme: 'A Peaceful Start',
  estimatedMinutes: 6,
  implementationStatus: 'complete',
  contentStatus: 'editorial-review',
  editorial: {
    status: 'editorial-review',
    sourceReferences: [
      'https://greenmesg.org/stotras/vishnu/shuklambaradharam_vishnum.php',
      'https://www.templepurohit.com/suklam-baradharam-vishnum-lord-vishnu-sloka/',
    ],
    variationNotes: [
      'Frequently chanted with a leading "ॐ"; the om is omitted here to match the other lessons and is dropped by the evaluation text-normaliser anyway.',
      'Vaishnava tradition reads the verse as praising Vishnu; many families chant it to Ganesha before beginnings. The meaning text mentions both readings without ruling.',
    ],
  },
  practiceStatus: 'available',
  contentReviewStatus: 'prototype',
  badge: { id: 'badge-peaceful-start', name: 'Peaceful Start Badge', motif: 'lotus' },
  lines,
  meanings: {
    'en-IN': {
      title: 'A prayer before beginnings',
      simpleMeaning:
        'Before starting something new, we remember the calm, moon-bright lord dressed in white, and ask for all obstacles to become quiet.',
      culturalNote:
        'Many families chant this sloka first — before prayers, journeys, study, or any new beginning. Some traditions offer it to Vishnu, others to Ganesha; both readings are loved.',
      lineMeanings: [
        'I think of the lord dressed in shining white, who is everywhere, bright like the moon, with four arms.',
        'His face is calm and kind; remembering him, all troubles and obstacles settle down.',
      ],
      reviewStatus: 'prototype-draft',
    },
    'hi-IN': {
      title: 'शुरुआत से पहले की प्रार्थना',
      simpleMeaning:
        'कोई भी नया काम शुरू करने से पहले हम श्वेत वस्त्र धारण करने वाले, चन्द्रमा जैसे उज्ज्वल भगवान का ध्यान करते हैं, ताकि सारी बाधाएँ शान्त हो जाएँ।',
      culturalNote:
        'कई परिवार पूजा, यात्रा, पढ़ाई या किसी भी शुभ काम की शुरुआत में यह श्लोक बोलते हैं। कुछ परम्पराएँ इसे विष्णु जी को, कुछ गणेश जी को अर्पित करती हैं।',
      lineMeanings: [
        'मैं श्वेत वस्त्र पहने, सब जगह व्याप्त, चन्द्रमा जैसे वर्ण वाले, चार भुजाओं वाले भगवान का ध्यान करती/करता हूँ।',
        'उनका मुख शान्त और प्रसन्न है; उनका ध्यान करने से सारी बाधाएँ शान्त हो जाती हैं।',
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
      distractors: ['Dhyayet', 'Chaturbhujam'],
    },
    arrangeLineIndex: 1,
  }),
}
