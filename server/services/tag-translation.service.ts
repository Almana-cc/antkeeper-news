import { eq, inArray, and } from 'drizzle-orm'
import { db, schema } from '../utils/db'

interface TagTranslationMap {
  [tagKey: string]: string
}

interface CacheEntry {
  translations: TagTranslationMap
  expiresAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const translationCache = new Map<string, CacheEntry>()

function getCacheKey(tags: string[], locale: string): string {
  return `${locale}:${tags.sort().join(',')}`
}

function getFromCache(cacheKey: string): TagTranslationMap | null {
  const entry = translationCache.get(cacheKey)
  if (entry && entry.expiresAt > Date.now()) {
    return entry.translations
  }
  if (entry) {
    translationCache.delete(cacheKey)
  }
  return null
}

function setCache(cacheKey: string, translations: TagTranslationMap): void {
  translationCache.set(cacheKey, {
    translations,
    expiresAt: Date.now() + CACHE_TTL_MS
  })
}

/**
 * Get translated labels for a list of tags in the specified locale
 * 
 * @param tags Array of tag keys (English canonical keys)
 * @param locale Language code (fr, en, es, de)
 * @returns Object mapping tag keys to their translated labels
 */
export async function getTranslatedTags(
  tags: string[],
  locale: string
): Promise<TagTranslationMap> {
  if (!tags || tags.length === 0) {
    return {}
  }

  const normalizedLocale = locale.toLowerCase().slice(0, 2)
  const cacheKey = getCacheKey(tags, normalizedLocale)

  const cached = getFromCache(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const translations = await db
      .select({
        tagKey: schema.tagTranslations.tagKey,
        label: schema.tagTranslations.label
      })
      .from(schema.tagTranslations)
      .where(
        and(
          inArray(schema.tagTranslations.tagKey, tags),
          eq(schema.tagTranslations.language, normalizedLocale)
        )
      )

    const result: TagTranslationMap = {}

    for (const tag of tags) {
      const translation = translations.find(t => t.tagKey === tag)
      result[tag] = translation?.label ?? tag
    }

    setCache(cacheKey, result)

    return result
  } catch (error) {
    console.error('Error fetching tag translations:', error)
    const fallback: TagTranslationMap = {}
    for (const tag of tags) {
      fallback[tag] = tag
    }
    return fallback
  }
}

/**
 * Get all translations for a specific locale
 * Useful for preloading translations
 * 
 * @param locale Language code (fr, en, es, de)
 * @returns Object mapping tag keys to their translated labels
 */
export async function getAllTranslationsForLocale(
  locale: string
): Promise<TagTranslationMap> {
  const normalizedLocale = locale.toLowerCase().slice(0, 2)
  const cacheKey = `all:${normalizedLocale}`

  const cached = getFromCache(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const translations = await db
      .select({
        tagKey: schema.tagTranslations.tagKey,
        label: schema.tagTranslations.label
      })
      .from(schema.tagTranslations)
      .where(eq(schema.tagTranslations.language, normalizedLocale))

    const result: TagTranslationMap = {}
    for (const t of translations) {
      result[t.tagKey] = t.label
    }

    setCache(cacheKey, result)

    return result
  } catch (error) {
    console.error('Error fetching all tag translations:', error)
    return {}
  }
}

/**
 * Clear the translation cache
 * Useful after updating translations in the database
 */
export function clearTranslationCache(): void {
  translationCache.clear()
}
