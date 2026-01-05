import { task, wait } from "@trigger.dev/sdk/v3";
import { db, schema } from '../server/utils/db'
import { eq } from 'drizzle-orm'
import { scrapeArticleMetadata } from '../server/services/opengraph-scraper.service'

interface ScrapeMetadataPayload {
  articleIds: number[]
}

interface ScrapeMetadataResult {
  success: boolean
  articlesProcessed: number
  articlesUpdated: number
  errors: string[]
}

export const scrapeMetadata = task({
  id: "scrape-metadata",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: ScrapeMetadataPayload): Promise<ScrapeMetadataResult> => {
    console.log(`Scraping metadata for ${payload.articleIds.length} articles...`)

    let articlesUpdated = 0
    const errors: string[] = []

    for (const articleId of payload.articleIds) {
      try {
        // Fetch the article
        const article = await db.query.articles.findFirst({
          where: (articles, { eq }) => eq(articles.id, articleId)
        })

        if (!article) {
          console.warn(`Article ${articleId} not found, skipping`)
          continue
        }

        console.log(`  Scraping: ${article.title.substring(0, 60)}...`)

        // Scrape metadata
        const metadata = await scrapeArticleMetadata(article.sourceUrl)

        if (metadata.scrapedSuccessfully) {
          // Prepare update data
          const updateData: Partial<typeof schema.articles.$inferInsert> = {}

          if (metadata.ogImage && !article.imageUrl) {
            updateData.imageUrl = metadata.ogImage
          }
          if (metadata.ogDescription && !article.summary) {
            updateData.summary = metadata.ogDescription
            updateData.content = metadata.ogDescription
          }
          if (metadata.author && !article.author) {
            updateData.author = metadata.author
          }

          // Only update if we have new data
          if (Object.keys(updateData).length > 0) {
            await db.update(schema.articles)
              .set(updateData)
              .where(eq(schema.articles.id, articleId))

            articlesUpdated++
            console.log(`    ✓ Updated with scraped data`)
          } else {
            console.log(`    ℹ No new data to update`)
          }
        } else {
          console.warn(`    ⚠ Scraping failed: ${metadata.errorMessage}`)
          errors.push(`Failed to scrape article ${articleId}: ${metadata.errorMessage}`)
        }

        // Add delay to avoid rate limiting (500ms between scrapes)
        // Using Trigger.dev's wait helper for better tracking
        await wait.for({ seconds: 0.5 })
      }
      catch (error) {
        console.error(`  Error processing article ${articleId}:`, error)
        errors.push(`Failed to process article ${articleId}: ${error}`)
      }
    }

    console.log(`\n✓ Completed! Updated ${articlesUpdated} out of ${payload.articleIds.length} articles`)

    if (errors.length > 0) {
      console.log(`\n⚠ Encountered ${errors.length} errors:`)
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
