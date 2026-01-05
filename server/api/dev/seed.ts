export default defineEventHandler(async () => {
    // Only allow in development mode
    if (!import.meta.dev) {
      throw createError({
        statusCode: 404,
        message: 'Not Found'
      })
    }

    try {
      // Run the fetch articles task
      const result = await runTask('seed')
  
      return {
        success: true,
        message: 'Seed task triggered successfully',
        result
      }
    } catch (error) {
      console.error('Error triggering seed task:', error)
      throw createError({
        statusCode: 500,
        message: 'Failed to trigger seed task',
        data: error
      })
    }
  })
  