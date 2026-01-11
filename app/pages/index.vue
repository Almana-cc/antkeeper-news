<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const { getTagLabel } = useTagTranslations()

// Persistent filter storage
const storedLanguage = useLocalStorage<string>('antkeeper-filter-language', 'all')
const storedCategory = useLocalStorage<string>('antkeeper-filter-category', 'all')
const storedTags = useLocalStorage<string[]>('antkeeper-filter-tags', [])
const storedDateRange = useLocalStorage<string>('antkeeper-filter-dateRange', 'all')

// Get initial value: URL params take priority over localStorage
function getInitialValue<T>(queryValue: string | string[] | undefined, storedValue: T, defaultValue: T): T {
  if (queryValue !== undefined) {
    return queryValue as unknown as T
  }
  return storedValue ?? defaultValue
}

// Filters from URL query params (with localStorage fallback)
const page = ref(Number(route.query.page) || 1)
// Default to 'all' if not specified in query or localStorage
const language = ref<string>(getInitialValue(route.query.language as string | undefined, storedLanguage.value, 'all'))
const category = ref<string>(getInitialValue(route.query.category as string | undefined, storedCategory.value, 'all'))
const featured = ref<boolean | undefined>(route.query.featured === 'true' ? true : undefined)
const tags = ref<string[]>(
  route.query.tags
    ? (Array.isArray(route.query.tags) ? route.query.tags.filter((t): t is string => t !== null) : [route.query.tags as string])
    : (storedTags.value.length > 0 ? storedTags.value : [])
)
const dateRange = ref<string>(getInitialValue(route.query.dateRange as string | undefined, storedDateRange.value, 'all'))

// Sync filter changes to localStorage
watch(language, (val) => { storedLanguage.value = val })
watch(category, (val) => { storedCategory.value = val })
watch(tags, (val) => { storedTags.value = val }, { deep: true })
watch(dateRange, (val) => { storedDateRange.value = val })

// Fetch available tags for filter
const { data: tagsData } = await useFetch('/api/tags', {
  query: computed(() => ({
    ...(language.value !== 'all' && { language: language.value }),
    category: category.value
  })),
  watch: [language, category]
})

const availableTags = computed(() => {
  const rawTags = tagsData.value?.tags || []
  return rawTags.map((tag: string) => ({
    value: tag,
    label: getTagLabel(tag)
  }))
})

// Fetch articles with filters
const { data, pending } = await useFetch('/api/articles', {
  query: computed(() => ({
    page: page.value,
    limit: 20,
    ...(language.value !== 'all' && { language: language.value }),
    category: category.value,
    ...(featured.value && { featured: 'true' }),
    ...(tags.value.length > 0 && { tags: tags.value }),
    ...(dateRange.value !== 'all' && { dateRange: dateRange.value })
  })),
  watch: [page, language, category, featured, tags, dateRange]
})

const articles = computed(() => data.value?.articles || [])
const pagination = computed(() => data.value?.pagination)

// Update URL when filters change
watch([page, language, category, featured, tags, dateRange], () => {
  const query: any = {}
  if (page.value > 1) query.page = page.value
  if (language.value !== 'all') query.language = language.value
  if (category.value !== 'all') query.category = category.value
  if (featured.value) query.featured = 'true'
  if (tags.value.length > 0) query.tags = tags.value
  if (dateRange.value !== 'all') query.dateRange = dateRange.value

  router.replace({ query })
})

// Watch for locale changes and update language filter
watch(locale, (newLocale) => {
  // Only update if user hasn't manually selected a different language (i.e., still on 'all')
  if (!route.query.language && language.value === 'all') {
    language.value = newLocale
  }
})

// Language options
const languageOptions = computed(() => [
  { value: 'all', label: t('filters.allLanguages') },
  { value: 'en', label: t('languages.en') },
  { value: 'fr', label: t('languages.fr') },
  { value: 'es', label: t('languages.es') },
  { value: 'de', label: t('languages.de') }
])

// Category options
const categoryOptions = computed(() => [
  { value: 'all', label: t('filters.allCategories') },
  { value: 'research', label: t('categories.research') },
  { value: 'care', label: t('categories.care') },
  { value: 'conservation', label: t('categories.conservation') },
  { value: 'behavior', label: t('categories.behavior') },
  { value: 'ecology', label: t('categories.ecology') },
  { value: 'community', label: t('categories.community') },
  { value: 'news', label: t('categories.news') },
  { value: 'separator', label: '──────────', disabled: true },
  { value: 'off-topic', label: t('categories.off-topic') }
])

// Date range options
const dateRangeOptions = computed(() => [
  { value: 'all', label: t('filters.allTime') },
  { value: '24h', label: t('filters.last24h') },
  { value: 'week', label: t('filters.lastWeek') },
  { value: 'month', label: t('filters.lastMonth') }
])

// Reset to page 1 when filters change
watch([language, category, featured, tags, dateRange], () => {
  page.value = 1
})

// Clear all filters and localStorage
function clearFilters() {
  language.value = 'all'
  category.value = 'all'
  featured.value = undefined
  tags.value = []
  dateRange.value = 'all'
  // Clear localStorage - watchers will sync these values
  storedLanguage.value = 'all'
  storedCategory.value = 'all'
  storedTags.value = []
  storedDateRange.value = 'all'
}
</script>

<template>
  <UMain>
    <UContainer class="py-10">
      <!-- Filters -->
      <div class="mb-8 flex flex-wrap gap-4 items-center">
        <USelect
          v-model="language"
          :items="languageOptions"
          :placeholder="t('filters.allLanguages')"
          class="w-48"
        />

        <USelect
          v-model="category"
          :items="categoryOptions"
          :placeholder="t('filters.allCategories')"
          class="w-48"
        />

        <USelectMenu
          v-model="tags"
          :items="availableTags"
          value-key="value"
          :placeholder="t('filters.allTags')"
          :search-placeholder="t('filters.searchTags')"
          multiple
          searchable
          class="w-64"
        />

        <USelect
          v-model="dateRange"
          :items="dateRangeOptions"
          :placeholder="t('filters.allTime')"
          class="w-48"
        />

        <UButton
          v-if="language !== 'all' || category !== 'all' || featured || tags.length > 0 || dateRange !== 'all'"
          color="neutral"
          variant="link"
          @click="clearFilters"
        >
          {{ t('filters.clearFilters') }}
        </UButton>

        <!-- Results count -->
        <div v-if="pagination" class="ml-auto text-sm text-gray-500">
          {{ t(pagination.total === 1 ? 'articles.articleCount' : 'articles.articleCount_plural', { count: pagination.total }) }}
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="pending" class="text-center py-12">
        <p class="text-muted">{{ t('articles.loading') }}</p>
      </div>

      <!-- Articles grid -->
      <div v-else-if="articles.length > 0">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ArticleCard
            v-for="article in articles"
            :key="article.id"
            :article="article"
          />
        </div>

        <!-- Pagination -->
        <UPagination v-if="pagination && pagination.totalPages > 1" v-model:page="page" :items-per-page="pagination.limit" :total="pagination.total" class="mt-10 flex justify-center gap-2"/>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12">
        <p class="text-muted">{{ t('articles.noArticlesFound') }}</p>
        <UButton
          v-if="language !== 'all' || category !== 'all' || featured || tags.length > 0 || dateRange !== 'all'"
          color="secondary"
          variant="ghost"
          class="mt-4"
          @click="clearFilters"
        >
          {{ t('filters.clearFilters') }}
        </UButton>
      </div>
    </UContainer>
  </UMain>
</template>