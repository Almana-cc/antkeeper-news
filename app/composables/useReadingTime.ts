/**
 * Composable for calculating and formatting article reading time
 * Based on average reading speed of 200 words per minute
 */
export function useReadingTime() {
  const WORDS_PER_MINUTE = 200

  /**
   * Calculate reading time in minutes from text content
   * @param content - Article content (summary, content, or both)
   * @returns Number of minutes to read (minimum 1)
   */
  function calculateReadingTime(content: string | null | undefined): number {
    if (!content) return 1

    // Count words by splitting on whitespace
    const wordCount = content.trim().split(/\s+/).length

    // Calculate minutes, minimum 1
    const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE)
    return Math.max(1, minutes)
  }

  /**
   * Calculate reading time from article summary and content
   * @param summary - Article summary
   * @param content - Article full content (optional)
   * @returns Number of minutes to read
   */
  function getArticleReadingTime(
    summary: string | null | undefined,
    content: string | null | undefined
  ): number {
    // Use content if available, otherwise use summary
    const text = content || summary || ''
    return calculateReadingTime(text)
  }

  return {
    calculateReadingTime,
    getArticleReadingTime
  }
}
