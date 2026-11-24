export const translation = 'World English Bible'

const web = 'https://ebible.org/engwebp/'

export const scripture = {
  brokenHeart: {
    reference: 'Psalm 34:18',
    text: 'The LORD is near to those who have a broken heart, and saves those who have a crushed spirit.',
    source: web + 'PSA034.htm#V18',
  },
  love: {
    reference: 'John 13:34',
    text: 'A new commandment I give to you, that you love one another. Just as I have loved you, you also love one another.',
    source: web + 'JHN13.htm#V34',
  },
  tomorrow: {
    reference: 'Matthew 6:34',
    text: 'Therefore don’t be anxious for tomorrow, for tomorrow will be anxious for itself. Each day’s own evil is sufficient.',
    source: web + 'MAT06.htm#V34',
  },
  forgiving: {
    reference: 'Ephesians 4:32',
    text: 'And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you.',
    source: web + 'EPH04.htm#V32',
  },
  upheld: {
    reference: 'Psalm 145:14',
    text: 'The LORD upholds all who fall, and raises up all those who are bowed down.',
    source: web + 'PSA145.htm#V14',
  },
  thanks: {
    reference: '1 Thessalonians 5:18',
    text: 'In everything give thanks, for this is the will of God in Christ Jesus toward you.',
    source: web + '1TH05.htm#V18',
  },
} satisfies Record<string, { reference: string; text: string; source: string }>

export type VerseId = keyof typeof scripture
