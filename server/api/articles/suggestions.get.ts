import { sql, ilike, desc } from 'drizzle-orm'
import { db, schema } from 'hub:db'

/**
 * GET /api/articles/suggestions
 * Returns search suggestions based on popular tags matching the query prefix
 *
 * Query params:
 * - q: Search query prefix (required, min 2 chars)
 * - limit: Max suggestions to return (default 5, max 8)
 */
export default eventHandler(async (event) => {
  const query = getQuery(event)
  const searchQuery = (query.q as string || '').trim().toLowerCase()
  const limit = Math.min(8, Math.max(1, Number(query.limit) || 5))

  // Require at least 2 characters to search
  if (searchQuery.length < 2) {
    return { suggestions: [] }
  }

  // Get popular tags that match the query prefix
  // Using unnest to expand the tags array and group by tag with count
  const tagResults = await db.execute(
    sql`
      SELECT
        tag,
        COUNT(*) as article_count
      FROM (
        SELECT unnest(tags) as tag
        FROM ${schema.articles}
        WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      ) t
      WHERE LOWER(tag) LIKE ${`${searchQuery}%`}
      GROUP BY tag
      ORDER BY article_count DESC, tag ASC
      LIMIT ${limit}
    `
  )

  const tagSuggestions = (tagResults as unknown as { tag: string; article_count: number }[]).map((row) => ({
    type: 'tag' as const,
    value: row.tag,
    count: Number(row.article_count)
  }))

  // Also search for matching article titles (for direct article suggestions)
  const titleResults = await db
    .select({
      title: schema.articles.title,
      slug: schema.articles.slug
    })
    .from(schema.articles)
    .where(ilike(schema.articles.title, `%${searchQuery}%`))
    .orderBy(desc(schema.articles.publishedAt))
    .limit(3)

  const titleSuggestions = titleResults.map((row) => ({
    type: 'article' as const,
    value: row.title,
    slug: row.slug
  }))

  // Combine suggestions: tags first, then article titles
  // Limit total to requested limit
  const suggestions = [
    ...tagSuggestions,
    ...titleSuggestions
  ].slice(0, limit)

  return { suggestions }
})
