import { and, eq, desc, sql, notInArray, or } from 'drizzle-orm'
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

  // Get all article IDs that are duplicates of the current article
  // (either as canonical or as duplicate in the relationship)
  const duplicateRelations = await db.query.articleDuplicates.findMany({
    where: or(
      eq(schema.articleDuplicates.canonicalArticleId, article.id),
      eq(schema.articleDuplicates.duplicateArticleId, article.id)
    ),
    columns: {
      canonicalArticleId: true,
      duplicateArticleId: true
    }
  })

  // Collect all article IDs to exclude (the current article + all its duplicates)
  const excludeIds = new Set<number>([article.id])
  for (const rel of duplicateRelations) {
    excludeIds.add(rel.canonicalArticleId)
    excludeIds.add(rel.duplicateArticleId)
  }
  const excludeIdsArray = Array.from(excludeIds)

  const relatedArticles = await db.query.articles.findMany({
    where: and(
      notInArray(schema.articles.id, excludeIdsArray),
      sql`${schema.articles.tags} && ARRAY[${sql.join(article.tags.map((tag: string) => sql`${tag}`), sql`, `)}]::text[]`
    ),
    orderBy: [desc(schema.articles.publishedAt)],
    limit: 6,
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
