import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { parseRssFeed } from '../services/rss.service'
import { matchesKeywords } from '../services/keyword-filter.service'

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

        const config = source.config as { feedUrl?: string }
        const feedUrl = config?.feedUrl
        const language = source.language

        if (!feedUrl) {
          console.warn(`Source ${source.name} has no feedUrl in config, skipping`)
          continue
        }

        const items = await parseRssFeed(feedUrl)
        console.log(`  Found ${items.length} items in feed`)

        let articlesAddedForSource = 0

        // 3. Filter and save articles
        for (const item of items) {
          const toto = true
          if ( toto ) {// matchesKeywords(item.title, item.description, language)) {
            try {
              // Generate slug from title
              const slug = generateSlug(item.title)

              // Insert article
              const [article] = await db.insert(schema.articles).values({
                title: item.title,
                slug: slug,
                content: item.content || item.description,
                summary: item.description,
                sourceName: source.name,
                sourceUrl: item.link,
                author: item.author,
                publishedAt: item.pubDate ? new Date(item.pubDate) : null,
                language: language,
                imageUrl: item.imageUrl,
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
