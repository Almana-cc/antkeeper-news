import { sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default eventHandler(async (event) => {
  const body = await readBody(event)
  const threshold = body?.threshold || 0.75
  const lookbackDays = body?.lookbackDays || 90

  console.log(`🔍 Running duplicate detection with threshold ${threshold}...`)

  // 1. Get all articles with embeddings
  const articles = await db.query.articles.findMany({
    where: sql`embedding IS NOT NULL`,
    columns: {
      id: true,
    },
    orderBy: sql`id DESC`,
    limit: body?.limit || 500 // Limite pour les tests
  })

  const articleIds = articles.map(a => a.id)
  console.log(`📊 Found ${articleIds.length} articles with embeddings`)

  if (articleIds.length === 0) {
    return {
      success: false,
      message: 'No articles with embeddings found'
    }
  }

  // 2. Pour chaque article, trouve les duplicates
  const distanceThreshold = 1 - threshold
  let duplicatesFound = 0
  let recordsCreated = 0

  for (const articleId of articleIds) {
    const article = await db.query.articles.findFirst({
      where: sql`id = ${articleId}`,
      columns: {
        id: true,
        publishedAt: true,
        embedding: true
      }
    })

    if (!article?.embedding) continue

    // Lookback window
    const lookbackCutoff = lookbackDays > 0
      ? new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
      : null

    // Trouve les articles similaires en utilisant sql.raw pour éviter l'interpolation
    const embeddingJson = JSON.stringify(article.embedding)

    const similarArticlesQuery = lookbackCutoff
      ? sql.raw(`
        SELECT
          id,
          title,
          (embedding <=> '${embeddingJson}'::vector) AS distance,
          (1 - (embedding <=> '${embeddingJson}'::vector)) AS similarity
        FROM articles
        WHERE id != ${articleId}
          AND embedding IS NOT NULL
          AND published_at >= '${lookbackCutoff.toISOString()}'
          AND (embedding <=> '${embeddingJson}'::vector) <= ${distanceThreshold}
        ORDER BY distance ASC
        LIMIT 10
      `)
      : sql.raw(`
        SELECT
          id,
          title,
          (embedding <=> '${embeddingJson}'::vector) AS distance,
          (1 - (embedding <=> '${embeddingJson}'::vector)) AS similarity
        FROM articles
        WHERE id != ${articleId}
          AND embedding IS NOT NULL
          AND (embedding <=> '${embeddingJson}'::vector) <= ${distanceThreshold}
        ORDER BY distance ASC
        LIMIT 10
      `)

    const similarArticles = await db.execute(similarArticlesQuery)
    const rows = similarArticles as unknown as Array<{ id: number; title: string; distance: number; similarity: number }>

    for (const similar of rows) {
      duplicatesFound++

      // Détermine canonical (le plus ancien = ID plus petit)
      const canonicalId = Math.min(articleId, similar.id as number)
      const duplicateId = Math.max(articleId, similar.id as number)

      // Vérifie si la relation existe déjà
      const existing = await db.query.articleDuplicates.findFirst({
        where: sql`canonical_article_id = ${canonicalId} AND duplicate_article_id = ${duplicateId}`
      })

      if (!existing) {
        await db.insert(schema.articleDuplicates).values({
          canonicalArticleId: canonicalId,
          duplicateArticleId: duplicateId,
          similarityScore: similar.similarity as number
        })
        recordsCreated++
        console.log(`  ✅ ${canonicalId} → ${duplicateId} (${(similar.similarity as number).toFixed(3)})`)
      }
    }
  }

  console.log(`✅ Detection complete: ${duplicatesFound} duplicates found, ${recordsCreated} new records created`)

  return {
    success: true,
    threshold,
    lookbackDays,
    articlesProcessed: articleIds.length,
    duplicatesFound,
    recordsCreated
  }
})
