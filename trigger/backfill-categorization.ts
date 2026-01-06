import { task } from "@trigger.dev/sdk/v3";
import { db, schema } from '../server/utils/db'
import { or, eq, isNull } from 'drizzle-orm'
import { categorizeArticles } from './categorize-articles'

interface BackfillCategorizationPayload {
  limit?: number
}

interface BackfillCategorizationResult {
  success: boolean
  message: string
  articlesFound: number
  categorizeResult?: any
}

/**
 * One-time or manual task to backfill categorization for existing articles
 * Finds articles with empty tags or null category and processes them
 */
export const backfillCategorization = task({
  id: "backfill-categorization",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: BackfillCategorizationPayload = {}): Promise<BackfillCategorizationResult> => {
    const limit = payload.limit || 50 // Default to 50 articles

    console.log(`Finding up to ${limit} articles that need categorization...`)

    // Find articles with empty tags or null/default category
    const uncategorizedArticles = await db.query.articles.findMany({
      where: or(
        eq(schema.articles.tags, []),
        isNull(schema.articles.category),
      ),
      limit,
      orderBy: (articles, { desc }) => [desc(articles.scrapedAt)]
    })

    console.log(`Found ${uncategorizedArticles.length} articles needing categorization`)

    if (uncategorizedArticles.length === 0) {
      return {
        success: true,
        message: 'No articles found that need categorization',
        articlesFound: 0
      }
    }

    // Extract article IDs
    const articleIds = uncategorizedArticles.map(a => a.id)

    // Trigger categorization task
    console.log(`Triggering categorization for ${articleIds.length} articles...`)
    const categorizeResult = await categorizeArticles.triggerAndWait({
      articleIds
    })

    if (!categorizeResult.ok) {
      console.error('Categorization failed:', categorizeResult.error)
      return {
        success: false,
        message: 'Categorization task failed',
        articlesFound: uncategorizedArticles.length,
        categorizeResult: categorizeResult.error
      }
    }

    console.log(`✓ Categorization completed!`)
    console.log(`  Processed: ${categorizeResult.output.articlesProcessed}`)
    console.log(`  Updated: ${categorizeResult.output.articlesUpdated}`)

    return {
      success: true,
      message: `Categorized ${categorizeResult.output.articlesUpdated} articles`,
      articlesFound: uncategorizedArticles.length,
      categorizeResult: categorizeResult.output
    }
  }
});
