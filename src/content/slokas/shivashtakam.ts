import type { LessonActivity, Sloka, SlokaLine } from '../../types'

const id = 'shivashtakam'

/**
 * PROTOTYPE CONTENT — the "Prabhum Prananatham" Shivashtakam. Base edition:
 * drikpanchang.com's rendering (matches the widely chanted version), with
 * that page's mid-word typesetting spaces joined; cross-checked against
 * shrinathdham.com, whose real variants are logged in `variationNotes`
 * below and in CONTENT_REVIEW.md. Ancient stotra text; the specific
 * editorial choices here await qualified review and are never presented as
 * definitive.
 *
 * One SlokaLine per verse: the guided listen/repeat flow teaches an
 * ashtakam verse by verse, the way a teacher would.
 */
const lines: SlokaLine[] = [
  {
    id: `${id}-verse-1`,
    devanagari:
      'प्रभुं प्राणनाथं विभुं विश्वनाथं जगन्नाथनाथं सदानन्दभाजाम् ।\nभवद्भव्यभूतेश्वरं भूतनाथं शिवं शङ्करं शम्भुमीशानमीडे ॥',
    transliteration:
      'Prabhum Prananatham Vibhum Vishwanatham Jagannatha Natham Sadananda Bhajam, Bhavad Bhavya Bhuteshwaram Bhutanatham Shivam Shankaram Shambhum Ishanam Ide',
  },
  {
    id: `${id}-verse-2`,
    devanagari:
      'गले रुण्डमालं तनौ सर्पजालं महाकालकालं गणेशादिपालम् ।\nजटाजूटगङ्गोत्तरङ्गैर्विशालं शिवं शङ्करं शम्भुमीशानमीडे ॥',
    transliteration:
      'Gale Rundamalam Tanau Sarpajalam Mahakala Kalam Ganeshadi Palam, Jatajuta Gangottarangair Vishalam Shivam Shankaram Shambhum Ishanam Ide',
  },
  {
    id: `${id}-verse-3`,
    devanagari:
      'मुदामाकरं मण्डनं मण्डयन्तं महामण्डलं भस्मभूषाधरं तम् ।\nअनादिं ह्यपारं महामोहमारं शिवं शङ्करं शम्भुमीशानमीडे ॥',
    transliteration:
      'Mudamakaram Mandanam Mandayantam Maha Mandalam Bhasma Bhushadharam Tam, Anadim Hyaparam Maha Mohamaram Shivam Shankaram Shambhum Ishanam Ide',
  },
  {
    id: `${id}-verse-4`,
    devanagari:
      'वटाधो निवासं महाट्टाट्टहासं महापापनाशं सदा सुप्रकाशम् ।\nगिरीशं गणेशं सुरेशं महेशं शिवं शङ्करं शम्भुमीशानमीडे ॥',
    transliteration:
      'Vatadho Nivasam Mahatta Attahasam Mahapapa Nasham Sada Suprakasham, Girisham Ganesham Suresham Mahesham Shivam Shankaram Shambhum Ishanam Ide',
  },
  {
    id: `${id}-verse-5`,
    devanagari:
      'गिरीन्द्रात्मजासङ्गृहीतार्धदेहं गिरौ संस्थितं सर्वदापन्नगेहम् ।\nपरब्रह्म ब्रह्मादिभिर्वन्द्यमानं शिवं शङ्करं शम्भुमीशानमीडे ॥',
    transliteration:
      'Girindratmaja Sangrihita Ardhadeham Girau Samsthitam Sarvada Apanna Geham, Parabrahma Brahmadibhir Vandyamanam Shivam Shankaram Shambhum Ishanam Ide',
  },
  {
    id: `${id}-verse-6`,
    devanagari:
      'कपालं त्रिशूलं कराभ्यां दधानं पदाम्भोजनम्राय कामं ददानम् ।\nबलीवर्धमानं सुराणां प्रधानं शिवं शङ्करं शम्भुमीशानमीडे ॥',
    transliteration:
      'Kapalam Trishulam Karabhyam Dadhanam Padambhoja Namraya Kamam Dadanam, Balivardhamanam Suranam Pradhanam Shivam Shankaram Shambhum Ishanam Ide',
  },
  {
    id: `${id}-verse-7`,
    devanagari:
      'शरच्चन्द्रगात्रं गणानन्दपात्रं त्रिनेत्रं पवित्रं धनेशस्य मित्रम् ।\nअपर्णाकलत्रं सदा सच्चरित्रं शिवं शङ्करं शम्भुमीशानमीडे ॥',
    transliteration:
      'Sharacchandra Gatram Gananda Patram Trinetram Pavitram Dhaneshasya Mitram, Aparna Kalatram Sada Saccharitram Shivam Shankaram Shambhum Ishanam Ide',
  },
  {
    id: `${id}-verse-8`,
    devanagari:
      'हरं सर्पहारं चिताभूविहारं भवं वेदसारं सदा निर्विकारम् ।\nश्मशाने वसन्तं मनोजं दहन्तं शिवं शङ्करं शम्भुमीशानमीडे ॥',
    transliteration:
      'Haram Sarpaharam Chita Bhuviharam Bhavam Vedasaram Sada Nirvikaram, Shmashane Vasantam Manojam Dahantam Shivam Shankaram Shambhum Ishanam Ide',
  },
  {
    id: `${id}-verse-9`,
    devanagari:
      'स्वयं यः प्रभाते नरः शूलपाणे पठेत् स्तोत्ररत्नं त्विह प्राप्यरत्नम् ।\nसुपुत्रं सुधान्यं सुमित्रं कलत्रं विचित्रैः समाराध्य मोक्षं प्रयाति ॥',
    transliteration:
      'Svayam Yah Prabhate Narah Shulapane Pathet Stotraratnam Tviha Prapyaratnam, Suputram Sudhanyam Sumitram Kalatram Vichitraih Samaradhya Moksham Prayati',
  },
]

