interface NewsItem {
  title: string
  link: string  // The decoded link
  pubdate: string
}

const DECODER_URL = 'https://news-decoder-api-production.up.railway.app'

/**
 * Wakes up the decoder service on Railway (which may be in sleep mode)
 * Makes a lightweight request to spin up the service before actual work
 * @returns true if service responded, false otherwise
 */
export async function wakeDecoderService(): Promise<boolean> {
  try {
    console.log('[Decoder] Waking up decoder service...')
    const startTime = Date.now()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout for wake-up

    const response = await fetch(`${DECODER_URL}`, {
      method: 'GET',
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const responseTime = Date.now() - startTime
    console.log(`[Decoder] Service responded in ${responseTime}ms (status: ${response.status})`)

    return response.ok
  } catch (error) {
    // Even if it fails, the service might be waking up
    console.log('[Decoder] Wake-up request failed, but service may still be starting:', (error as Error).message)
    return false
  }
}

/**
 * Decodes a Google News feed URL to get real article links
 * @param googleNewsFeedUrl - The Google News RSS feed URL
 * @returns Array of NewsItems with decoded links, or null if decoding fails
 */
export async function decodeGoogleNewsFeed(googleNewsFeedUrl: string): Promise<NewsItem[] | null> {
  const startTime = Date.now()

  try {
    console.log(`  [Decoder] Starting decode request for: ${googleNewsFeedUrl}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 2min timeout

    const requestBody = { url: googleNewsFeedUrl }
    console.log(`  [Decoder] Request body:`, JSON.stringify(requestBody))

    const response = await fetch(
      `${DECODER_URL}/decode`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    const responseTime = Date.now() - startTime
    console.log(`  [Decoder] Response received in ${responseTime}ms (${(responseTime / 1000).toFixed(2)}s)`)
    console.log(`  [Decoder] Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`  [Decoder] Error response body:`, errorText)
      return null
    }

    const responseText = await response.text()
    console.log(`  [Decoder] Response body (first 500 chars):`, responseText.substring(0, 500))

    const data = JSON.parse(responseText)

    // API returns a plain array, not an object with news_items field
    if (!Array.isArray(data)) {
      console.warn(`  [Decoder] Response is not an array. Type:`, typeof data)
      return null
    }

    if (data.length === 0) {
      console.warn(`  [Decoder] Returned empty array`)
      return []
    }

    console.log(`  [Decoder] Successfully decoded ${data.length} items`)
    console.log(`  [Decoder] First item sample:`, data[0])

    return data
  } catch (error) {
    const responseTime = Date.now() - startTime

    if ((error as Error).name === 'AbortError') {
      console.error(`  [Decoder] Timeout after ${responseTime}ms (${(responseTime / 1000).toFixed(2)}s)`)
    } else {
      console.error(`  [Decoder] Error after ${responseTime}ms:`, error)
      console.error(`  [Decoder] Error name:`, (error as Error).name)
      console.error(`  [Decoder] Error message:`, (error as Error).message)
    }
    return null
  }
}
