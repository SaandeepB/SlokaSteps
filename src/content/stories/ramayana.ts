import type { Epic, StoryChapter } from '../../types/story'
import { draftLocalizedText as l } from './localization'

export const ayodhyaAndDasharathaChapter: StoryChapter = {
  id: 'ramayana-ayodhya-and-king-dasharatha',
  bookId: 'ramayana-bala-kanda',
  order: 1,
  title: l('Ayodhya and King Dasharatha'),
  summary: l(
    'Meet King Dasharatha and the royal family in the beautiful city of Ayodhya.',
  ),
  ageBand: '7-8',
  estimatedMinutes: 8,
  scenes: [
    {
      id: 'ramayana-ayodhya-scene-1',
      order: 1,
      text: l(
        'Long ago, beside the Sarayu River, stood Ayodhya. Its busy streets, gardens, and homes were cared for by a close community.',
      ),
      imagePrompt:
        'Warm child-friendly storybook view of ancient Ayodhya beside the Sarayu River, diverse families, gardens, no text',
      imageAlt: l('The city of Ayodhya beside the Sarayu River.'),
      narrationKey: 'stories.ramayana.ayodhya.scene-1',
    },
    {
      id: 'ramayana-ayodhya-scene-2',
      order: 2,
      text: l(
        'King Dasharatha listened to wise advisers and worked to protect the people of Ayodhya. Yet he carried a quiet wish: he hoped to have children to love and guide.',
      ),
      imagePrompt:
        'Kind elder King Dasharatha listening to advisers in an airy palace hall, gentle Indian storybook style, no text',
      imageAlt: l('King Dasharatha listening to his advisers.'),
      narrationKey: 'stories.ramayana.ayodhya.scene-2',
    },
    {
      id: 'ramayana-ayodhya-scene-3',
      order: 3,
      text: l(
        'Dasharatha shared this hope with Queens Kausalya, Kaikeyi, and Sumitra. The family sought guidance from respected sages and prepared for a sacred ceremony.',
      ),
      imagePrompt:
        'King Dasharatha with Queens Kausalya Kaikeyi and Sumitra speaking respectfully with elder sages, child-friendly illustration, no text',
      imageAlt: l('The royal family asking respected sages for guidance.'),
      narrationKey: 'stories.ramayana.ayodhya.scene-3',
    },
    {
      id: 'ramayana-ayodhya-scene-4',
      order: 4,
      text: l(
        'In time, four princes were born: Rama, Bharata, Lakshmana, and Shatrughna. The palace and the city welcomed them with joy.',
      ),
      imagePrompt:
        'Ayodhya families celebrating the arrival of four royal babies with flowers and lamps, calm joyful storybook art, no text',
      imageAlt: l('Ayodhya celebrating the birth of the four princes.'),
      narrationKey: 'stories.ramayana.ayodhya.scene-4',
    },
    {
      id: 'ramayana-ayodhya-scene-5',
      order: 5,
      text: l(
        'The four brothers grew up learning together. Their family hoped they would become thoughtful, brave, and caring toward one another and their community.',
      ),
      imagePrompt:
        'Four young royal brothers learning together in a palace garden with a teacher, warm original Indian children book style, no text',
      imageAlt: l('The four young brothers learning together.'),
      narrationKey: 'stories.ramayana.ayodhya.scene-5',
    },
  ],
  characters: [
    {
      id: 'dasharatha',
      name: l('King Dasharatha'),
      role: l('King of Ayodhya'),
      description: l(
        'A caring ruler who wishes for children and seeks guidance from trusted sages.',
      ),
    },
    {
      id: 'kausalya',
      name: l('Queen Kausalya'),
      role: l('A queen of Ayodhya and Rama’s mother'),
      description: l('A respected member of the royal family.'),
    },
    {
      id: 'kaikeyi',
      name: l('Queen Kaikeyi'),
      role: l('A queen of Ayodhya and Bharata’s mother'),
      description: l('A respected member of the royal family.'),
    },
    {
      id: 'sumitra',
      name: l('Queen Sumitra'),
      role: l('A queen of Ayodhya and mother of Lakshmana and Shatrughna'),
      description: l('A respected member of the royal family.'),
    },
    {
      id: 'four-princes',
      name: l('Rama, Bharata, Lakshmana, and Shatrughna'),
      role: l('The four princes of Ayodhya'),
      description: l('Brothers who grow up learning and caring for one another.'),
    },
  ],
  activities: [
    {
      id: 'ramayana-ayodhya-order-events',
      type: 'event-ordering',
      instruction: l('Put these moments in the order they happened.'),
      events: [
        {
          id: 'ayodhya-event-city',
          order: 1,
          text: l('We meet the city of Ayodhya.'),
        },
        {
          id: 'ayodhya-event-wish',
          order: 2,
          text: l('Dasharatha shares his hope for children.'),
        },
        {
          id: 'ayodhya-event-guidance',
          order: 3,
          text: l('The family seeks guidance from sages.'),
        },
        {
          id: 'ayodhya-event-princes',
          order: 4,
          text: l('Four princes are welcomed with joy.'),
        },
      ],
    },
    {
      id: 'ramayana-ayodhya-quiz',
      type: 'comprehension-quiz',
      instruction: l('Choose the best answer for each question.'),
      questions: [
        {
          id: 'ayodhya-question-1',
          prompt: l('Where was Ayodhya located?'),
          choices: [
            { id: 'sarayu', text: l('Beside the Sarayu River') },
            { id: 'ocean', text: l('On an island in the ocean') },
            { id: 'mountain', text: l('On top of a snowy mountain') },
          ],
          correctChoiceId: 'sarayu',
          explanation: l('Ayodhya stood beside the Sarayu River.'),
        },
        {
          id: 'ayodhya-question-2',
          prompt: l('What quiet wish did King Dasharatha carry?'),
          choices: [
            { id: 'children', text: l('To have children to love and guide') },
            { id: 'palace', text: l('To build the tallest palace') },
            { id: 'journey', text: l('To leave Ayodhya forever') },
          ],
          correctChoiceId: 'children',
          explanation: l('Dasharatha hoped to welcome children into his family.'),
        },
        {
          id: 'ayodhya-question-3',
          prompt: l('What did the four brothers do as they grew?'),
          choices: [
            { id: 'learned', text: l('They learned together') },
            { id: 'hid', text: l('They hid from everyone') },
            { id: 'sailed', text: l('They sailed across the ocean') },
          ],
          correctChoiceId: 'learned',
          explanation: l('The brothers grew up learning together.'),
        },
      ],
    },
    {
      id: 'ramayana-ayodhya-reflection',
      type: 'values-reflection',
      prompt: l('How can you support someone who is waiting and hoping?'),
      choices: [
        { id: 'listen', text: l('Listen kindly when they want to talk') },
        { id: 'encourage', text: l('Offer patient encouragement') },
        { id: 'help', text: l('Help with a small caring action') },
      ],
      encouragement: l(
        'Kind listening, patience, and helpful actions can all show that we care.',
      ),
    },
  ],
  values: [l('Patience'), l('Care for family'), l('Thoughtful leadership')],
  recap: l(
    'Ayodhya was a flourishing city led by King Dasharatha. After seeking guidance, the royal family welcomed Rama, Bharata, Lakshmana, and Shatrughna, who grew up learning together.',
  ),
  completionReward: {
    xp: 20,
    badgeId: 'ayodhya-story-listener',
    badgeTitle: l('Ayodhya Story Listener'),
    message: l('You followed the beginning of the Ramayana path with care.'),
  },
  contentStatus: 'editorial-review',
  sourceNotes: [
    'Child-friendly demonstration based broadly on the Bala Kanda tradition.',
    'Names, relationships, ceremony wording, and cultural framing require review by qualified editors before approval.',
    'Regional-language entries are visibly marked English fallbacks pending human translation.',
  ],
}

export const ramayanaEpic: Epic = {
  id: 'ramayana',
  title: l('Ramayana'),
  description: l(
    'Follow a family’s journey through courage, friendship, responsibility, and hope.',
  ),
  books: [
    {
      id: 'ramayana-bala-kanda',
      epicId: 'ramayana',
      title: l('Beginnings in Ayodhya'),
      order: 1,
      chapters: [ayodhyaAndDasharathaChapter],
    },
  ],
  contentStatus: 'editorial-review',
  sourceTradition: 'Valmiki Ramayana — child-friendly demonstration draft',
  editorialNotes: [
    'Draft story content — requires cultural and editorial review.',
    'This sample does not attempt to merge every regional retelling.',
  ],
}
