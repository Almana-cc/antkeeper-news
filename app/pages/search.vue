<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

// Get search query from URL
const searchQuery = computed(() => (route.query.q as string || '').trim())

// Language filter - use same cookie as index page for consistency
const storedLanguage = useCookie<string>('antkeeper-filter-language', { default: () => 'all', maxAge: 60 * 60 * 24 * 365 })
const language = ref<string>(storedLanguage.value)

// Sync language changes to cookie
watch(language, (val) => { storedLanguage.value = val })

// Pagination
const page = ref(1)

// Fetch search results
const { data, pending, error } = await useFetch('/api/articles/search', {
  query: computed(() => ({
    q: searchQuery.value,
    page: page.value,
    limit: 20,
    ...(language.value !== 'all' && { language: language.value })
  })),
  watch: [searchQuery, page, language]
})

const articles = computed(() => data.value?.articles || [])
const pagination = computed(() => data.value?.pagination)

// Language options for filter
const languageOptions = computed(() => [
  { value: 'all', label: t('filters.allLanguages') },
  { value: 'en', label: t('languages.en') },
  { value: 'fr', label: t('languages.fr') },
  { value: 'es', label: t('languages.es') },
  { value: 'de', label: t('languages.de') }
])

// Reset page when filters change
watch([language], () => {
  page.value = 1
})

// Scroll to top when page changes
watch(page, () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

// Update URL when page changes
watch(page, () => {
  const query: Record<string, string | number> = { q: searchQuery.value }
  if (page.value > 1) query.page = page.value
  router.replace({ query })
})

// SEO meta tags
useSeoMeta({
  title: () => searchQuery.value
    ? `${t('search.resultsFor', { query: searchQuery.value })} - ${t('site.title')}`
    : `${t('search.title')} - ${t('site.title')}`,
  description: () => searchQuery.value
    ? t('search.resultsFor', { query: searchQuery.value })
    : t('search.title'),
  ogTitle: () => searchQuery.value
    ? `${t('search.resultsFor', { query: searchQuery.value })} - ${t('site.title')}`
    : `${t('search.title')} - ${t('site.title')}`,
  ogDescription: () => searchQuery.value
    ? t('search.resultsFor', { query: searchQuery.value })
    : t('search.title')
})

// Set robots meta to noindex for search pages (prevent crawling of search results)
useHead({
  meta: [
    { name: 'robots', content: 'noindex, follow' }
  ]
})
</script>

<template>
  <UMain>
    <UContainer class="py-10">
      <!-- Header with search query and filter -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          <template v-if="searchQuery">
            {{ t('search.resultsFor', { query: searchQuery }) }}
          </template>
          <template v-else>
            {{ t('search.title') }}
          </template>
        </h1>

        <!-- Filters row -->
        <div class="flex flex-wrap gap-4 items-center">
          <USelect
            v-model="language"
            :items="languageOptions"
            :placeholder="t('filters.allLanguages')"
            class="w-48"
          />

          <!-- Results count -->
          <div v-if="pagination && searchQuery" class="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {{ t(pagination.total === 1 ? 'search.resultCount' : 'search.resultCount_plural', { count: pagination.total }) }}
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="pending" class="text-center py-12">
        <p class="text-muted">{{ t('articles.loading') }}</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-500">{{ error.message }}</p>
      </div>

      <!-- No search query -->
      <div v-else-if="!searchQuery" class="text-center py-16">
        <UIcon name="i-lucide-search" class="size-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p class="text-gray-500 dark:text-gray-400">
          {{ t('search.placeholder') }}
        </p>
      </div>

      <!-- Results grid -->
      <div v-else-if="articles.length > 0">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ArticleCard
            v-for="article in articles"
            :key="article.id"
            :article="article"
          />
        </div>

        <!-- Pagination -->
        <UPagination
          v-if="pagination && pagination.totalPages > 1"
          v-model:page="page"
          :items-per-page="pagination.limit"
          :total="pagination.total"
          class="mt-10 flex justify-center gap-2"
        />
      </div>

      <!-- No results -->
      <div v-else class="text-center py-16">
        <img
          src="~/assets/empty-state.svg"
          alt=""
          class="w-48 h-auto mx-auto mb-6 opacity-80"
        >
        <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {{ t('search.noResultsFor', { query: searchQuery }) }}
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {{ t('search.noResultsHint') }}
        </p>
      </div>
    </UContainer>
  </UMain>
</template>
