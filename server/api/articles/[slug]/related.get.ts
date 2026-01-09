import { and, eq, ne, desc, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default eventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug is required'
    })
  }

  const article = await db.query.articles.findFirst({
    where: eq(schema.articles.slug, slug),
    columns: {
      id: true,
      tags: true
    }
  })

  if (!article) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article not found'
    })
  }

  if (!article.tags || article.tags.length === 0) {
    return { relatedArticles: [] }
  }

  const relatedArticles = await db.query.articles.findMany({
    where: and(
      ne(schema.articles.id, article.id),
      sql`${schema.articles.tags} && ARRAY[${sql.join(article.tags.map((tag: string) => sql`${tag}`), sql`, `)}]::text[]`
    ),
    orderBy: [desc(schema.articles.publishedAt)],
    limit: 5,
    columns: {
      id: true,
      title: true,
      slug: true,
      imageUrl: true,
      publishedAt: true,
      sourceName: true
    }
  })

  return { relatedArticles }
})
