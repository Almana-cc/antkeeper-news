import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineCachedEventHandler(async (event) => {
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
      title: true,
      slug: true,
      content: true,
      summary: true,
      sourceName: true,
      sourceUrl: true,
      author: true,
      publishedAt: true,
      language: true,
      imageUrl: true,
      tags: true,
      category: true
    }
  })

  if (!article) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article not found'
    })
  }

  return article
}, { maxAge: 60 * 60 * 5 /* 5 hours */ })
