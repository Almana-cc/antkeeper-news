interface ArticleInput {
  title: string
  summary: string
  content: string
  language: string
}

interface CategorizationResult {
  success: boolean
  tags: string[]
  category: string
  error?: string
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// Using free model - no paid fallback
const MODEL = 'mistralai/mistral-7b-instruct:free'

export async function categorizeArticle(input: ArticleInput, retryCount = 0): Promise<CategorizationResult> {
  if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not configured, skipping categorization')
    return {
      success: false,
      tags: [],
      category: 'news',
      error: 'OPENROUTER_API_KEY not configured'
    }
  }

  const MAX_RETRIES = 2
  const RETRY_DELAY_MS = 5000 // 5 seconds base delay

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    // Build language-aware prompts
    const systemPrompt = buildSystemPrompt(input.language)
    const userPrompt = buildUserPrompt(input)

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://news.antkeeper.com',
        'X-Title': 'Antkeeper News'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 200
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
        return categorizeArticle(input, retryCount + 1)
      }

      console.warn('OpenRouter rate limit hit (429) - max retries exceeded, skipping')
      return {
        success: false,
        tags: [],
        category: 'news',
        error: 'Rate limit exceeded - max retries reached'
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenRouter API error: ${response.status} - ${errorText}`)
      return {
        success: false,
        tags: [],
        category: 'news',
        error: `OpenRouter API error: ${response.status}`
      }
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      console.warn('No response content from AI model')
      return {
        success: false,
        tags: [],
        category: 'news',
        error: 'No response from AI model'
      }
    }

    // Parse JSON response
    const parsed = JSON.parse(content)

    // Validate and normalize
    const tags = normalizeTags(parsed.tags || [])
    const category = normalizeCategory(parsed.category || 'news')

    return {
      success: true,
      tags,
      category
    }

  } catch (error) {
    const errorMessage = (error as Error).name === 'AbortError'
      ? 'Request timeout'
      : (error as Error).message

    console.error(`Categorization error: ${errorMessage}`)

    return {
      success: false,
      tags: [],
      category: 'news',
      error: errorMessage
    }
  }
}

function buildSystemPrompt(language: string): string {
  const prompts: Record<string, string> = {
    en: `You are an expert in myrmecology (ant science). Analyze articles and determine if they are truly about ants/myrmecology.

IMPORTANT: Some articles may contain the word "ants" but are NOT actually about ants as insects (e.g., idiomatic expressions like "ants in your pants", medical articles about tingling sensations, or other figurative uses). If the article is NOT genuinely about ants as insects, myrmecology, or ant-keeping, use category "off-topic".

For genuine ant-related articles, extract:
1. TAGS: 3-5 relevant tags including:
   - Species names (scientific, e.g., "Lasius niger", "Camponotus pennsylvanicus")
   - Topics (care, research, behavior, conservation, breeding, ecology)
   - Content type (study, news, guide, tutorial, community, opinion)
   - Geographic regions (North America, Europe, Amazon, Mediterranean, etc.)
2. CATEGORY: One primary category from: research, care, conservation, behavior, ecology, community, news, off-topic

Use "off-topic" for articles that are NOT about ants/myrmecology.

Return JSON: { "tags": ["tag1", "tag2", ...], "category": "category_name" }`,

    fr: `Vous êtes un expert en myrmécologie (science des fourmis). Analysez les articles et déterminez s'ils parlent vraiment de fourmis/myrmécologie.

IMPORTANT: Certains articles peuvent contenir le mot "fourmis" mais ne parlent PAS réellement de fourmis (ex: expressions idiomatiques comme "avoir des fourmis dans les jambes", articles sur les fourmilières sans rapport avec les insectes, ou autres usages figuratifs). Si l'article ne concerne PAS véritablement les fourmis en tant qu'insectes, la myrmécologie ou l'élevage de fourmis, utilisez la catégorie "off-topic".

Pour les articles vraiment liés aux fourmis, extrayez:
1. TAGS: 3-5 tags pertinents incluant:
   - Noms d'espèces (scientifiques, ex: "Lasius niger", "Camponotus pennsylvanicus")
   - Sujets (care, research, behavior, conservation, breeding, ecology)
   - Type de contenu (study, news, guide, tutorial, community, opinion)
   - Régions géographiques (North America, Europe, Amazon, Mediterranean, etc.)
2. CATEGORY: Une catégorie principale parmi: research, care, conservation, behavior, ecology, community, news, off-topic

Utilisez "off-topic" pour les articles qui ne concernent PAS les fourmis/myrmécologie.

Retournez JSON: { "tags": ["tag1", "tag2", ...], "category": "category_name" }`,

    es: `Eres un experto en mirmecología (ciencia de las hormigas). Analiza artículos y determina si realmente tratan sobre hormigas/mirmecología.

IMPORTANTE: Algunos artículos pueden contener la palabra "hormigas" pero NO tratan realmente sobre hormigas como insectos (ej: expresiones idiomáticas, artículos médicos sobre "hormigueo" (sensación de hormigueo), u otros usos figurativos). Si el artículo NO trata genuinamente sobre hormigas como insectos, mirmecología o cría de hormigas, usa la categoría "off-topic".

Para artículos genuinamente relacionados con hormigas, extrae:
1. TAGS: 3-5 etiquetas relevantes incluyendo:
   - Nombres de especies (científicos, ej: "Lasius niger", "Camponotus pennsylvanicus")
   - Temas (care, research, behavior, conservation, breeding, ecology)
   - Tipo de contenido (study, news, guide, tutorial, community, opinion)
   - Regiones geográficas (North America, Europe, Amazon, Mediterranean, etc.)
2. CATEGORY: Una categoría principal de: research, care, conservation, behavior, ecology, community, news, off-topic

Usa "off-topic" para artículos que NO tratan sobre hormigas/mirmecología.

Devuelve JSON: { "tags": ["tag1", "tag2", ...], "category": "category_name" }`,

    de: `Sie sind ein Experte für Myrmekologie (Ameisenwissenschaft). Analysieren Sie Artikel und bestimmen Sie, ob sie wirklich über Ameisen/Myrmekologie handeln.

WICHTIG: Einige Artikel können das Wort "Ameisen" enthalten, handeln aber NICHT wirklich von Ameisen als Insekten (z.B. idiomatische Ausdrücke, medizinische Artikel über Kribbeln, oder andere figurative Verwendungen). Wenn der Artikel NICHT wirklich über Ameisen als Insekten, Myrmekologie oder Ameisenhaltung handelt, verwenden Sie die Kategorie "off-topic".

Für echte ameisenbezogene Artikel extrahieren Sie:
1. TAGS: 3-5 relevante Tags einschließlich:
   - Artnamen (wissenschaftlich, z.B. "Lasius niger", "Camponotus pennsylvanicus")
   - Themen (care, research, behavior, conservation, breeding, ecology)
   - Inhaltstyp (study, news, guide, tutorial, community, opinion)
   - Geografische Regionen (North America, Europe, Amazon, Mediterranean, etc.)
2. CATEGORY: Eine Hauptkategorie aus: research, care, conservation, behavior, ecology, community, news, off-topic

Verwenden Sie "off-topic" für Artikel, die NICHT über Ameisen/Myrmekologie handeln.

Geben Sie JSON zurück: { "tags": ["tag1", "tag2", ...], "category": "category_name" }`
  }

  return prompts[language] || prompts.en
}

function buildUserPrompt(input: ArticleInput): string {
  return `Title: ${input.title}

Summary: ${input.summary || 'No summary available'}

Content preview: ${input.content.substring(0, 500)}${input.content.length > 500 ? '...' : ''}

Analyze this article and return tags and category as JSON.`
}

function normalizeTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) {
    return []
  }

  return tags
    .map(tag => tag.toLowerCase().trim())
    .filter(tag => tag.length > 0 && tag.length < 50)
    .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
    .slice(0, 10) // Max 10 tags
}

function normalizeCategory(category: string): string {
  const validCategories = [
    'research', 'care', 'conservation', 'behavior',
    'ecology', 'community', 'news', 'off-topic'
  ]

  const normalized = category.toLowerCase().trim()
  return validCategories.includes(normalized) ? normalized : 'news'
}
