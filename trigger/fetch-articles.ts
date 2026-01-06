import { task } from "@trigger.dev/sdk/v3";
import { db, schema } from '../server/utils/db'
import { eq } from 'drizzle-orm'
import { parseRssFeed } from '../server/services/rss.service'
import { matchesKeywords } from '../server/services/keyword-filter.service'
import { parseURL } from 'ufo'
import { decodeGoogleNewsFeed } from '../server/services/google-news-decoder.service'

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 500) // Match DB varchar limit
}

interface FetchArticlesResult {
  success: boolean
  message: string
  sourcesProcessed: number
  articlesAdded: number
  articlesNeedingScraping: number[]
  errors?: string[]
}

export const fetchArticles = task({
  id: "fetch-articles",
  retry: {
    maxAttempts: 3,
  },
  run: async (): Promise<FetchArticlesResult> => {
    console.log('Fetching articles from RSS sources...')

    // 1. Query active RSS sources
    const sources = await db.query.sources.findMany({
      where: (sources, { eq, and }) => and(
        eq(sources.type, 'rss'),
        eq(sources.isActive, true)
      )
    })

    console.log(`Found ${sources.length} active RSS sources`)

    // 2. Process all sources in parallel
    const sourceProcessingPromises = sources.map(async (source) => {
      try {
        console.log(`Processing source: ${source.name}`)

        const config = source.config as { feedUrl?: string; needsDecoding?: boolean }
        const feedUrl = config?.feedUrl
        const language = source.language
        const needsDecoding = config?.needsDecoding || false

        if (!feedUrl) {
          console.warn(`Source ${source.name} has no feedUrl in config, skipping`)
          return {
            sourceId: source.id,
            sourceName: source.name,
            articlesAdded: 0,
            articlesNeedingScraping: [],
            errors: [`Source ${source.name} has no feedUrl`]
          }
        }

        let items

        // If source needs decoding, use decoder API instead of RSS parser
        if (needsDecoding) {
          console.log(`  Decoding feed URL with decoder API...`)
          const decodedItems = await decodeGoogleNewsFeed(feedUrl)

          if (!decodedItems) {
            console.error(`  Failed to decode feed, skipping source`)
            return {
              sourceId: source.id,
              sourceName: source.name,
              articlesAdded: 0,
              articlesNeedingScraping: [],
              errors: [`Failed to decode feed for ${source.name}`]
            }
          }

          items = decodedItems.map(item => ({
            title: item.title,
            description: '',  // Will be filled by scraping if needed
            link: item.link,  // Already decoded
            pubDate: item.pubdate,
            author: undefined,
            content: '',
            imageUrl: undefined
          }))
          console.log(`  Decoded ${items.length} items from feed`)
        } else {
          items = await parseRssFeed(feedUrl)
          console.log(`  Found ${items.length} items in feed`)
        }

        let articlesAddedForSource = 0
        const articlesNeedingScrapingForSource: number[] = []
        const sourceErrors: string[] = []

        // 3. Filter and save articles (still sequential per source to avoid slug conflicts)
        for (const item of items) {
          if (matchesKeywords(item.title, item.description, language)) {
            try {
              // Generate slug from title
              const slug = generateSlug(item.title)

              // Check if article already exists by slug
              const existingArticle = await db.query.articles.findFirst({
                where: (articles, { eq }) => eq(articles.slug, slug)
              })

              if (existingArticle) {
                console.log(`    Skipping duplicate: ${item.title.substring(0, 60)}...`)
                continue
              }

              const parsedLink = parseURL(item.link)

              // Check if we need to scrape (missing image, summary, or author)
              const needsScraping = !item.imageUrl || !item.description || !item.author

              // Insert article (without scraping for now)
              const [article] = await db.insert(schema.articles).values({
                title: item.title,
                slug: slug,
                content: item.content || item.description || '',
                summary: item.description || '',
                sourceName: parsedLink.host,
                sourceUrl: item.link,
                author: item.author,
                publishedAt: item.pubDate ? new Date(item.pubDate) : null,
                language: language,
                imageUrl: item.imageUrl,
                tags: [],
                category: null,
              }).returning()

              // Link article to source
              await db.insert(schema.articleSources).values({
                articleId: article.id,
                sourceId: source.id,
                originalUrl: item.link
              })

              articlesAddedForSource++

              // Track articles that need metadata scraping
              if (needsScraping) {
                articlesNeedingScrapingForSource.push(article.id)
              }

              console.log(`    Added: ${item.title.substring(0, 60)}... ${needsScraping ? '(needs scraping)' : ''}`)
            }
            catch (articleError) {
              console.error(`  Error saving article "${item.title}":`, articleError)
              sourceErrors.push(`Failed to save article "${item.title}": ${articleError}`)
            }
          }
        }

        console.log(`  Added ${articlesAddedForSource} articles from ${source.name}`)

        // 4. Update source lastFetchedAt
        await db.update(schema.sources)
          .set({ lastFetchedAt: new Date() })
          .where(eq(schema.sources.id, source.id))

        return {
          sourceId: source.id,
          sourceName: source.name,
          articlesAdded: articlesAddedForSource,
          articlesNeedingScraping: articlesNeedingScrapingForSource,
          errors: sourceErrors
        }
      }
      catch (error) {
        console.error(`Error processing source ${source.name}:`, error)
        return {
          sourceId: source.id,
          sourceName: source.name,
          articlesAdded: 0,
          articlesNeedingScraping: [],
          errors: [`Failed to process source ${source.name}: ${error}`]
        }
      }
    })

    // Wait for all sources to complete (including failures)
    const sourceResults = await Promise.allSettled(sourceProcessingPromises)

    // Aggregate results
    let totalArticlesAdded = 0
    const articlesNeedingScraping: number[] = []
    const errors: string[] = []

    sourceResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const sourceResult = result.value
        totalArticlesAdded += sourceResult.articlesAdded
        articlesNeedingScraping.push(...sourceResult.articlesNeedingScraping)
        if (sourceResult.errors.length > 0) {
          errors.push(...sourceResult.errors)
        }
      } else {
        // Should never happen since we catch errors in the promise, but handle it
        const source = sources[index]
        console.error(`Unexpected rejection for source ${source?.name}:`, result.reason)
        errors.push(`Unexpected failure for source ${source?.name}: ${result.reason}`)
      }
    })

    console.log(`\n✓ Completed! Added ${totalArticlesAdded} articles total`)
    console.log(`  ${articlesNeedingScraping.length} articles need metadata scraping`)

    if (errors.length > 0) {
      console.log(`\n⚠ Encountered ${errors.length} errors:`)
      errors.forEach((err) => console.log(`  - ${err}`))
    }

    return {
      success: true,
      message: 'Articles fetched successfully',
      sourcesProcessed: sources.length,
      articlesAdded: totalArticlesAdded,
      articlesNeedingScraping: articlesNeedingScraping,
      errors: errors.length > 0 ? errors : undefined
    }
  }
});
