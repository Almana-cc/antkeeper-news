import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { promises as fs } from 'fs'

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = 'mistralai/mistral-small-3.1-24b-instruct:free'

interface Article {
  id: number
  title: string
  slug: string
  content: string
  summary: string
  sourceName: string
  sourceUrl: string
  author: string
  publishedAt: string
  language: string
  imageUrl: string
  tags: string[]
  category: string
  duplicates?: {
    count: number
    articles: Array<{
      id: number
      title: string
      sourceName: string
      sourceUrl: string
      language: string
      publishedAt: string
      similarityScore: number
    }>
  }
}

interface APIResponse {
  articles: Article[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Fetch articles from the API
 */
async function fetchArticles(): Promise<Article[]> {
  try {
    const url = `${API_BASE_URL}/api/articles?dateRange=week&limit=50&language=en`
    console.log(`Fetching articles from: ${url}`)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as APIResponse
    console.log(`✓ Fetched ${data.articles.length} articles`)
    return data.articles
  } catch (error) {
    console.error('Error fetching articles:', error)
    throw error
  }
}

/**
 * Select the top 3 articles using AI
 */
async function selectTopArticles(articles: Article[], previousStories: string[] = []): Promise<Article[]> {
  if (!OPENROUTER_API_KEY) {
    console.warn('⚠ OPENROUTER_API_KEY not configured - using fallback selection')
    // Fallback: select by category and duplicates
    return articles
      .filter(a => a.category !== 'off-topic')
      .sort((a, b) => {
        // Prioritize articles with duplicates (more important), then by date
        const aDuplicates = a.duplicates?.count || 0
        const bDuplicates = b.duplicates?.count || 0
        if (bDuplicates !== aDuplicates) return bDuplicates - aDuplicates
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      })
      .slice(0, 3)
  }

  try {
    const prompt = buildArticleSelectionPrompt(articles, previousStories)
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://news.antkeeper.com',
        'X-Title': 'Antkeeper News'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in myrmecology (ant science). Select the 3 most interesting and important articles about ants/myrmecology, avoiding stories that were recently covered.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 100
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.warn(`⚠ AI selection failed (${response.status}): ${error}`)
      // Fallback to heuristic selection
      return selectTopArticlesHeuristic(articles)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      console.warn('⚠ No response from AI model - using fallback selection')
      return selectTopArticlesHeuristic(articles)
    }

    const parsed = JSON.parse(content)
    const selectedIds = parsed.ids || parsed.article_ids || []

    if (selectedIds.length === 0) {
      return selectTopArticlesHeuristic(articles)
    }

    const selected = articles.filter(a => selectedIds.includes(a.id)).slice(0, 3)
    return selected.length === 3 ? selected : selectTopArticlesHeuristic(articles)
  } catch (error) {
    console.warn('⚠ Error in AI selection:', error)
    return selectTopArticlesHeuristic(articles)
  }
}

/**
 * Fallback heuristic article selection
 */
function selectTopArticlesHeuristic(articles: Article[]): Article[] {
  return articles
    .filter(a => a.category !== 'off-topic')
    .sort((a, b) => {
      // Prioritize research category
      const aResearch = a.category === 'research' ? 1 : 0
      const bResearch = b.category === 'research' ? 1 : 0
      if (bResearch !== aResearch) return bResearch - aResearch

      // Then by duplicates (importance indicator)
      const aDuplicates = a.duplicates?.count || 0
      const bDuplicates = b.duplicates?.count || 0
      if (bDuplicates !== aDuplicates) return bDuplicates - aDuplicates

      // Finally by date
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
    .slice(0, 3)
}

/**
 * Read previous newsletters
 */
async function readPreviousNewsletters(newsletterDir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(newsletterDir)
    const markdownFiles = files.filter(f => f.endsWith('.md')).sort().reverse()

    if (markdownFiles.length === 0) {
      console.log('  No previous newsletters found')
      return []
    }

    console.log(`  Found ${markdownFiles.length} previous newsletters`)

    const content = await Promise.all(
      markdownFiles.slice(0, 4).map(async (file) => {
        const path = join(newsletterDir, file)
        return fs.readFile(path, 'utf-8')
      })
    )

    return content
  } catch (error) {
    console.warn('  ⚠ Could not read previous newsletters:', error)
    return []
  }
}

/**
 * Extract covered stories from newsletter content
 */
function extractCoveredStories(newsletterContent: string[]): string[] {
  const stories: string[] = []

  newsletterContent.forEach((content) => {
    // Extract article titles (lines starting with ## )
    const titleMatches = content.match(/^## .+$/gm)
    if (titleMatches) {
      titleMatches.forEach((match) => {
        const title = match.replace(/^## /, '').trim()
        stories.push(title)
      })
    }
  })

  return stories
}

/**
 * Build prompt for article selection with history
 */
function buildArticleSelectionPrompt(articles: Article[], previousStories: string[]): string {
  const articlesDescription = articles.slice(0, 10)
    .map((a, i) => `${i + 1}. "${a.title}" (ID: ${a.id}, Category: ${a.category}, Duplicates: ${a.duplicates?.count || 0})`)
    .join('\n')

  let historyNote = ''
  if (previousStories.length > 0) {
    historyNote = `\n\nPREVIOUSLY COVERED STORIES (avoid repeating these):\n${previousStories.map((s, i) => `- ${s}`).join('\n')}`
  }

  return `Select the 3 most interesting and scientifically important articles from this list:

${articlesDescription}${historyNote}

Return JSON with an array of selected article IDs: { "ids": [id1, id2, id3] }`
}

/**
 * Check if article is a follow-up to a previously covered story
 */
function findFollowUpReference(articleTitle: string, previousStories: string[]): string | null {
  const titleLower = articleTitle.toLowerCase()

  for (const prevStory of previousStories) {
    const prevLower = prevStory.toLowerCase()

    // Check for common keywords suggesting a follow-up
    const keywords = ['update', 'nouvelle', 'new', 'follow', 'suite', 'continued', 'continues', 'developments', 'évolution']

    // Check if titles share significant common words (title similarity)
    const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3)
    const prevWords = prevLower.split(/\s+/).filter(w => w.length > 3)
    const commonWords = titleWords.filter(w => prevWords.includes(w))

    if (commonWords.length >= 2 || keywords.some(k => titleLower.includes(k) && prevLower.includes(k.replace(/e$/, '')))) {
      return prevStory
    }
  }

  return null
}

/**
 * Generate French content for an article
 */
async function generateArticleContent(article: Article, followUpRef?: string | null): Promise<{ hook: string; keyPoints: string[] }> {
  if (!OPENROUTER_API_KEY) {
    // Fallback: simple extraction
    return {
      hook: article.summary || article.title,
      keyPoints: [
        'Key insight 1',
        'Key insight 2',
        'Key insight 3'
      ]
    }
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://news.antkeeper.com',
        'X-Title': 'Antkeeper News'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert myrmecologist writing for a French newsletter. Create engaging French content.'
          },
          {
            role: 'user',
            content: `Create French content for this article:

Title: ${article.title}
Summary: ${article.summary}
Content: ${article.content.substring(0, 500)}...

Return JSON with:
- hook: One captivating French sentence about this article (no labels)
- keyPoints: Array of 3 French key insights (no labels)

{ "hook": "...", "keyPoints": ["...", "...", "..."] }`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 300
      })
    })