/**
 * An ashtakam is long, so the lesson flow is custom: introduction, then
 * listen + repeat per verse, one full chant, completion — no match/fill/
 * arrange puzzles, which do not fit nine long verses. As with every lesson,
 * the meaning is on the overview, not a forced step.
 */
function buildAshtakamActivities(): LessonActivity[] {
  const activities: LessonActivity[] = [{ id: `${id}-intro`, type: 'introduction' }]
  lines.forEach((_line, index) => {
    activities.push({
      id: `${id}-listen-${index + 1}`,
      type: 'listen',
      lineIndex: index,
    })
    activities.push({
      id: `${id}-repeat-${index + 1}`,
      type: 'repeat',
      lineIndex: index,
    })
  })
  activities.push({ id: `${id}-chant`, type: 'fullChant' })
  activities.push({ id: `${id}-done`, type: 'completion' })
  return activities
}

export const shivashtakam: Sloka = {
  id,
  order: 9,
  level: 1,
  title: 'Shivashtakam',
  theme: 'Courage and Calm',
  estimatedMinutes: 20,
  implementationStatus: 'complete',
  contentStatus: 'editorial-review',
  editorial: {
    status: 'editorial-review',
    sourceReferences: [
      'https://www.drikpanchang.com/lyrics/ashtakam/gods/lord-shiva/shivashtakam.html',
      'https://www.shrinathdham.com/stotra-stuti-aarti/shivashtakam-in-sanskrit/',
      'https://sanskritdocuments.org/doc_shiva/shiva8_1.html (consulted, not copied - their edition carries reuse restrictions)',
    ],
    variationNotes: [
      'Verse 2: "गणेशादिपालम्" here; some editions read "गणेशाधिपालम्". "जटाजूटगङ्गोत्तरङ्गैः" here; one consulted source prints "जटाजूटभङ्गोत्तरङ्गैः" (likely an OCR artifact).',
      'Verse 3: "महामोहमारं" here; some editions read "महामोहहारं".',
      'Verse 4: "वटाधो निवासं" (beneath the banyan) here; one consulted source reads "तटाधो निवासं".',
      'Verse 6: "बलीवर्धमानं" here (base edition); "बलीवर्दयानं" (riding the bull) is a well-attested alternative a reviewer may prefer.',
      'Verse 8: half-verse-final written "निर्विकारम्" (base edition prints the anusvara form "निर्विकारं").',
      'Verse 9: southern sandhi doublings in the base edition ("नरश्शूलपाणे", "विचित्रैस्समाराध्य") are written here in their pausa forms ("नरः शूलपाणे", "विचित्रैः समाराध्य"); the phala verse itself varies considerably across editions.',
      'Transliteration deliberately splits some compounds for child readability; it is not a scholarly scheme.',
    ],
  },
  practiceStatus: 'available',
  contentReviewStatus: 'prototype',
  badge: { id: 'badge-steady-courage', name: 'Steady Courage Badge', motif: 'bell' },
  lines,
  meanings: {
    'en-IN': {
      title: 'Eight verses for Lord Shiva',
      simpleMeaning:
        'This is a song of eight verses praising Lord Shiva — calm, kind, and strong — with a ninth verse about the blessings of singing it. Each verse ends the same way: "I praise Shiva, Shankara, Shambhu, Ishana."',
      culturalNote:
        'Many families sing the Shivashtakam on Maha Shivaratri, on Mondays, or in evening prayers. "Ashtakam" means a poem of eight verses; singing one verse at a time is the traditional way to learn it.',
      lineMeanings: [
        'I sing to Shiva — lord of all life, lord of the whole world, always full of joy.',
        'He wears surprising garlands and snakes as friends; nothing frightens him, and he watches over everyone — even mighty time itself.',
        'He is a spring of happiness, wears sacred ash, has no beginning and no end, and clears away confusion.',
        'He rests beneath a great banyan tree with a big open laugh, washes away all wrongs, and always shines bright.',
        'Goddess Parvati shares half his form; he lives on the mountain, a shelter for anyone in trouble, honoured even by Brahma and the gods.',
        'He holds his bowl and trident, kindly grants the wishes of those who bow, and is first among the gods with his great bull.',
        'He glows like the autumn moon, has three eyes, is a friend to Kubera, and with Parvati beside him his story is always good.',
        'He stays calm and unchanged everywhere — he carries the heart of the Vedas and burned away selfish desire itself.',
        'Whoever sings this song in the morning is blessed with good family, friends, and plenty — and comes ever closer to Shiva.',
      ],
      reviewStatus: 'prototype-draft',
    },
    'hi-IN': {
      title: 'भगवान शिव के आठ श्लोक',
      simpleMeaning:
        'यह भगवान शिव की स्तुति के आठ श्लोकों का गीत है — शान्त, दयालु और बलवान शिव का। नौवाँ श्लोक इसे गाने का फल बताता है। हर श्लोक का अन्त एक जैसा है: "मैं शिव, शङ्कर, शम्भु, ईशान की स्तुति करती/करता हूँ।"',
      culturalNote:
        'कई परिवार महाशिवरात्रि, सोमवार या संध्या-पूजा में शिवाष्टकम् गाते हैं। "अष्टकम्" का अर्थ है आठ श्लोकों की रचना; इसे एक-एक श्लोक करके सीखना ही पारम्परिक तरीका है।',
      lineMeanings: [
        'मैं शिव को गाती/गाता हूँ — जो प्राणों के नाथ, सारे जगत के नाथ और सदा आनन्दमय हैं।',
        'उनके गले में अनोखी मालाएँ और शरीर पर सर्प हैं; उन्हें किसी से डर नहीं, और वे सबकी — यहाँ तक कि महाकाल की भी — रक्षा करते हैं।',
        'वे आनन्द के स्रोत हैं, भस्म धारण करते हैं, उनका न आदि है न अन्त, और वे मन का भ्रम दूर करते हैं।',
        'वे वट-वृक्ष के नीचे विराजते हैं, खुलकर हँसते हैं, सारे पाप धो देते हैं और सदा प्रकाशमान रहते हैं।',
        'माता पार्वती उनका आधा रूप हैं; वे पर्वत पर रहते हैं, संकट में पड़े हर किसी का सहारा हैं, और ब्रह्मा आदि देवता भी उन्हें प्रणाम करते हैं।',
        'वे कपाल और त्रिशूल धारण करते हैं, प्रणाम करने वालों की इच्छाएँ पूरी करते हैं, और अपने नन्दी के साथ देवताओं में प्रधान हैं।',
        'वे शरद के चन्द्रमा जैसे चमकते हैं, उनकी तीन आँखें हैं, वे कुबेर के मित्र हैं, और पार्वती जी के साथ उनकी कथा सदा शुभ है।',
        'वे हर जगह शान्त और अपरिवर्तित रहते हैं — वेदों का सार उन्हीं में है, और उन्होंने स्वार्थी कामना को ही भस्म कर दिया।',
        'जो सुबह यह स्तोत्र गाता है, उसे अच्छा परिवार, मित्र और समृद्धि मिलती है — और वह शिव के और निकट आ जाता है।',
      ],
      reviewStatus: 'prototype-draft',
    },
  },
  activities: buildAshtakamActivities(),
}
