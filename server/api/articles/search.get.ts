import { and, eq, desc, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)

  // Search query parameter
  const searchQuery = (query.q as string || '').trim()

  if (!searchQuery) {
    return {
      articles: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    }
  }

  // Pagination
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const offset = (page - 1) * limit

  // Language filter
  const language = query.language as string | undefined

  // Convert search query to tsquery format
  // Split words and join with & for AND search, or | for OR search
  const searchTerms = searchQuery
    .split(/\s+/)
    .filter(term => term.length > 0)
    .map(term => term.replace(/[^a-zA-Z0-9À-ÿ]/g, '')) // Remove special chars but keep accented letters
    .filter(term => term.length > 0)

  if (searchTerms.length === 0) {
    return {
      articles: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    }
  }

  // Use OR logic for more flexible matching
  // Using plainto_tsquery for simpler query parsing that handles natural language
  const tsQueryString = searchTerms.join(' | ')

  // Build where clause
  const conditions = [
    sql`${schema.articles.searchVector} @@ to_tsquery('simple', ${tsQueryString})`
  ]

  if (language) {
    conditions.push(eq(schema.articles.language, language))
  }

  const whereClause = and(...conditions)

  // Get articles with relevance ranking
  // ts_rank_cd gives higher scores for proximity and frequency
  const articlesWithRank = await db
    .select({
      id: schema.articles.id,
      title: schema.articles.title,
      slug: schema.articles.slug,
      summary: schema.articles.summary,
      content: schema.articles.content,
      imageUrl: schema.articles.imageUrl,
      author: schema.articles.author,
      sourceName: schema.articles.sourceName,
      sourceUrl: schema.articles.sourceUrl,
      language: schema.articles.language,
      category: schema.articles.category,
      tags: schema.articles.tags,
      publishedAt: schema.articles.publishedAt,
      // Calculate relevance rank
      rank: sql<number>`ts_rank_cd(${schema.articles.searchVector}, to_tsquery('simple', ${tsQueryString}))`.as('rank'),
      // Generate highlighted snippets for title
      titleHighlight: sql<string>`ts_headline('simple', ${schema.articles.title}, to_tsquery('simple', ${tsQueryString}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25')`.as('title_highlight'),
      // Generate highlighted snippets for summary
      summaryHighlight: sql<string>`ts_headline('simple', COALESCE(${schema.articles.summary}, ''), to_tsquery('simple', ${tsQueryString}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25')`.as('summary_highlight'),
      // Generate highlighted snippets for content
      contentHighlight: sql<string>`ts_headline('simple', COALESCE(${schema.articles.content}, ''), to_tsquery('simple', ${tsQueryString}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=75, MinWords=35, MaxFragments=2')`.as('content_highlight')
    })
    .from(schema.articles)
    .where(whereClause)
    .orderBy(sql`rank DESC`, desc(schema.articles.publishedAt))
    .limit(limit)
    .offset(offset)

  // Get total count for pagination
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.articles)
    .where(whereClause)

  const total = Number(totalResult[0]?.count || 0)
  const totalPages = Math.ceil(total / limit)

  // Format response with highlights
  const articles = articlesWithRank.map(article => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    content: article.content,
    imageUrl: article.imageUrl,
    author: article.author,
    sourceName: article.sourceName,
    sourceUrl: article.sourceUrl,
    language: article.language,
    category: article.category,
    tags: article.tags,
    publishedAt: article.publishedAt,
    relevanceScore: article.rank,
    highlights: {
      title: article.titleHighlight,
      summary: article.summaryHighlight,
      content: article.contentHighlight
    }
  }))

  return {
    articles,
    query: searchQuery,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}, { maxAge: 60 * 60 * 5 /* 5 hours */ })