    if (!response.ok) {
      console.warn(`⚠ Content generation failed (${response.status}) for article ${article.id}`)
      return getFallbackContent(article)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return getFallbackContent(article)
    }

    const parsed = JSON.parse(content)
    return {
      hook: parsed.hook || article.summary,
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [
        'Key insight 1',
        'Key insight 2',
        'Key insight 3'
      ]
    }
  } catch (error) {
    console.warn(`⚠ Error generating content for article ${article.id}:`, error)
    return getFallbackContent(article)
  }
}

/**
 * Fallback content generation
 */
function getFallbackContent(article: Article): { hook: string; keyPoints: string[] } {
  return {
    hook: article.summary || `Check out this article about ${article.title}`,
    keyPoints: [
      'Important discovery in myrmecology',
      'Research findings applicable to the field',
      'Contribution to our understanding of ants'
    ]
  }
}

/**
 * Format date range for the newsletter title
 */
function getWeekDateRange(): { start: string; end: string } {
  const today = new Date()
  const dayOfWeek = today.getDay()

  // Get start of week (Monday)
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))

  // Get end of week (Sunday)
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  return {
    start: formatDate(startDate),
    end: formatDate(endDate)
  }
}

/**
 * Get newsletter filename (YYYY-MM-DD)
 */
function getNewsletterFilename(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const day = today.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format article date to French format
 */
function formatArticleDate(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.toLocaleString('fr-FR', { month: 'long' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

/**
 * Build newsletter markdown
 */
async function buildNewsletter(articles: Article[], previousStories: string[] = []): Promise<string> {
  const dateRange = getWeekDateRange()
  const timestamp = new Date().toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short'
  })

  // Generate content for each article
  const articlesContent = await Promise.all(
    articles.map(async (article) => {
      const followUpRef = findFollowUpReference(article.title, previousStories)
      const { hook, keyPoints } = await generateArticleContent(article, followUpRef)

      // Build duplicate sources line if available
      let duplicatesLine = ''
      if (article.duplicates && article.duplicates.count > 0) {
        const sources = article.duplicates.articles
          .map(dup => `[${dup.sourceName}](${dup.sourceUrl})`)
          .join(', ')
        duplicatesLine = `\n\n**Également couvert par** : ${sources}`
      }

      // Add follow-up reference if this is a continuation of a previous story
      let followUpLine = ''
      if (followUpRef) {
        followUpLine = `\n\n**Suite de** : ${followUpRef}`
      }

      return `## ${article.title}

${article.imageUrl ? `![Article Image](${article.imageUrl})` : ''}

${hook}

- ${keyPoints[0]}
- ${keyPoints[1]}
- ${keyPoints[2]}

**Source** : [${article.sourceName}](${article.sourceUrl}) | ${formatArticleDate(article.publishedAt)}${duplicatesLine}${followUpLine}`
    })
  )

  const newsletter = `# Newsletter Antkeeper - Semaine du ${dateRange.start} au ${dateRange.end}

Bienvenue dans cette nouvelle édition de notre newsletter hebdomadaire dédiée à l'actualité myrmécologique ! Cette semaine, nous explorons des découvertes fascinantes sur le comportement des fourmis, de nouvelles recherches scientifiques, et des histoires étonnantes du monde des fourmis.

---

${articlesContent.join('\n\n---\n\n')}

---

*Newsletter générée automatiquement par Antkeeper News*
*${timestamp}*`

  return newsletter
}

/**
 * Ensure newsletters directory exists
 */
async function ensureNewsletterDir(): Promise<string> {
  const newsletterDir = join(__dirname, '..', 'newsletters')
  try {
    await fs.mkdir(newsletterDir, { recursive: true })
    console.log(`✓ Newsletter directory ready: ${newsletterDir}`)
    return newsletterDir
  } catch (error) {
    console.error('Error creating newsletter directory:', error)
    throw error
  }
}

/**
 * Save newsletter to file
 */
async function saveNewsletter(content: string, filename: string, dir: string): Promise<string> {
  const filepath = join(dir, `${filename}.md`)
  try {
    await fs.writeFile(filepath, content, 'utf-8')
    console.log(`✓ Newsletter saved: ${filepath}`)
    return filepath
  } catch (error) {
    console.error('Error saving newsletter:', error)
    throw error
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting newsletter generation...\n')

    // Ensure newsletter directory exists
    const newsletterDir = await ensureNewsletterDir()

    // Read previous newsletters for continuity
    console.log('\nChecking newsletter history...')
    const previousNewsletterContent = await readPreviousNewsletters(newsletterDir)
    const previousStories = extractCoveredStories(previousNewsletterContent)
    if (previousStories.length > 0) {
      console.log(`  Previous stories to avoid: ${previousStories.length} titles`)
    }

    // Fetch articles
    console.log('\nFetching articles...')
    const articles = await fetchArticles()
    if (articles.length === 0) {
      throw new Error('No articles found for this week')
    }

    // Select top 3 articles with history awareness
    console.log('\nSelecting top 3 articles...')
    const topArticles = await selectTopArticles(articles, previousStories)
    console.log(`✓ Selected ${topArticles.length} articles`)

    if (topArticles.length < 3) {
      console.warn(`⚠ Warning: Only ${topArticles.length} quality articles found (expected 3)`)
    }

    topArticles.forEach((a, i) => {
      const followUpRef = findFollowUpReference(a.title, previousStories)
      const followUpNote = followUpRef ? ' (follow-up to previous coverage)' : ''
      console.log(`  ${i + 1}. "${a.title}" (${a.category})${followUpNote}`)
    })

    // Generate newsletter with history context
    console.log('\nGenerating newsletter content...')
    const newsletter = await buildNewsletter(topArticles, previousStories)

    // Save to file
    const filename = getNewsletterFilename()
    const filepath = await saveNewsletter(newsletter, filename, newsletterDir)

    console.log('\n✅ Newsletter generation complete!')
    console.log(`📄 Saved to: ${filepath}`)
    console.log(`\n📊 Summary:`)
    console.log(`   Articles processed: ${articles.length}`)
    console.log(`   Top articles selected: ${topArticles.length}`)
    console.log(`   Previous newsletters reviewed: ${previousNewsletterContent.length}`)
    console.log(`   Newsletter date: ${filename}`)
  } catch (error) {
    console.error('\n❌ Newsletter generation failed:', error)
    process.exit(1)
  }
}

// Run
main()
