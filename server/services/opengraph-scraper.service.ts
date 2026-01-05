import * as cheerio from 'cheerio'

interface ScrapedMetadata {
  ogImage?: string
  ogDescription?: string
  author?: string
  scrapedSuccessfully: boolean
  errorMessage?: string
}

/**
 * Scrapes OpenGraph metadata from an article URL
 * @param articleUrl - The URL of the article to scrape
 * @returns Scraped metadata object
 */
export async function scrapeArticleMetadata(articleUrl: string): Promise<ScrapedMetadata> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const response = await fetch(articleUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AntkeeperNews/1.0 (RSS aggregator; +https://news.antkeeper.com)'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        scrapedSuccessfully: false,
        errorMessage: `HTTP ${response.status}`
      }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const ogImage = $('meta[property="og:image"]').attr('content')
    const ogDescription = $('meta[property="og:description"]').attr('content')
    const author = $('meta[name="author"]').attr('content')
                || $('meta[property="article:author"]').attr('content')

    return {
      ogImage,
      ogDescription,
      author,
      scrapedSuccessfully: true
    }
  } catch (error) {
    return {
      scrapedSuccessfully: false,
      errorMessage: (error as Error).name === 'AbortError' ? 'Timeout' : (error as Error).message
    }
  }
}
