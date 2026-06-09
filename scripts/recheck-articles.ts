/**
 * Re-check existing articles against the relevance filters.
 *
 * Two passes per article:
 *   1. Keyword pass (free, instant): obvious pest-control content ("se débarrasser
 *      des fourmis", "ant killer", ...) is marked as `pest-control` directly.
 *   2. AI pass (OpenRouter): re-categorizes the article; off-topic or pest-control
 *      articles get hidden from the site, genuine articles get fresh tags/category.
 *
 * Usage:
 *   pnpm recheck-articles                       # re-check all visible articles
 *   pnpm recheck-articles -- --dry-run          # show what would change, write nothing
 *   pnpm recheck-articles -- --keywords-only    # fast pass, no AI calls
 *   pnpm recheck-articles -- --limit 100        # only the 100 most recent articles
 *   pnpm recheck-articles -- --ids 12,34,56     # specific articles only
 *   pnpm recheck-articles -- --all              # also re-check already hidden articles
 *   pnpm recheck-articles -- --start-id 1234    # resume after an interruption
 *   pnpm recheck-articles -- --delay 10         # seconds between AI calls (default 5)
 */
import 'dotenv/config'
import { and, asc, gte, inArray, isNull, notInArray, or, eq } from 'drizzle-orm'
import { db, schema } from '../server/utils/db'
import { containsNegativeContent } from '../server/services/keyword-filter.service'
import { categorizeArticle } from '../server/services/openrouter-categorization.service'
import { HIDDEN_CATEGORIES } from '../shared/utils/categories'

interface Options {
  dryRun: boolean
  keywordsOnly: boolean
  includeHidden: boolean
  limit?: number
  ids?: number[]
  startId?: number
  delaySeconds: number
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    dryRun: argv.includes('--dry-run'),
    keywordsOnly: argv.includes('--keywords-only'),
    includeHidden: argv.includes('--all'),
    delaySeconds: 5
  }

  const getValue = (flag: string): string | undefined => {
    const index = argv.indexOf(flag)
    return index !== -1 ? argv[index + 1] : undefined
  }

  const limit = getValue('--limit')
  if (limit) options.limit = Number(limit)

  const ids = getValue('--ids')
  if (ids) options.ids = ids.split(',').map(Number).filter((n) => !Number.isNaN(n))

  const startId = getValue('--start-id')
  if (startId) options.startId = Number(startId)

  const delay = getValue('--delay')
  if (delay) options.delaySeconds = Number(delay)

  return options
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  const options = parseArgs(process.argv.slice(2))

  console.log('Re-checking articles with options:', options)

  const conditions = []
  if (options.ids && options.ids.length > 0) {
    conditions.push(inArray(schema.articles.id, options.ids))
  } else if (!options.includeHidden) {
    // Skip articles already hidden (off-topic / pest-control)
    conditions.push(
      or(
        isNull(schema.articles.category),
        notInArray(schema.articles.category, HIDDEN_CATEGORIES)
      )!
    )
  }
  if (options.startId) {
    conditions.push(gte(schema.articles.id, options.startId))
  }

  const articles = await db.query.articles.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [asc(schema.articles.id)],
    limit: options.limit,
    columns: {
      id: true,
      title: true,
      summary: true,
      content: true,
      language: true,
      category: true,
      tags: true
    }
  })

  console.log(`Found ${articles.length} article(s) to re-check\n`)

  const stats = {
    checked: 0,
    pestControlByKeywords: 0,
    offTopicByAi: 0,
    pestControlByAi: 0,
    recategorized: 0,
    unchanged: 0,
    aiErrors: 0
  }

  for (const article of articles) {
    stats.checked++
    const language = article.language || 'en'
    const label = `[${article.id}] ${article.title.substring(0, 70)}`

    // Pass 1: keyword filter (catches obvious pest-control content for free)
    if (containsNegativeContent(article.title, article.summary || '', language)) {
      stats.pestControlByKeywords++
      console.log(`✗ ${label}\n    → pest-control (keywords)${article.category !== 'pest-control' ? ` (was: ${article.category ?? 'null'})` : ''}`)
      if (!options.dryRun && article.category !== 'pest-control') {
        await db.update(schema.articles)
          .set({ category: 'pest-control' })
          .where(eq(schema.articles.id, article.id))
      }
      continue
    }

    if (options.keywordsOnly) {
      stats.unchanged++
      continue
    }

    // Pass 2: AI categorization (detects off-topic and subtle pest-control content)
    const result = await categorizeArticle({
      title: article.title,
      summary: article.summary || '',
      content: article.content?.substring(0, 1000) || '',
      language
    })

    if (!result.success) {
      stats.aiErrors++
      console.warn(`⚠ ${label}\n    → AI error: ${result.error}`)
      if (result.error?.includes('Rate limit')) {
        console.error(`\nRate limit reached. Resume later with: pnpm recheck-articles -- --start-id ${article.id}`)
        break
      }
      continue
    }

    const changed = result.category !== article.category
    if (result.category === 'off-topic') stats.offTopicByAi++
    else if (result.category === 'pest-control') stats.pestControlByAi++
    else if (changed) stats.recategorized++
    else stats.unchanged++

    const marker = HIDDEN_CATEGORIES.includes(result.category) ? '✗' : '✓'
    console.log(`${marker} ${label}\n    → ${result.category}${changed ? ` (was: ${article.category ?? 'null'})` : ''}, tags: [${result.tags.join(', ')}]`)

    if (!options.dryRun) {
      await db.update(schema.articles)
        .set({ category: result.category, tags: result.tags })
        .where(eq(schema.articles.id, article.id))
    }

    // Stay under the OpenRouter free-tier rate limit
    await sleep(options.delaySeconds * 1000)
  }

  console.log('\n──────── Summary ────────')
  console.log(`Articles checked:            ${stats.checked}`)
  console.log(`Pest-control (keywords):     ${stats.pestControlByKeywords}`)
  console.log(`Pest-control (AI):           ${stats.pestControlByAi}`)
  console.log(`Off-topic (AI):              ${stats.offTopicByAi}`)
  console.log(`Re-categorized (still ok):   ${stats.recategorized}`)
  console.log(`Unchanged:                   ${stats.unchanged}`)
  console.log(`AI errors:                   ${stats.aiErrors}`)
  if (options.dryRun) {
    console.log('\nDry run: nothing was written to the database.')
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
