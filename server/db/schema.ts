import { pgTable, text, serial, timestamp, integer, boolean, real, varchar, primaryKey, jsonb, vector, index, uniqueIndex, customType } from 'drizzle-orm/pg-core'

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 500 }).notNull().unique(),
  content: text('content'),
  summary: text('summary'),
  sourceName: varchar('source_name', { length: 200 }),
  sourceUrl: text('source_url'),
  author: varchar('author', { length: 200 }),
  publishedAt: timestamp('published_at'),
  scrapedAt: timestamp('scraped_at').defaultNow(),
  language: varchar('language', { length: 5 }).default('en'),
  imageUrl: text('image_url'),
  tags: text('tags').array(),
  category: varchar('category', { length: 50 }),
  viewCount: integer('view_count').default(0),
  featured: boolean('featured').default(false),
  embedding: vector('embedding', { dimensions: 1536 }), // pgvector for semantic similarity search
  searchVector: tsvector('search_vector'), // full-text search vector (auto-updated via trigger)
})

export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 50 }),
  url: text('url'),
  language: varchar('language', { length: 10 }).notNull().default('fr'),
  lastFetchedAt: timestamp('last_fetched_at'),
  fetchIntervalMinutes: integer('fetch_interval_minutes').default(60),
  isActive: boolean('is_active').default(true),
  config: jsonb('config'),
})

export const articleSources = pgTable('article_sources', {
  articleId: integer('article_id').notNull().references(() => articles.id),
  sourceId: integer('source_id').notNull().references(() => sources.id),
  originalUrl: text('original_url'),
}, (table) => ({
  pk: primaryKey({ columns: [table.articleId, table.sourceId] })
}))

export const articleDuplicates = pgTable('article_duplicates', {
  id: serial('id').primaryKey(),
  canonicalArticleId: integer('canonical_article_id').notNull().references(() => articles.id),
  duplicateArticleId: integer('duplicate_article_id').notNull().references(() => articles.id),
  similarityScore: real('similarity_score'),
  mergedAt: timestamp('merged_at').defaultNow(),
})

export const tagTranslations = pgTable('tag_translations', {
  id: serial('id').primaryKey(),
  tagKey: varchar('tag_key', { length: 100 }).notNull(),
  language: varchar('language', { length: 5 }).notNull(),
  label: varchar('label', { length: 200 }).notNull(),
}, (table) => ({
  tagKeyIdx: index('tag_translations_tag_key_idx').on(table.tagKey),
  languageIdx: index('tag_translations_language_idx').on(table.language),
  tagKeyLanguageUnique: uniqueIndex('tag_translations_tag_key_language_unique').on(table.tagKey, table.language),
}))