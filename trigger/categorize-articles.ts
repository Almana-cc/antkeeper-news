import { task, wait } from "@trigger.dev/sdk/v3";
import { db, schema } from '../server/utils/db'
import { eq } from 'drizzle-orm'
import { categorizeArticle } from '../server/services/openrouter-categorization.service'

interface CategorizeArticlesPayload {
  articleIds: number[]
}

interface CategorizeArticlesResult {
  success: boolean
  articlesProcessed: number
  articlesUpdated: number
  errors: string[]
}

export const categorizeArticles = task({
  id: "categorize-articles",
  retry: {
    maxAttempts: 3,
    factor: 2.0,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: CategorizeArticlesPayload): Promise<CategorizeArticlesResult> => {
    console.log(`Categorizing ${payload.articleIds.length} articles...`)

    let articlesUpdated = 0
    const errors: string[] = []

    for (const articleId of payload.articleIds) {
      try {
        // Fetch article with enriched metadata
        const article = await db.query.articles.findFirst({
          where: (articles, { eq }) => eq(articles.id, articleId)
        })

        if (!article) {
          console.warn(`  Article ${articleId} not found, skipping`)
          continue
        }

        console.log(`  Categorizing: ${article.title.substring(0, 60)}...`)

        // Call AI categorization service
        const categorization = await categorizeArticle({
          title: article.title,
          summary: article.summary || '',
          content: article.content?.substring(0, 1000) || '', // First 1000 chars
          language: article.language || 'en'
        })

        if (categorization.success) {
          // Update article with tags and category
          await db.update(schema.articles)
            .set({
              tags: categorization.tags,
              category: categorization.category
            })
            .where(eq(schema.articles.id, articleId))

          articlesUpdated++
          console.log(`    ✓ Tags: [${categorization.tags.join(', ')}], Category: ${categorization.category}`)
        } else {
          console.warn(`    ⚠ Categorization failed: ${categorization.error}`)

          // If it's a rate limit error, stop processing this batch
          if (categorization.error?.includes('Rate limit')) {
            console.warn('    ⚠ Rate limit hit - stopping batch processing')
            errors.push(`Rate limit exceeded at article ${articleId}. Remaining articles will retry next day.`)
            break // Stop processing this batch
          }

          errors.push(`Failed to categorize article ${articleId}: ${categorization.error}`)
        }

        // Rate limiting: 100ms delay between API calls
        // Free tier: 1000 req/day = ~1 req/minute safe rate
        await wait.for({ seconds: 0.1 })

      } catch (error) {
        console.error(`  Error processing article ${articleId}:`, error)
        errors.push(`Failed to process article ${articleId}: ${error}`)
      }
    }

    console.log(`\n✓ Completed! Updated ${articlesUpdated} out of ${payload.articleIds.length} articles`)

    if (errors.length > 0) {
      console.log(`\n⚠ Encountered ${errors.length} error(s):`)
      errors.forEach((err) => console.log(`  - ${err}`))
    }

    return {
      success: true,
      articlesProcessed: payload.articleIds.length,
      articlesUpdated,
      errors
    }
  }
});
