import { and, eq, desc, sql, ne, gte, or, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { containsNegativeContent } from '../services/keyword-filter.service'

export default defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event)

    // Pagination
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const offset = (page - 1) * limit

    // Filters
    const language = query.language as string | undefined
    const category = query.category as string | undefined
    const featured = query.featured === 'true' ? true : undefined
    const tags = query.tags
      ? ((Array.isArray(query.tags) ? query.tags : [query.tags]) as string[])
      : undefined
    const dateRange = query.dateRange as string | undefined

    // Build where clause
    const conditions = []

    if (language) {
      conditions.push(eq(schema.articles.language, language))
    }

    if (category) {
      if (category === 'all') {
        conditions.push(ne(schema.articles.category, 'off-topic'))
      } else {
        conditions.push(eq(schema.articles.category, category))
      }
    }

    if (featured !== undefined) {
      conditions.push(eq(schema.articles.featured, featured))
    }

    if (tags && tags.length > 0) {
      conditions.push(
        sql`${schema.articles.tags} && ARRAY[${sql.join(
          tags.map((tag) => sql`${tag}`),
          sql`, `
        )}]::text[]`
      )
    }

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

    // Fetch extra to allow filtering out negative-content (pest/eradication) articles
    const fetchLimit = limit + 50
    const rows = (await db.query.articles.findMany({
      where: whereClause,
      orderBy: [desc(schema.articles.publishedAt)],
      limit: fetchLimit,
      offset,
      columns: {
        id: true,
        title: true,
        imageUrl: true,
        author: true,
        content: true,
        summary: true,
        slug: true,
        sourceName: true,
        sourceUrl: true,
        language: true,
        category: true,
        tags: true,
        publishedAt: true
      }
    })) as ArticleWithDuplicates[]

    const articles = rows
      .filter(
        (a) =>
          !containsNegativeContent(a.title, a.summary ?? '', a.language ?? 'en')
      )
      .slice(0, limit)

    // Fetch duplicates for all articles in this page
    if (articles.length > 0) {
      const articleIds = articles.map((a) => a.id)
      const allDuplicateRelations = await db.query.articleDuplicates.findMany({
        where: or(
          inArray(schema.articleDuplicates.canonicalArticleId, articleIds),
          inArray(schema.articleDuplicates.duplicateArticleId, articleIds)
        )
      })

      if (allDuplicateRelations.length > 0) {
        const relatedArticleIds = [
          ...new Set(
            allDuplicateRelations.flatMap((rel) => [
              rel.canonicalArticleId,
              rel.duplicateArticleId
            ])
          )
        ].filter((id) => !articleIds.includes(id))

        const allArticlesMap = new Map(
          articles.map((a) => [
            a.id,
            {
              id: a.id,
              title: a.title,
              author: a.author,
              sourceName: a.sourceName,
              sourceUrl: a.sourceUrl,
              language: a.language,
              publishedAt: a.publishedAt
            }
          ])
        )

        if (relatedArticleIds.length > 0) {
          const relatedArticles = await db.query.articles.findMany({
            where: inArray(schema.articles.id, relatedArticleIds),
            columns: {
              id: true,
              title: true,
              author: true,
              sourceName: true,
              sourceUrl: true,
              language: true,
              publishedAt: true
            }
          })
          relatedArticles.forEach((a) => allArticlesMap.set(a.id, a))
        }

        articles.forEach((article) => {
          const articleDuplicateRelations = allDuplicateRelations.filter(
            (rel) =>
              rel.canonicalArticleId === article.id ||
              rel.duplicateArticleId === article.id
          )
          if (articleDuplicateRelations.length > 0) {
            const duplicateArticles = articleDuplicateRelations
              .map((rel) => {
                const duplicateId =
                  rel.canonicalArticleId === article.id
                    ? rel.duplicateArticleId
                    : rel.canonicalArticleId
                const duplicateArticle = allArticlesMap.get(duplicateId)
                return duplicateArticle
                  ? {
                      id: duplicateArticle.id,
                      title: duplicateArticle.title,
                      author: duplicateArticle.author,
                      sourceName: duplicateArticle.sourceName,
                      sourceUrl: duplicateArticle.sourceUrl,
                      language: duplicateArticle.language,
                      publishedAt: duplicateArticle.publishedAt,
                      similarityScore: rel.similarityScore
                    }
                  : null
              })
              .filter((dup) => dup !== null)
            if (duplicateArticles.length > 0) {
              article.duplicates = {
                count: duplicateArticles.length,
                articles: duplicateArticles
              }
            }
          }
        })

        const articleIdsToRemove = new Set<number>()
        allDuplicateRelations.forEach((rel) => {
          const canonicalInPage = articleIds.includes(rel.canonicalArticleId)
          const duplicateInPage = articleIds.includes(rel.duplicateArticleId)
          if (canonicalInPage && duplicateInPage) {
            articleIdsToRemove.add(rel.duplicateArticleId)
          }
        })
        const filteredArticles = articles.filter(
          (a) => !articleIdsToRemove.has(a.id)
        )
        articles.length = 0
        articles.push(...filteredArticles)
      }
    }

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
  },
  { maxAge: 60 * 60 * 5 /* 5 hours */ }
)
