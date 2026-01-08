import { task, wait } from "@trigger.dev/sdk/v3";
import { db, schema } from '../server/utils/db'
import { eq, isNull, sql } from 'drizzle-orm'
import { generateEmbedding } from '../server/services/embedding.service'
import { detectDuplicates } from './detect-duplicates'

interface BackfillEmbeddingsPayload {
  limit?: number               // Maximum number of articles to process (default: 100)
  batchSize?: number           // Not used but kept for consistency (default: 50)
  detectDuplicatesAfter?: boolean // Trigger duplicate detection after backfill (default: true)
  lookbackDays?: number        // Lookback period for duplicate detection (default: 0 = unlimited)
}

interface BackfillEmbeddingsResult {
  success: boolean
  articlesProcessed: number
  articlesUpdated: number
  errors: string[]
}

/**
 * Backfill embeddings for existing articles that don't have them yet
 *
 * This is a one-time or periodic task to generate embeddings for historical articles.
 * Can be triggered manually via Trigger.dev dashboard.
 *
 * Usage:
 * - Start with small batches (limit: 50-100) to test
 * - Increase limit for full backfill
 * - Monitor rate limits (5s delay between API calls)
 */
export const backfillEmbeddings = task({
  id: "backfill-embeddings",
  retry: {
    maxAttempts: 2,
    factor: 2.0,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: BackfillEmbeddingsPayload = {}): Promise<BackfillEmbeddingsResult> => {
    const limit = payload.limit || 100
    const detectDuplicatesAfter = payload.detectDuplicatesAfter !== undefined ? payload.detectDuplicatesAfter : true
    const lookbackDays = payload.lookbackDays !== undefined ? payload.lookbackDays : 0 // 0 = unlimited

    console.log(`Backfilling embeddings for up to ${limit} articles...`)
    console.log(`  Detect duplicates after: ${detectDuplicatesAfter}`)
    if (detectDuplicatesAfter) {
      console.log(`  Duplicate detection lookback: ${lookbackDays === 0 ? 'unlimited' : `${lookbackDays} days`}\n`)
    } else {
      console.log('')
    }

    const errors: string[] = []
    let articlesUpdated = 0

    // Find articles without embeddings
    const articles = await db.query.articles.findMany({
      where: (articles, { isNull }) => isNull(articles.embedding),
      limit: limit,
      orderBy: (articles, { desc }) => [desc(articles.publishedAt)],
      columns: {
        id: true,
        title: true,
        summary: true
      }
    })

    console.log(`Found ${articles.length} articles without embeddings\n`)

    if (articles.length === 0) {
      console.log('✓ No articles to process!')
      return {
        success: true,
        articlesProcessed: 0,
        articlesUpdated: 0,
        errors: []
      }
    }

    // Process each article
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]

      try {
        console.log(`[${i + 1}/${articles.length}] Processing article #${article.id}`)
        console.log(`  Title: ${article.title.substring(0, 70)}...`)

        // Generate embedding from title + summary
        const embeddingText = `${article.title} ${article.summary || ''}`
        const embeddingResult = await generateEmbedding({ text: embeddingText })

        if (!embeddingResult.success || !embeddingResult.embedding) {
          console.warn(`  ⚠ Failed to generate embedding: ${embeddingResult.error}`)
          errors.push(`Failed to embed article ${article.id}: ${embeddingResult.error}`)

          // Stop if rate limited
          if (embeddingResult.error?.includes('Rate limit')) {
            console.warn('  ⚠ Rate limit hit - stopping batch')
            break
          }
          continue
        }

        // Store embedding in database
        await db.update(schema.articles)
          .set({ embedding: sql`${JSON.stringify(embeddingResult.embedding)}::vector` })
          .where(eq(schema.articles.id, article.id))

        articlesUpdated++
        console.log(`  ✓ Generated and stored embedding`)

        // Rate limiting: 5s delay between API calls
        // Free tier: 20 req/min for embeddings → 12 requests/min with 5s delay provides buffer
        if (i < articles.length - 1) { // Don't wait after the last article
          console.log(`  ⏳ Waiting 5 seconds (rate limiting)...\n`)
          await wait.for({ seconds: 5 })
        }

      } catch (error) {
        console.error(`  Error processing article ${article.id}:`, error)
        errors.push(`Failed to process article ${article.id}: ${error}`)
      }
    }

    console.log(`\n✓ Backfill completed!`)
    console.log(`  Articles processed: ${articles.length}`)
    console.log(`  Embeddings generated: ${articlesUpdated}`)

    if (errors.length > 0) {
      console.log(`\n⚠ Encountered ${errors.length} error(s):`)
      errors.forEach((err) => console.log(`  - ${err}`))
    }

    // Trigger duplicate detection for the articles we just backfilled
    if (detectDuplicatesAfter && articlesUpdated > 0) {
      console.log(`\n🔍 Triggering duplicate detection for ${articlesUpdated} articles...`)
      console.log(`  Lookback period: ${lookbackDays === 0 ? 'unlimited (all articles with embeddings)' : `${lookbackDays} days`}`)

      const articleIds = articles
        .filter((_, index) => index < articlesUpdated) // Only articles that got embeddings
        .map(article => article.id)

      try {
        const detectResult = await detectDuplicates.triggerAndWait({
          articleIds,
          lookbackDays,
          similarityThreshold: 0.85
        })

        if (detectResult.ok) {
          console.log(`\n✓ Duplicate detection completed!`)
          console.log(`  Duplicates found: ${detectResult.output.duplicatesFound}`)
          console.log(`  Duplicate records created: ${detectResult.output.duplicateRecordsCreated}`)

          if (detectResult.output.errors.length > 0) {
            console.log(`\n⚠ Duplicate detection encountered ${detectResult.output.errors.length} error(s):`)
            detectResult.output.errors.forEach((err) => console.log(`  - ${err}`))
            errors.push(...detectResult.output.errors)
          }
        } else {
          console.error(`\n⚠ Duplicate detection failed: ${detectResult.error}`)
          errors.push(`Duplicate detection failed: ${detectResult.error}`)
        }
      } catch (error) {
        console.error(`\n⚠ Failed to trigger duplicate detection:`, error)
        errors.push(`Failed to trigger duplicate detection: ${error}`)
      }
    }

    return {
      success: true,
      articlesProcessed: articles.length,
      articlesUpdated,
      errors
    }
  }
});
