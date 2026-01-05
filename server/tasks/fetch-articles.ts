import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { parseRssFeed } from '../services/rss.service'
import { matchesKeywords } from '../services/keyword-filter.service'
import { parseURL } from 'ufo'
import { decodeGoogleNewsFeed } from '../services/google-news-decoder.service'
import { scrapeArticleMetadata } from '../services/opengraph-scraper.service'

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 500) // Match DB varchar limit
}

export default defineTask({
  meta: {
    name: 'articles:fetch',
    description: 'Fetch articles from RSS sources and save to database'
  },
  async run() {
    console.log('Fetching articles from RSS sources...')

    // 1. Query active RSS sources
    const sources = await db.query.sources.findMany({
      where: (sources, { eq, and }) => and(
        eq(sources.type, 'rss'),
        eq(sources.isActive, true)
      )
    })

    console.log(`Found ${sources.length} active RSS sources`)

    let totalArticlesAdded = 0
    const errors: string[] = []

    // 2. Process each source
    for (const source of sources) {
      try {
        console.log(`Processing source: ${source.name}`)

        const config = source.config as { feedUrl?: string; needsDecoding?: boolean }
        const feedUrl = config?.feedUrl
        const language = source.language
        const needsDecoding = config?.needsDecoding || false

        if (!feedUrl) {
          console.warn(`Source ${source.name} has no feedUrl in config, skipping`)
          continue
        }

        let items

        // If source needs decoding, use decoder API instead of RSS parser
        if (needsDecoding) {
          console.log(`  Decoding feed URL with decoder API...`)
          const decodedItems = await decodeGoogleNewsFeed(feedUrl)

          if (!decodedItems) {
            console.error(`  Failed to decode feed, skipping source`)
            continue
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

        // 3. Filter and save articles
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

              let scrapedData = {
                ogImage: item.imageUrl,
                ogDescription: item.description,
                author: item.author,
              }

              if (needsScraping) {
                try {
                  console.log(`    Scraping metadata for: ${item.title.substring(0, 60)}...`)
                  const metadata = await scrapeArticleMetadata(item.link)

                  if (metadata.scrapedSuccessfully) {
                    // Only override if scraped data exists
                    if (metadata.ogImage) scrapedData.ogImage = metadata.ogImage
                    if (metadata.ogDescription) scrapedData.ogDescription = metadata.ogDescription
                    if (metadata.author) scrapedData.author = metadata.author
                    console.log(`    ✓ Scraped successfully`)
                  } else {
                    console.warn(`    ⚠ Scraping failed: ${metadata.errorMessage}`)
                  }
                } catch (scrapeError) {
                  console.warn(`    ⚠ Error scraping:`, scrapeError)
                }

                // Add delay to avoid rate limiting (500ms between scrapes)
                await new Promise(resolve => setTimeout(resolve, 500))
              }

              // Insert article
              const [article] = await db.insert(schema.articles).values({
                title: item.title,
                slug: slug,
                content: item.content || scrapedData.ogDescription || '',
                summary: scrapedData.ogDescription || '',
                sourceName: parsedLink.host,
                sourceUrl: item.link,
                author: scrapedData.author,
                publishedAt: item.pubDate ? new Date(item.pubDate) : null,
                language: language,
                imageUrl: scrapedData.ogImage,
                tags: [],
                category: 'news',
              }).returning()

              // Link article to source
              await db.insert(schema.articleSources).values({
                articleId: article.id,
                sourceId: source.id,
                originalUrl: item.link
              })

              articlesAddedForSource++
              totalArticlesAdded++
            }
            catch (articleError) {
              console.error(`  Error saving article "${item.title}":`, articleError)
              errors.push(`Failed to save article "${item.title}" from ${source.name}`)
            }
          }
        }

        console.log(`  Added ${articlesAddedForSource} articles from ${source.name}`)

        // 4. Update source lastFetchedAt
        await db.update(schema.sources)
          .set({ lastFetchedAt: new Date() })
          .where(eq(schema.sources.id, source.id))
      }
      catch (error) {
        console.error(`Error processing source ${source.name}:`, error)
        errors.push(`Failed to process source ${source.name}: ${error}`)
      }
    }

    console.log(`\n✓ Completed! Added ${totalArticlesAdded} articles total`)
    if (errors.length > 0) {
      console.log(`\n⚠ Encountered ${errors.length} errors:`)
      errors.forEach((err) => console.log(`  - ${err}`))
    }

    return {
      success: true,
      message: 'Articles fetched successfully',
      sourcesProcessed: sources.length,
      articlesAdded: totalArticlesAdded,
      errors: errors.length > 0 ? errors : undefined
    }
  }
})
