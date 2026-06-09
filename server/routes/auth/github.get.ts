import type { H3Event } from 'h3'

function isAdminLogin(event: H3Event, login: string): boolean {
  const config = useRuntimeConfig(event)
  const adminLogins = (config.adminGithubLogins || '')
    .split(',')
    .map((l: string) => l.trim().toLowerCase())
    .filter(Boolean)
  return adminLogins.includes(login.toLowerCase())
}

export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        login: user.login,
        name: user.name ?? null,
        avatarUrl: user.avatar_url ?? null
      },
      isAdmin: isAdminLogin(event, user.login)
    })
    return sendRedirect(event, '/login')
  },
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/login?error=oauth')
  }
})
