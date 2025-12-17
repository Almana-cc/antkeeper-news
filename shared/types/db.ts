import type { articles, sources } from 'hub:db:schema'

// Article types (for reading/creating data)
export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert

// Source types (for reading/creating data)
export type Source = typeof sources.$inferSelect
export type NewSource = typeof sources.$inferInsert

// Config type helpers
export interface RssSourceConfig {
  feedUrl: string
}