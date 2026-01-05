export default defineEventHandler(async (event) => {
  // Verify request is from Vercel Cron or authorized source
  const userAgent = getHeader(event, 'user-agent')
  const authHeader = getHeader(event, 'authorization')
  const apiKey = process.env.CRON_SECRET
  const isDev = import.meta.dev
  
  // Allow Vercel cron requests or requests with valid API key
  const isVercelCron = userAgent?.includes('vercel-cron')
  const hasValidApiKey = apiKey && authHeader?.replace('Bearer ', '') === apiKey

  if (!isDev && !isVercelCron && !hasValidApiKey) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  try {
    // Run the fetch articles task
    const result = await runTask('fetch-articles')

    return {
      success: true,
      message: 'Article fetch task triggered successfully',
      result
    }
  } catch (error) {
    console.error('Error triggering fetch task:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to trigger fetch task',
      data: error
    })
  }
})
