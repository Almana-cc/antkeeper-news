import { and, eq, desc, sql, ne } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const offset = (page - 1) * limit

  const language = query.language as string | undefined
  const category = query.category as string | undefined

  const conditions = [
    ne(schema.articles.category, 'off-topic')
  ]

  if (language) {
    conditions.push(eq(schema.articles.language, language))
  }

  if (category && category !== 'all') {
    conditions.push(eq(schema.articles.category, category))
  }

  const whereClause = and(...conditions)

  const articles = await db.query.articles.findMany({
    where: whereClause,
    orderBy: [desc(schema.articles.publishedAt)],
    limit,
    offset,
    columns: {
      id: true,
      title: true,
      summary: true,
      imageUrl: true,
      sourceName: true,
      sourceUrl: true,
      category: true,
      publishedAt: true
    }
  })

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.articles)
    .where(whereClause)

  const total = Number(totalResult[0]?.count || 0)
  const totalPages = Math.ceil(total / limit)

  return {
    articles: articles.map(article => ({
      id: article.id,
      title: article.title,
      summary: article.summary,
      imageUrl: article.imageUrl,
      sourceName: article.sourceName,
      sourceUrl: article.sourceUrl,
      publishedAt: article.publishedAt,
      category: article.category
    })),
    page,
    totalPages,
    hasMore: page < totalPages
  }
}, { maxAge: 60 * 60 * 5 /* 5 hour */ })
