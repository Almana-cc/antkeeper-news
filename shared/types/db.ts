import type { articles } from 'hub:db:schema'

// Select types (for reading data)
export type Article = typeof articles.$inferSelect

// Insert types (for creating data)
export type NewArticle = typeof articles.$inferInsert