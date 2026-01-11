/**
 * Composable for fetching and using translated tag labels
 * Uses current locale from i18n and provides translated labels
 * Falls back to tag key if translation unavailable
 */
export function useTagTranslations() {
  const { locale } = useI18n()

  const { data: translationsData, refresh } = useFetch('/api/tags/translations', {
    query: computed(() => ({
      locale: locale.value
    })),
    watch: [locale]
  })

  const translations = computed(() => translationsData.value?.translations || {})

  /**
   * Get translated label for a tag
   * @param tag - The canonical English tag key
   * @returns Translated label or the tag key as fallback
   */
  function getTagLabel(tag: string): string {
    return translations.value[tag] || tag
  }

  /**
   * Get translation map for a list of tags
   * @param tags - Array of canonical English tag keys
   * @returns Object mapping tag keys to translated labels
   */
  function getTagLabels(tags: string[]): Record<string, string> {
    const result: Record<string, string> = {}
    for (const tag of tags) {
      result[tag] = getTagLabel(tag)
    }
    return result
  }

  return {
    translations,
    getTagLabel,
    getTagLabels,
    refresh
  }
}
