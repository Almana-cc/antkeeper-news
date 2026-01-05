import { tasks } from '@trigger.dev/sdk/v3'

/**
 * Manual trigger endpoint for article fetch orchestration
 * The scheduled task runs automatically daily at 2 AM UTC,
 * but this endpoint allows manual triggering for testing or emergency runs.
 */
export default defineEventHandler(async (event) => {
  // Only allow authorized requests
  const authHeader = getHeader(event, 'authorization')
  const apiKey = process.env.CRON_SECRET
  const isDev = import.meta.dev

  const hasValidApiKey = apiKey && authHeader?.replace('Bearer ', '') === apiKey

  if (!isDev && !hasValidApiKey) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - API key required'
    })
  }

  try {
    // Manually trigger the scheduled orchestrator task
    const handle = await tasks.trigger('orchestrate-article-fetch', {})

    return {
      success: true,
      message: 'Article fetch orchestration triggered manually',
      jobId: handle.id,
      jobUrl: `https://cloud.trigger.dev/projects/${process.env.TRIGGER_PROJECT_ID}/runs/${handle.id}`,
      note: 'This is a manual trigger. The task also runs automatically daily at 2 AM UTC.'
    }
  } catch (error) {
    console.error('Error triggering fetch orchestration:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to trigger fetch orchestration',
      data: error
    })
  }
})
