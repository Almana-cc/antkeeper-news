/**
 * Trigger.dev Jobs Index
 *
 * This file exports all Trigger.dev jobs for the Antkeeper News platform.
 *
 * Jobs:
 * - orchestrateArticleFetch: Main orchestrator that runs the full article fetch workflow
 * - fetchArticles: Fetches articles from RSS sources and creates database entries
 * - scrapeMetadata: Scrapes OpenGraph metadata for articles that need enrichment
 * - categorizeArticles: AI-powered tagging and categorization using OpenRouter
 * - backfillCategorization: One-time task to categorize existing untagged articles
 */

export { orchestrateArticleFetch } from './orchestrator'
export { fetchArticles } from './fetch-articles'
export { scrapeMetadata } from './scrape-metadata'
export { categorizeArticles } from './categorize-articles'
export { backfillCategorization } from './backfill-categorization'
