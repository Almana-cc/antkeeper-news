import { and, eq, desc, sql, ne, gte } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default eventHandler(async (event) => {
  const query = getQuery(event)

  // Pagination
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const offset = (page - 1) * limit

  // Filters
  const language = query.language as string | undefined
  const category = query.category as string | undefined
  const featured = query.featured === 'true' ? true : undefined
  const tags = query.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) as string[] : undefined
  const dateRange = query.dateRange as string | undefined

  // Build where clause
  const conditions = []

  if (language) {
    conditions.push(eq(schema.articles.language, language))
  }

  if (category) {
    if (category === 'all') {
      // When 'all' is selected, exclude off-topic articles
      conditions.push(ne(schema.articles.category, 'off-topic'))
    } else {
      // Show specific category (including off-topic if explicitly selected)
      conditions.push(eq(schema.articles.category, category))
    }
  }

  if (featured !== undefined) {
    conditions.push(eq(schema.articles.featured, featured))
  }

  if (tags && tags.length > 0) {
    // Check if article.tags array contains any of the requested tags
    conditions.push(
      sql`${schema.articles.tags} && ARRAY[${sql.join(tags.map(tag => sql`${tag}`), sql`, `)}]::text[]`
    )
  }

  // Date range filtering
  if (dateRange && dateRange !== 'all') {
    const now = new Date()
    let cutoffDate: Date

    switch (dateRange) {
      case '24h':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        cutoffDate = now
    }

    conditions.push(gte(schema.articles.publishedAt, cutoffDate))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get articles
  const articles = await db.query.articles.findMany({
    where: whereClause,
    orderBy: [desc(schema.articles.publishedAt)],
    limit,
    offset
  })

  // Get total count for pagination
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.articles)
    .where(whereClause)

  const total = Number(totalResult[0]?.count || 0)
  const totalPages = Math.ceil(total / limit)

  return {
    articles,
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