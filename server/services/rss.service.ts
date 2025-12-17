import Parser from 'rss-parser'

interface FeedItem {
  title: string
  description: string
  link: string
  pubDate?: string
  author?: string
  content?: string
}

export async function parseRssFeed(feedUrl: string): Promise<FeedItem[]> {
  try {
    const parser = new Parser()
    const feed = await parser.parseURL(feedUrl)

    return feed.items.map((item) => ({
      title: item.title || '',
      description: item.contentSnippet || item.summary || '',
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate,
      author: item.creator || item.author,
      content: item.content || item.contentSnippet || item.summary
    }))
  }
  catch (error) {
    console.error(`Error parsing RSS feed ${feedUrl}:`, error)
    throw error
  }
}
