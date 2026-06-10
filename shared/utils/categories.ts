// Article categories assigned by the AI categorization service
export const VALID_CATEGORIES = [
  'research',
  'care',
  'conservation',
  'behavior',
  'ecology',
  'community',
  'news',
  'off-topic',
  'pest-control'
] as const

export type ArticleCategory = (typeof VALID_CATEGORIES)[number]

// Categories hidden from public listings (still reachable via explicit category filter for review)
export const HIDDEN_CATEGORIES: string[] = ['off-topic', 'pest-control']
