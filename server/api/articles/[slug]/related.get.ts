import { and, eq, desc, sql, or } from 'drizzle-orm'
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

  const duplicateRelations = await db.query.articleDuplicates.findMany({
    where: or(
      eq(schema.articleDuplicates.canonicalArticleId, article.id),
      eq(schema.articleDuplicates.duplicateArticleId, article.id)
    )
  })

  const duplicateIds = new Set<number>()
  duplicateIds.add(article.id)
  for (const rel of duplicateRelations) {
    duplicateIds.add(rel.canonicalArticleId)
    duplicateIds.add(rel.duplicateArticleId)
  }

  const excludeIds = Array.from(duplicateIds)

  const relatedArticles = await db.query.articles.findMany({
    where: and(
      sql`${schema.articles.id} NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})`,
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

  const seenSlugs = new Set<string>()
  const uniqueRelatedArticles = relatedArticles.filter(a => {
    if (seenSlugs.has(a.slug)) return false
    seenSlugs.add(a.slug)
    return true
  })

  return { relatedArticles: uniqueRelatedArticles }
})
