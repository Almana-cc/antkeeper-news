import { sql, eq, and } from 'drizzle-orm'
import { db, schema } from '../utils/db'

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const language = query.language as string | undefined
  const category = query.category as string | undefined

  // Build optional filters
  const conditions = []
  if (language) conditions.push(eq(schema.articles.language, language))
  if (category) conditions.push(eq(schema.articles.category, category))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get unique tags using unnest
  const result = await db.execute(
    sql`
      SELECT DISTINCT unnest(tags) as tag
      FROM ${schema.articles}
      ${whereClause ? sql`WHERE ${whereClause} AND` : sql`WHERE`} tags IS NOT NULL AND array_length(tags, 1) > 0
      ORDER BY tag ASC
    `
  )

  return {
    tags: result.map((row: any) => row.tag).filter(Boolean)
  }
})
