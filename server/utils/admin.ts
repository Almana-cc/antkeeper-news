import type { H3Event } from 'h3'

/**
 * Ensure the request comes from a logged-in admin (GitHub login present in
 * NUXT_ADMIN_GITHUB_LOGINS). Throws 401 if not logged in, 403 if not admin.
 */
export async function requireAdmin(event: H3Event) {
  const session = await requireUserSession(event)

  if (!session.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }

  return session
}
