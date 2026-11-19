/** The story of Zubeen Garg, shown on the About page (and excerpted on Home and in the Now Playing view). */

export const TRIBUTE_LEAD =
  'Zubeen Garg was the voice of Assam. For more than three decades his songs were the soundtrack of Assamese life, and his generosity made him more than a star: he belonged to the people who loved him.';

export const TRIBUTE_SHORT =
  'Singer, composer, lyricist, actor and filmmaker, and the most beloved voice Assam has known. Fearless, generous and endlessly inventive, he sang in more than forty languages and gave his people a song for every moment of life.';

export interface TributeSection {
  id: string;
  title: string;
  photo: string;
  paras: string[];
}

export const TRIBUTE: TributeSection[] = [
  {
    id: 'every-moment',
    title: 'A song for every moment of life',
    photo: 'stage-red',
    paras: [
      'Few artists anywhere have woven themselves so completely into the everyday life of a people. Children learned his songs before they could read. Students studied to them, couples were married to them, and families grieved with them. In Assam, whatever the occasion, joy or sorrow, celebration or quiet reflection, there is a Zubeen song for it.',
      'Whole generations grew up with his voice as a constant companion, and for many it is impossible to separate their own memories from his music. Affectionately called Zubeen Da, he was less a celebrity than a member of every family.',
    ],
  },
  {
    id: 'musician',
    title: 'A musician without limits',
    photo: 'guitar-portrait',
    paras: [
      'Born Zubeen Borthakur on 18 November 1972 in Tura, Meghalaya, and named after the conductor Zubin Mehta, he grew up in a musical home and released his first Assamese album, Anamika, in 1992. What followed was one of the most prolific careers in Indian music: by most accounts more than 38,000 songs, in over forty languages and dialects.',
      'He was a multi-instrumentalist who seemed able to play almost anything, and a composer and lyricist whose words could be playful one moment and heartbreaking the next. He played with melody, rhythm and language until they became something new, yet always unmistakably Assamese. Listeners speak of the shiver his voice could send through them, the feeling that a song had been written for their own life.',
      'The rest of India knew him for “Ya Ali” from Gangster (2006). In Assam he was everywhere: on the Bihu stage, in mobile theatre, in films he acted in and directed, among them Kanchanjangha (2019), and on the radio in every home.',
    ],
  },
  {
    id: 'heart',
    title: 'A heart for his people',
    photo: 'gamosa',
    paras: [
      'Fame and fortune never seemed to interest him. What mattered was the wellbeing of the people of Assam. When floods or other tragedies struck, he was often among the first to lend a hand to the poor and the needy, and stories of his personal kindness are told in towns and villages across the state.',
      'Through the Kalaguru Artiste Foundation he extended that care to artists and communities in need. Many who never met him still feel he looked after them.',
    ],
  },
  {
    id: 'fearless',
    title: 'Fearless',
    photo: 'portrait-blue',
    paras: [
      'He spoke his mind and lived on his own terms, and that fearlessness became part of what he gave his listeners: the courage to be themselves. He was loved across every line of religion, caste and community, a rare figure who truly belonged to everyone.',
    ],
  },
  {
    id: 'forever',
    title: 'Forever in Assam’s heart',
    photo: 'stage-teal',
    paras: [
      'Zubeen Garg died on 19 September 2025 in Singapore, where he had travelled to perform. The grief in Assam was immense; vast crowds filled the streets of Guwahati to bid him farewell, singing his songs as they walked.',
      'His music has not gone quiet. It plays on in homes, buses, classrooms and festivals, and it will be sung for as long as there are Assamese voices to sing it.',
    ],
  },
];

export const TIMELINE: { year: string; text: string }[] = [
  { year: '1972', text: 'Born Zubeen Borthakur in Tura, Meghalaya, on 18 November.' },
  { year: '1992', text: 'Anamika, his first Assamese album, is released.' },
  { year: '2006', text: '“Ya Ali” from Gangster makes him a household name across India.' },
  { year: '2019', text: 'Writes, directs and stars in the film Kanchanjangha.' },
  { year: '2025', text: 'Dies in Singapore on 19 September. Assam mourns as one.' },
];
