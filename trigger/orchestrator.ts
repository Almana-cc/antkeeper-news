import { schedules } from "@trigger.dev/sdk/v3";
import { fetchArticles } from "./fetch-articles";
import { scrapeMetadata } from "./scrape-metadata";
import { categorizeArticles } from "./categorize-articles";
import { detectDuplicates } from "./detect-duplicates";
import { wakeDecoderService } from "../server/services/google-news-decoder.service";

interface OrchestratorResult {
  success: boolean
  message: string
  fetchResult: any
  scrapeResult?: any
  categorizeResult?: any
  duplicateResult?: any
  errors?: string[]
}

/**
 * Scheduled task that coordinates the article fetching workflow
 * Runs daily at 2:00 AM UTC (matching previous Vercel cron schedule)
 *
 * Workflow:
 * 1. Fetches articles from RSS sources
 * 2. Triggers metadata scraping for articles that need it
 * 3. Triggers AI categorization and tagging for new articles
 */
export const orchestrateArticleFetch = schedules.task({
  id: "orchestrate-article-fetch",
  cron: "0 2 * * *", // Daily at 2:00 AM UTC
  retry: {
    maxAttempts: 2,
  },
  run: async (payload): Promise<OrchestratorResult> => {
    console.log('Starting scheduled article fetch orchestration...')
    console.log('Scheduled run at:', payload.timestamp)
    console.log('Last run was:', payload.lastTimestamp)
    console.log('Next 5 runs:', payload.upcoming)

    const errors: string[] = []

    // Step 0: Wake up decoder service (Railway sleep mode)
    console.log('Step 0: Waking up decoder service on Railway...')
    await wakeDecoderService()

    // Step 1: Fetch articles from RSS sources
    console.log('Step 1: Fetching articles from RSS sources...')
    const fetchResult = await fetchArticles.triggerAndWait()

    if (!fetchResult.ok) {
      console.error('Failed to fetch articles:', fetchResult.error)
      return {
        success: false,
        message: 'Failed to fetch articles',
        fetchResult: fetchResult.error,
        errors: ['Failed to fetch articles']
      }
    }

    console.log(`✓ Fetched ${fetchResult.output.articlesAdded} articles`)

    // Step 2: Trigger metadata scraping if needed
    let scrapeResult = null
    if (fetchResult.output.articlesNeedingScraping.length > 0) {
      console.log(`Step 2: Triggering metadata scraping for ${fetchResult.output.articlesNeedingScraping.length} articles...`)

      // Split into batches of 50 to avoid overwhelming the scraping service
      const BATCH_SIZE = 50
      const articleIds = fetchResult.output.articlesNeedingScraping
      const batches: number[][] = []

      for (let i = 0; i < articleIds.length; i += BATCH_SIZE) {
        batches.push(articleIds.slice(i, i + BATCH_SIZE))
      }

      console.log(`  Processing ${batches.length} batch(es) of up to ${BATCH_SIZE} articles each`)

      // Trigger all batches using batchTriggerAndWait (parallel execution supported)
      const scrapeResults = await scrapeMetadata.batchTriggerAndWait(
        batches.map(batch => ({
          payload: { articleIds: batch }
        }))
      )

      // Aggregate results
      const aggregatedScrapeResult = {
        articlesProcessed: 0,
        articlesUpdated: 0,
        errors: [] as string[]
      }

      scrapeResults.runs.forEach((result, index) => {
        if (result.ok) {
          aggregatedScrapeResult.articlesProcessed += result.output.articlesProcessed
          aggregatedScrapeResult.articlesUpdated += result.output.articlesUpdated
          aggregatedScrapeResult.errors.push(...result.output.errors)
        } else {
          console.error(`Batch ${index + 1} failed:`, result.error)
          aggregatedScrapeResult.errors.push(`Batch ${index + 1} failed: ${result.error}`)
        }
      })

      scrapeResult = aggregatedScrapeResult
      console.log(`✓ Scraped metadata for ${scrapeResult.articlesUpdated} articles`)

      if (aggregatedScrapeResult.errors.length > 0) {
        errors.push(...aggregatedScrapeResult.errors)
      }
    } else {
      console.log('Step 2: No articles need metadata scraping, skipping...')
    }

    // Step 3: Categorize articles with AI
    let categorizeResult = null
    const allArticleIds = fetchResult.output.allArticleIds

    if (allArticleIds.length > 0) {
      console.log(`Step 3: Categorizing ${allArticleIds.length} articles with AI...`)

      // Batch into groups of 50
      const BATCH_SIZE = 50
      const batches: number[][] = []

      for (let i = 0; i < allArticleIds.length; i += BATCH_SIZE) {
        batches.push(allArticleIds.slice(i, i + BATCH_SIZE))
      }

      console.log(`  Processing ${batches.length} batch(es) of up to ${BATCH_SIZE} articles each`)

      // Trigger all batches in parallel
      const categorizeResults = await categorizeArticles.batchTriggerAndWait(
        batches.map(batch => ({
          payload: { articleIds: batch }
        }))
      )

      // Aggregate results
      const aggregatedCategorizeResult = {
        articlesProcessed: 0,
        articlesUpdated: 0,
        errors: [] as string[]
      }

      categorizeResults.runs.forEach((result, index) => {
        if (result.ok) {
          aggregatedCategorizeResult.articlesProcessed += result.output.articlesProcessed
          aggregatedCategorizeResult.articlesUpdated += result.output.articlesUpdated
          aggregatedCategorizeResult.errors.push(...result.output.errors)
        } else {
          console.error(`Batch ${index + 1} failed:`, result.error)
          aggregatedCategorizeResult.errors.push(`Batch ${index + 1} failed: ${result.error}`)
        }
      })

      categorizeResult = aggregatedCategorizeResult
      console.log(`✓ Categorized ${categorizeResult.articlesUpdated} articles`)

      if (aggregatedCategorizeResult.errors.length > 0) {
        errors.push(...aggregatedCategorizeResult.errors)
      }
    } else {
      console.log('Step 3: No articles to categorize, skipping...')
    }

    // Step 4: Detect duplicates
    let duplicateResult = null
    if (allArticleIds.length > 0) {
      console.log(`Step 4: Detecting duplicates for ${allArticleIds.length} articles...`)

      const detectResult = await detectDuplicates.triggerAndWait({
        articleIds: allArticleIds,
        lookbackDays: 90,              // Can be increased (e.g., 90, 180) or 0 for unlimited
        similarityThreshold: 0.75      // Lowered to catch articles about same event with different wording
      })

      if (!detectResult.ok) {
        console.error('Duplicate detection failed:', detectResult.error)
        errors.push(`Duplicate detection failed: ${detectResult.error}`)
      } else {
        duplicateResult = detectResult.output
        console.log(`✓ Found ${duplicateResult.duplicatesFound} duplicates, created ${duplicateResult.duplicateRecordsCreated} records`)

        if (detectResult.output.errors.length > 0) {
          errors.push(...detectResult.output.errors)
        }
      }
    } else {
      console.log('Step 4: No articles to check for duplicates, skipping...')
    }

    // Combine any errors
    if (fetchResult.output.errors) {
      errors.push(...fetchResult.output.errors)
    }

    console.log('\n✓ Orchestration completed!')

    return {
      success: true,
      message: 'Article fetch orchestration completed',
      fetchResult: fetchResult.output,
      scrapeResult,
      categorizeResult,
      duplicateResult,
      errors: errors.length > 0 ? errors : undefined
    }
  }
});
