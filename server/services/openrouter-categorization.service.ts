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
const MODEL = 'liquid/lfm-2.5-1.2b-instruct:free'

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

    // Parse JSON response (model may wrap it in markdown fences or prose)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('No JSON object found in AI response:', content.slice(0, 200))
      return { success: false, tags: [], category: 'news', error: 'No JSON in response' }
    }
    const parsed = JSON.parse(jsonMatch[0])

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
    en: `You are an expert in myrmecology (ant science) working for a website made for ant enthusiasts and ant keepers. Analyze articles and determine if they are truly about ants/myrmecology AND suitable for an audience that LOVES ants.

IMPORTANT - two kinds of articles must be rejected:

1. OFF-TOPIC: Articles that contain the word "ants" but are NOT actually about ants as insects (e.g., idiomatic expressions like "ants in your pants", medical articles about tingling sensations, sports teams, movies, robots, acronyms, or other figurative uses). Also articles about other insects where ants are only mentioned in passing. Use category "off-topic".

2. PEST CONTROL: Articles about getting rid of ants, killing ants, exterminating ants, ant infestations as a problem, insecticides, repellents, baits, traps, or pest-control services/products. Our readers keep ants as pets - this content is unwanted. Use category "pest-control", even if the article is well written and genuinely about ants.

If in doubt between a genuine ant article and one of these two cases, prefer "off-topic" or "pest-control".

For genuine ant-related articles, extract:
1. TAGS: 3-5 relevant tags including:
   - Species names (scientific, e.g., "Lasius niger", "Camponotus pennsylvanicus")
   - Topics (care, research, behavior, conservation, breeding, ecology)
   - Content type (study, news, guide, tutorial, community, opinion)
   - Geographic regions (North America, Europe, Amazon, Mediterranean, etc.)
2. CATEGORY: One primary category from: research, care, conservation, behavior, ecology, community, news, off-topic, pest-control

Return JSON: { "tags": ["tag1", "tag2", ...], "category": "category_name" }`,

    fr: `Vous êtes un expert en myrmécologie (science des fourmis) travaillant pour un site destiné aux passionnés et éleveurs de fourmis. Analysez les articles et déterminez s'ils parlent vraiment de fourmis/myrmécologie ET s'ils conviennent à un public qui AIME les fourmis.

IMPORTANT - deux types d'articles doivent être rejetés:

1. HORS-SUJET: Articles contenant le mot "fourmis" mais qui ne parlent PAS réellement de fourmis en tant qu'insectes (ex: expressions idiomatiques comme "avoir des fourmis dans les jambes", articles médicaux sur les fourmillements, équipes sportives, films, robots, ou autres usages figuratifs). Aussi les articles sur d'autres insectes où les fourmis ne sont que mentionnées. Utilisez la catégorie "off-topic".

2. LUTTE ANTIPARASITAIRE: Articles sur comment se débarrasser des fourmis, les tuer, les exterminer, les invasions/infestations de fourmis vues comme un problème, les insecticides, répulsifs, appâts, pièges, ou les services/produits anti-fourmis. Nos lecteurs élèvent des fourmis - ce contenu est indésirable. Utilisez la catégorie "pest-control", même si l'article parle réellement de fourmis.

En cas de doute entre un véritable article sur les fourmis et l'un de ces deux cas, préférez "off-topic" ou "pest-control".

Pour les articles vraiment liés aux fourmis, extrayez:
1. TAGS: 3-5 tags pertinents incluant:
   - Noms d'espèces (scientifiques, ex: "Lasius niger", "Camponotus pennsylvanicus")
   - Sujets (care, research, behavior, conservation, breeding, ecology)
   - Type de contenu (study, news, guide, tutorial, community, opinion)
   - Régions géographiques (North America, Europe, Amazon, Mediterranean, etc.)
2. CATEGORY: Une catégorie principale parmi: research, care, conservation, behavior, ecology, community, news, off-topic, pest-control

Retournez JSON: { "tags": ["tag1", "tag2", ...], "category": "category_name" }`,

    es: `Eres un experto en mirmecología (ciencia de las hormigas) trabajando para un sitio web destinado a aficionados y criadores de hormigas. Analiza artículos y determina si realmente tratan sobre hormigas/mirmecología Y si son adecuados para un público que AMA las hormigas.

IMPORTANTE - dos tipos de artículos deben ser rechazados:

1. FUERA DE TEMA: Artículos que contienen la palabra "hormigas" pero NO tratan realmente sobre hormigas como insectos (ej: expresiones idiomáticas, artículos médicos sobre "hormigueo", equipos deportivos, películas, robots, u otros usos figurativos). También artículos sobre otros insectos donde las hormigas solo se mencionan de pasada. Usa la categoría "off-topic".

2. CONTROL DE PLAGAS: Artículos sobre cómo deshacerse de las hormigas, matarlas, exterminarlas, invasiones/infestaciones de hormigas vistas como un problema, insecticidas, repelentes, cebos, trampas, o servicios/productos contra hormigas. Nuestros lectores crían hormigas - este contenido no es deseado. Usa la categoría "pest-control", incluso si el artículo trata realmente sobre hormigas.

En caso de duda entre un artículo genuino sobre hormigas y uno de estos dos casos, prefiere "off-topic" o "pest-control".

Para artículos genuinamente relacionados con hormigas, extrae:
1. TAGS: 3-5 etiquetas relevantes incluyendo:
   - Nombres de especies (científicos, ej: "Lasius niger", "Camponotus pennsylvanicus")
   - Temas (care, research, behavior, conservation, breeding, ecology)
   - Tipo de contenido (study, news, guide, tutorial, community, opinion)
   - Regiones geográficas (North America, Europe, Amazon, Mediterranean, etc.)
2. CATEGORY: Una categoría principal de: research, care, conservation, behavior, ecology, community, news, off-topic, pest-control

Devuelve JSON: { "tags": ["tag1", "tag2", ...], "category": "category_name" }`,

    de: `Sie sind ein Experte für Myrmekologie (Ameisenwissenschaft) und arbeiten für eine Website für Ameisenliebhaber und Ameisenhalter. Analysieren Sie Artikel und bestimmen Sie, ob sie wirklich über Ameisen/Myrmekologie handeln UND für ein Publikum geeignet sind, das Ameisen LIEBT.

WICHTIG - zwei Arten von Artikeln müssen abgelehnt werden:

1. OFF-TOPIC: Artikel, die das Wort "Ameisen" enthalten, aber NICHT wirklich von Ameisen als Insekten handeln (z.B. idiomatische Ausdrücke, medizinische Artikel über Kribbeln, Sportmannschaften, Filme, Roboter, oder andere figurative Verwendungen). Auch Artikel über andere Insekten, in denen Ameisen nur beiläufig erwähnt werden. Verwenden Sie die Kategorie "off-topic".

2. SCHÄDLINGSBEKÄMPFUNG: Artikel darüber, wie man Ameisen loswird, tötet, ausrottet, über Ameisenbefall als Problem, Insektizide, Abwehrmittel, Köder, Fallen oder Schädlingsbekämpfungsdienste/-produkte. Unsere Leser halten Ameisen als Haustiere - dieser Inhalt ist unerwünscht. Verwenden Sie die Kategorie "pest-control", auch wenn der Artikel wirklich von Ameisen handelt.

Im Zweifelsfall zwischen einem echten Ameisenartikel und einem dieser beiden Fälle bevorzugen Sie "off-topic" oder "pest-control".

Für echte ameisenbezogene Artikel extrahieren Sie:
1. TAGS: 3-5 relevante Tags einschließlich:
   - Artnamen (wissenschaftlich, z.B. "Lasius niger", "Camponotus pennsylvanicus")
   - Themen (care, research, behavior, conservation, breeding, ecology)
   - Inhaltstyp (study, news, guide, tutorial, community, opinion)
   - Geografische Regionen (North America, Europe, Amazon, Mediterranean, etc.)
2. CATEGORY: Eine Hauptkategorie aus: research, care, conservation, behavior, ecology, community, news, off-topic, pest-control

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
    'ecology', 'community', 'news', 'off-topic', 'pest-control'
  ]

  const normalized = category.toLowerCase().trim()
  return validCategories.includes(normalized) ? normalized : 'news'
}
