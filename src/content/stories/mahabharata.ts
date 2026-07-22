import type { Epic, StoryChapter } from '../../types/story'
import { draftLocalizedText as l } from './localization'

export const kuruFamilyChapter: StoryChapter = {
  id: 'mahabharata-the-kuru-family',
  bookId: 'mahabharata-family-beginnings',
  order: 1,
  title: l('The Kuru Family'),
  summary: l(
    'Meet the elders and young cousins whose choices shape the Mahabharata story.',
  ),
  ageBand: '7-8',
  estimatedMinutes: 9,
  scenes: [
    {
      id: 'mahabharata-kuru-scene-1',
      order: 1,
      text: l(
        'In the kingdom of Hastinapura lived the Kuru family. Many generations had cared for the kingdom, and every new generation inherited both responsibilities and hopes.',
      ),
      imagePrompt:
        'Warm child-friendly view of ancient Hastinapura near a river, families and palace in the distance, original Indian storybook art, no text',
      imageAlt: l('The city of Hastinapura, home of the Kuru family.'),
      narrationKey: 'stories.mahabharata.kuru-family.scene-1',
    },
    {
      id: 'mahabharata-kuru-scene-2',
      order: 2,
      text: l(
        'Three important brothers were Dhritarashtra, Pandu, and Vidura. Dhritarashtra was born blind, Pandu became king, and wise Vidura served the family as a trusted counselor.',
      ),
      imagePrompt:
        'Three Kuru brothers Dhritarashtra Pandu and Vidura speaking together respectfully, dignified child-friendly illustration, no text',
      imageAlt: l('Dhritarashtra, Pandu, and Vidura together.'),
      narrationKey: 'stories.mahabharata.kuru-family.scene-2',
    },
    {
      id: 'mahabharata-kuru-scene-3',
      order: 3,
      text: l(
        'Later, Pandu stepped away from palace life. Dhritarashtra helped lead Hastinapura with counselors, while both branches of the family welcomed children.',
      ),
      imagePrompt:
        'Dhritarashtra in a council hall and Pandu departing calmly toward a forest path, split storybook composition, no text',
      imageAlt: l('The Kuru family taking on changing responsibilities.'),
      narrationKey: 'stories.mahabharata.kuru-family.scene-3',
    },
    {
      id: 'mahabharata-kuru-scene-4',
      order: 4,
      text: l(
        'Pandu’s five sons became known as the Pandavas. Dhritarashtra and Gandhari’s children became known as the Kauravas. Yudhishthira was the eldest Pandava, and Duryodhana was the eldest Kaurava brother.',
      ),
      imagePrompt:
        'Two groups of young royal cousins meeting in a palace courtyard, welcoming educational character introduction, no conflict, no text',
      imageAlt: l('The young Pandava and Kaurava cousins meeting.'),
      narrationKey: 'stories.mahabharata.kuru-family.scene-4',
    },
    {
      id: 'mahabharata-kuru-scene-5',
      order: 5,
      text: l(
        'The cousins grew up in the same royal household and learned from many elders and teachers. Their story reminds us that sharing, fairness, and handling strong feelings can matter greatly in a family.',
      ),
      imagePrompt:
        'Young royal cousins studying and practicing together with teachers in a calm courtyard, inclusive child-friendly art, no text',
      imageAlt: l('The cousins learning together with their teachers.'),
      narrationKey: 'stories.mahabharata.kuru-family.scene-5',
    },
  ],
  characters: [
    {
      id: 'dhritarashtra',
      name: l('Dhritarashtra'),
      role: l('An elder of the Kuru family'),
      description: l(
        'A prince born blind who later helps lead Hastinapura and is the father of the Kauravas.',
      ),
    },
    {
      id: 'gandhari',
      name: l('Gandhari'),
      role: l('Queen of Hastinapura'),
      description: l('Dhritarashtra’s wife and a central elder in the Kuru family.'),
    },
    {
      id: 'pandu',
      name: l('Pandu'),
      role: l('A king of the Kuru family'),
      description: l('Dhritarashtra’s younger brother and the father of the Pandavas.'),
    },
    {
      id: 'vidura',
      name: l('Vidura'),
      role: l('Trusted counselor'),
      description: l('A wise family elder known for thoughtful and honest advice.'),
    },
    {
      id: 'pandavas',
      name: l('The Pandavas'),
      role: l('Five Kuru princes'),
      description: l(
        'Yudhishthira, Bhima, Arjuna, Nakula, and Sahadeva, the five sons of Pandu.',
      ),
    },
    {
      id: 'kauravas',
      name: l('The Kauravas'),
      role: l('The children of Dhritarashtra and Gandhari'),
      description: l(
        'A large group of royal cousins; Duryodhana is the eldest Kaurava brother.',
      ),
    },
  ],
  activities: [
    {
      id: 'mahabharata-kuru-order-events',
      type: 'event-ordering',
      instruction: l('Put these family moments in the order they were introduced.'),
      events: [
        {
          id: 'kuru-event-kingdom',
          order: 1,
          text: l('We meet the Kuru family in Hastinapura.'),
        },
        {
          id: 'kuru-event-brothers',
          order: 2,
          text: l('We meet Dhritarashtra, Pandu, and Vidura.'),
        },
        {
          id: 'kuru-event-change',
          order: 3,
          text: l('The brothers take on changing responsibilities.'),
        },
        {
          id: 'kuru-event-cousins',
          order: 4,
          text: l('The Pandava and Kaurava cousins grow up together.'),
        },
      ],
    },
    {
      id: 'mahabharata-kuru-quiz',
      type: 'comprehension-quiz',
      instruction: l('Choose the best answer for each question.'),
      questions: [
        {
          id: 'kuru-question-1',
          prompt: l('Where did the Kuru family live?'),
          choices: [
            { id: 'hastinapura', text: l('Hastinapura') },
            { id: 'ayodhya', text: l('Ayodhya') },
            { id: 'lanka', text: l('Lanka') },
          ],
          correctChoiceId: 'hastinapura',
          explanation: l('Hastinapura was the home of the Kuru family.'),
        },
        {
          id: 'kuru-question-2',
          prompt: l('Who was known for thoughtful advice?'),
          choices: [
            { id: 'vidura', text: l('Vidura') },
            { id: 'river', text: l('The river keeper') },
            { id: 'merchant', text: l('A visiting merchant') },
          ],
          correctChoiceId: 'vidura',
          explanation: l('Vidura served the family as a trusted and wise counselor.'),
        },
        {
          id: 'kuru-question-3',
          prompt: l('What were Pandu’s five sons called?'),
          choices: [
            { id: 'pandavas', text: l('The Pandavas') },
            { id: 'kauravas', text: l('The Kauravas') },
            { id: 'sages', text: l('The sages') },
          ],
          correctChoiceId: 'pandavas',
          explanation: l('Pandu’s five sons were known as the Pandavas.'),
        },
      ],
    },
    {
      id: 'mahabharata-kuru-reflection',
      type: 'values-reflection',
      prompt: l('What can help cousins or friends handle a disagreement fairly?'),
      choices: [
        { id: 'listen', text: l('Let each person speak and listen carefully') },
        { id: 'pause', text: l('Pause and calm down before deciding') },
        { id: 'help', text: l('Ask a trusted adult to help everyone be heard') },
      ],
      encouragement: l(
        'Listening, pausing, and asking for fair help are all thoughtful choices.',
      ),
    },
  ],
  values: [l('Fairness'), l('Listening'), l('Wise guidance')],
  recap: l(
    'The Kuru family lived in Hastinapura. Dhritarashtra, Pandu, and Vidura carried different responsibilities, and the Pandava and Kaurava cousins grew up together in one large family.',
  ),
  completionReward: {
    xp: 20,
    badgeId: 'kuru-family-story-listener',
    badgeTitle: l('Kuru Family Story Listener'),
    message: l('You met the Kuru family and practiced listening for relationships.'),
  },
  contentStatus: 'editorial-review',
  sourceNotes: [
    'Child-friendly demonstration drawing broadly from the Mahabharata family narrative.',
    'This brief introduction is not a complete genealogy and requires cultural and editorial review.',
    'Disability language and family relationships should receive sensitivity review before approval.',
    'Regional-language entries are visibly marked English fallbacks pending human translation.',
  ],
}

export const mahabharataEpic: Epic = {
  id: 'mahabharata',
  title: l('Mahabharata'),
  description: l(
    'Meet a large family and explore how choices about fairness, courage, and responsibility shape their journey.',
  ),
  books: [
    {
      id: 'mahabharata-family-beginnings',
      epicId: 'mahabharata',
      title: l('The Family of Hastinapura'),
      order: 1,
      chapters: [kuruFamilyChapter],
    },
  ],
  contentStatus: 'editorial-review',
  sourceTradition: 'Mahabharata — child-friendly demonstration draft',
  editorialNotes: [
    'Draft story content — requires cultural and editorial review.',
    'This sample preserves complexity by identifying itself as an introduction, not a complete account.',
  ],
}
