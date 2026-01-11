import { and, eq, sql, ne, desc } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default eventHandler(async (event) => {
  const query = getQuery(event)

  // Search query parameter
  const q = (query.q as string || '').trim()

  if (!q) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Search query "q" is required'
    })
  }

  // Pagination
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const offset = (page - 1) * limit

  // Filters
  const language = query.language as string | undefined

  // Convert search query to tsquery format (websearch_to_tsquery handles natural language)
  const tsQuery = sql`websearch_to_tsquery('simple', ${q})`

  // Build where clause
  const conditions = []

  // Full-text search condition
  conditions.push(sql`${schema.articles.searchVector} @@ ${tsQuery}`)

  if (language) {
    conditions.push(eq(schema.articles.language, language))
  }

  // Exclude off-topic articles by default
  conditions.push(ne(schema.articles.category, 'off-topic'))

  const whereClause = and(...conditions)

  // Get articles with ranking
  const articles = await db
    .select({
      id: schema.articles.id,
      title: schema.articles.title,
      slug: schema.articles.slug,
      summary: schema.articles.summary,
      content: schema.articles.content,
      sourceName: schema.articles.sourceName,
      sourceUrl: schema.articles.sourceUrl,
      author: schema.articles.author,
      publishedAt: schema.articles.publishedAt,
      language: schema.articles.language,
      imageUrl: schema.articles.imageUrl,
      tags: schema.articles.tags,
      category: schema.articles.category,
      // Rank by relevance (ts_rank considers the weighted tsvector)
      rank: sql<number>`ts_rank(${schema.articles.searchVector}, ${tsQuery})`.as('rank'),
      // Generate highlighted snippets
      headlineTitle: sql<string>`ts_headline('simple', ${schema.articles.title}, ${tsQuery}, 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20, MaxFragments=1')`.as('headline_title'),
      headlineSummary: sql<string>`ts_headline('simple', COALESCE(${schema.articles.summary}, ''), ${tsQuery}, 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20, MaxFragments=2')`.as('headline_summary'),
    })
    .from(schema.articles)
    .where(whereClause)
    .orderBy(desc(sql`rank`), desc(schema.articles.publishedAt))
    .limit(limit)
    .offset(offset)

  // Get total count for pagination
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.articles)
    .where(whereClause)

  const total = Number(totalResult[0]?.count || 0)
  const totalPages = Math.ceil(total / limit)

  return {
    query: q,
    articles: articles.map(article => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      content: article.content,
      sourceName: article.sourceName,
      sourceUrl: article.sourceUrl,
      author: article.author,
      publishedAt: article.publishedAt,
      language: article.language,
      imageUrl: article.imageUrl,
      tags: article.tags,
      category: article.category,
      relevance: article.rank,
      highlights: {
        title: article.headlineTitle,
        summary: article.headlineSummary,
      }
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
})
