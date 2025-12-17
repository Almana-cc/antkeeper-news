import Parser from 'rss-parser'

interface FeedItem {
  title: string
  description: string
  link: string
  pubDate?: string
  author?: string
  content?: string
  imageUrl?: string
}

export async function parseRssFeed(feedUrl: string): Promise<FeedItem[]> {
  try {
    const parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'media:content'],
          ['media:thumbnail', 'media:thumbnail'],
        ]
      }
    })
    const feed = await parser.parseURL(feedUrl)

    return feed.items.map((item) => {
      // Extract image URL from various possible sources
      let imageUrl: string | undefined

      // 1. Check enclosure tag (most common for images)
      if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
        imageUrl = item.enclosure.url
      }
      // 2. Check media:content
      else if ((item as any)['media:content']?.$ ?.url) {
        imageUrl = (item as any)['media:content'].$.url
      }
      // 3. Check media:thumbnail
      else if ((item as any)['media:thumbnail']?.$.url) {
        imageUrl = (item as any)['media:thumbnail'].$.url
      }
      // 4. Check iTunes image
      else if ((item as any).itunes?.image) {
        imageUrl = (item as any).itunes.image
      }

      return {
        title: item.title || '',
        description: item.contentSnippet || item.summary || '',
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate,
        author: item.creator || item.author,
        content: item.content || item.contentSnippet || item.summary,
        imageUrl
      }
    })
  }
  catch (error) {
    console.error(`Error parsing RSS feed ${feedUrl}:`, error)
    throw error
  }
}
