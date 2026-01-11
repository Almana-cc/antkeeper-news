export function useReadingTime() {
  const { t } = useI18n()

  function calculateReadingTime(text: string | null | undefined): number {
    if (!text) return 1
    const wordsPerMinute = 200
    const wordCount = text.trim().split(/\s+/).length
    const minutes = Math.ceil(wordCount / wordsPerMinute)
    return Math.max(1, minutes)
  }

  function formatReadingTime(text: string | null | undefined): string {
    const minutes = calculateReadingTime(text)
    return t('articles.readingTime', { minutes })
  }

  return {
    calculateReadingTime,
    formatReadingTime
  }
}
