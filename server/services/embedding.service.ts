interface EmbeddingInput {
  text: string
}

interface EmbeddingResult {
  success: boolean
  embedding?: number[]
  error?: string
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const EMBEDDING_MODEL = 'openai/text-embedding-3-small'

/**
 * Generate embedding vector for text using OpenRouter embeddings API
 * Uses OpenAI's text-embedding-3-small model (1,536 dimensions)
 *
 * @param input Text to generate embedding for
 * @param retryCount Current retry attempt (for internal use)
 * @returns EmbeddingResult with embedding array or error
 */
export async function generateEmbedding(
  input: EmbeddingInput,
  retryCount = 0
): Promise<EmbeddingResult> {
  if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not configured, skipping embedding generation')
    return {
      success: false,
      error: 'OPENROUTER_API_KEY not configured'
    }
  }

  if (!input.text || input.text.trim().length === 0) {
    return {
      success: false,
      error: 'Input text is empty'
    }
  }

  const MAX_RETRIES = 2
  const RETRY_DELAY_MS = 5000 // 5 seconds base delay

  try {
    // 30 second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://news.antkeeper.com',
        'X-Title': 'Antkeeper News'
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: input.text,
        encoding_format: 'float' // Returns array of floats
      })
    })

    clearTimeout(timeoutId)

    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount)
        console.warn(`OpenRouter rate limit hit (429) - retrying in ${delay/1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`)

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay))

        // Recursive retry
        return generateEmbedding(input, retryCount + 1)
      }

      console.warn('OpenRouter rate limit hit (429) - max retries exceeded, skipping')
      return {
        success: false,
        error: 'Rate limit exceeded - max retries reached'
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenRouter API error: ${response.status} - ${errorText}`)
      return {
        success: false,
        error: `OpenRouter API error: ${response.status}`
      }
    }

    const data = await response.json()
    const embedding = data.data?.[0]?.embedding

    if (!embedding || !Array.isArray(embedding)) {
      console.warn('No embedding returned from API')
      return {
        success: false,
        error: 'No embedding returned from API'
      }
    }

    return {
      success: true,
      embedding
    }

  } catch (error) {
    const errorMessage = (error as Error).name === 'AbortError'
      ? 'Request timeout'
      : (error as Error).message

    console.error(`Embedding generation error: ${errorMessage}`)

    return {
      success: false,
      error: errorMessage
    }
  }
}
