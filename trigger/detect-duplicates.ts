import { task, wait } from "@trigger.dev/sdk/v3";
import { db, schema } from '../server/utils/db'
import { eq, and, gte, ne, isNotNull, sql } from 'drizzle-orm'
import { generateEmbedding } from '../server/services/embedding.service'

interface DetectDuplicatesPayload {
  articleIds: number[]           // New articles to check for duplicates
  lookbackDays?: number          // How far back to check (default: 30, 0 = unlimited)
  similarityThreshold?: number   // Minimum similarity score (default: 0.85)
}

interface DetectDuplicatesResult {
  success: boolean
  articlesProcessed: number
  duplicatesFound: number
  duplicateRecordsCreated: number
  errors: string[]
}

/**
 * Detect duplicate articles using pgvector similarity search
 *
 * Algorithm:
 * 1. Generate embeddings for new articles
 * 2. Use pgvector's <=> operator to find similar articles
 * 3. Store duplicates in articleDuplicates table for fast querying
 *
 * Why store duplicates?
 * - Detection: Use pgvector ORDER BY embedding <=> query (fast, runs daily)
 * - Querying: Pre-computed table for instant UI lookups (no re-computation)
 */
export const detectDuplicates = task({
  id: "detect-duplicates",
  retry: {
    maxAttempts: 3,
    factor: 2.0,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: DetectDuplicatesPayload): Promise<DetectDuplicatesResult> => {
    console.log(`Detecting duplicates for ${payload.articleIds.length} articles...`)

    const lookbackDays = payload.lookbackDays !== undefined ? payload.lookbackDays : 30
    const similarityThreshold = payload.similarityThreshold || 0.75
    const distanceThreshold = 1 - similarityThreshold // Convert to distance: 0.75 similarity = 0.25 distance

    const errors: string[] = []
    let articlesProcessed = 0
    let duplicatesFound = 0
    let duplicateRecordsCreated = 0

    // Calculate lookback date (0 = unlimited)
    const lookbackDate = lookbackDays > 0 ? new Date() : null
    if (lookbackDate) {
      lookbackDate.setDate(lookbackDate.getDate() - lookbackDays)
    }

    console.log(`  Similarity threshold: ${similarityThreshold} (distance <= ${distanceThreshold.toFixed(3)})`)
    console.log(`  Lookback period: ${lookbackDays === 0 ? 'unlimited (all articles with embeddings)' : `${lookbackDays} days (since ${lookbackDate?.toISOString().split('T')[0]})`}`)

    // Fetch articles to process
    const articlesToProcess = await db.query.articles.findMany({
      where: (articles, { inArray }) => inArray(articles.id, payload.articleIds),
      columns: {
        id: true,
        title: true,
        summary: true,
        embedding: true
      }
    })

    console.log(`  Found ${articlesToProcess.length} article(s) to process\n`)

    if (articlesToProcess.length === 0) {
      console.log('✓ No articles to process!')
      return {
        success: true,
        articlesProcessed: 0,
        duplicatesFound: 0,
        duplicateRecordsCreated: 0,
        errors: []
      }
    }

    // Process each new article
    for (const article of articlesToProcess) {
      try {
        console.log(`  [${articlesProcessed + 1}/${articlesToProcess.length}] Processing: ${article.title.substring(0, 60)}...`)

        // Generate embedding if not already present
        let embedding = article.embedding

        if (!embedding) {
          const embeddingText = `${article.title} ${article.summary || ''}`
          const embeddingResult = await generateEmbedding({ text: embeddingText })

          if (!embeddingResult.success || !embeddingResult.embedding) {
            console.warn(`    ⚠ Failed to generate embedding: ${embeddingResult.error}`)
            errors.push(`Failed to embed article ${article.id}: ${embeddingResult.error}`)

            // Stop if rate limited
            if (embeddingResult.error?.includes('Rate limit')) {
              console.warn('    ⚠ Rate limit hit - stopping batch')
              break
            }
            continue
          }

          embedding = embeddingResult.embedding

          // Store embedding in database
          await db.update(schema.articles)
            .set({ embedding: sql`${JSON.stringify(embedding)}::vector` })
            .where(eq(schema.articles.id, article.id))

          console.log(`    ✓ Generated and stored embedding`)
        } else {
          console.log(`    ✓ Using existing embedding`)
        }

        // Find similar articles using pgvector similarity search
        // <=> operator: cosine distance (lower = more similar)
        // Filters: recent articles (if lookbackDays > 0), exclude self, must have embeddings
        const similarArticlesQuery = lookbackDate
          ? sql`
            SELECT
              id,
              title,
              (embedding <=> ${JSON.stringify(embedding)}::vector) AS distance
            FROM articles
            WHERE published_at >= ${lookbackDate}
              AND id != ${article.id}
              AND embedding IS NOT NULL
            ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
            LIMIT 10
          `
          : sql`
            SELECT
              id,
              title,
              (embedding <=> ${JSON.stringify(embedding)}::vector) AS distance
            FROM articles
            WHERE id != ${article.id}
              AND embedding IS NOT NULL
            ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
            LIMIT 10
          `

        const similarArticles = await db.execute(similarArticlesQuery)
        const rows = similarArticles as unknown as Array<{ id: number; title: string; distance: number }>

        // Filter by distance threshold
        const duplicates = rows.filter(row => row.distance <= distanceThreshold)

        if (duplicates.length > 0) {
          console.log(`    🔍 Found ${duplicates.length} duplicate(s):`)
          duplicatesFound += duplicates.length

          for (const dup of duplicates) {
            const similarity = (1 - dup.distance).toFixed(3)
            console.log(`      → Article #${dup.id}: similarity ${similarity} (distance ${dup.distance.toFixed(3)})`)
            console.log(`        "${dup.title.substring(0, 60)}..."`)

            // Determine canonical (older article = canonical)
            const isNewer = article.id > dup.id
            const canonicalId = isNewer ? dup.id : article.id
            const duplicateId = isNewer ? article.id : dup.id

            // Check if relationship already exists (either direction)
            const existing = await db.query.articleDuplicates.findFirst({
              where: (articleDuplicates, { and, eq, or }) => or(
                and(
                  eq(articleDuplicates.canonicalArticleId, canonicalId),
                  eq(articleDuplicates.duplicateArticleId, duplicateId)
                ),
                and(
                  eq(articleDuplicates.canonicalArticleId, duplicateId),
                  eq(articleDuplicates.duplicateArticleId, canonicalId)
                )
              )
            })

            if (!existing) {
              // Store in articleDuplicates table for fast future queries
              await db.insert(schema.articleDuplicates).values({
                canonicalArticleId: canonicalId,
                duplicateArticleId: duplicateId,
                similarityScore: 1 - dup.distance // Store as similarity (0-1)
              })
              duplicateRecordsCreated++
              console.log(`      ✓ Stored duplicate relationship`)
            } else {
              console.log(`      ⊘ Relationship already exists`)
            }
          }
        } else {
          console.log(`    ✓ No duplicates found`)
        }

        articlesProcessed++

        // Rate limiting: 5s delay between API calls (only if we generated an embedding)
        if (!article.embedding) {
          console.log(`    ⏳ Waiting 5 seconds (rate limiting)...\n`)
          await wait.for({ seconds: 5 })
        } else {
          console.log('') // Blank line for readability
        }

      } catch (error) {
        console.error(`  Error processing article ${article.id}:`, error)
        errors.push(`Failed to process article ${article.id}: ${error}`)
      }
    }

    console.log(`\n✓ Completed!`)
    console.log(`  Articles processed: ${articlesProcessed}/${articlesToProcess.length}`)
    console.log(`  Duplicates found: ${duplicatesFound}`)
    console.log(`  Duplicate records created: ${duplicateRecordsCreated}`)

    if (errors.length > 0) {
      console.log(`\n⚠ Encountered ${errors.length} error(s):`)
      errors.forEach((err) => console.log(`  - ${err}`))
    }

    return {
      success: true,
      articlesProcessed,
      duplicatesFound,
      duplicateRecordsCreated,
      errors
    }
  }
});
