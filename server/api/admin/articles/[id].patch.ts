import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { VALID_CATEGORIES } from '../../../../shared/utils/categories'

interface ArticlePatchBody {
  title?: string
  summary?: string | null
  content?: string | null
  category?: string | null
  tags?: string[]
  featured?: boolean
  imageUrl?: string | null
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid article id' })
  }

  const body = await readBody<ArticlePatchBody>(event)
  const updates: Record<string, unknown> = {}

  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title || title.length > 500) {
      throw createError({ statusCode: 400, statusMessage: 'Title must be 1-500 characters' })
    }
    updates.title = title
  }

  if (body.summary !== undefined) {
    updates.summary = body.summary === null ? null : String(body.summary)
  }

  if (body.content !== undefined) {
    updates.content = body.content === null ? null : String(body.content)
  }

  if (body.category !== undefined) {
    if (body.category !== null && !VALID_CATEGORIES.includes(body.category as never)) {
      throw createError({ statusCode: 400, statusMessage: `Invalid category. Valid: ${VALID_CATEGORIES.join(', ')}` })
    }
    updates.category = body.category
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.some((t) => typeof t !== 'string')) {
      throw createError({ statusCode: 400, statusMessage: 'Tags must be an array of strings' })
    }
    updates.tags = body.tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
  }

  if (body.featured !== undefined) {
    updates.featured = Boolean(body.featured)
  }

  if (body.imageUrl !== undefined) {
    updates.imageUrl = body.imageUrl === null ? null : String(body.imageUrl)
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No valid fields to update' })
  }

  const [article] = await db.update(schema.articles)
    .set(updates)
    .where(eq(schema.articles.id, id))
    .returning()

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  return { article }
})
