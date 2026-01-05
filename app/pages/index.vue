<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

// Filters from URL query params
const page = ref(Number(route.query.page) || 1)
// Default language to current locale if not specified in query
const language = ref<string | undefined>((route.query.language as string) || locale.value)
const category = ref<string | undefined>((route.query.category as string) || undefined)
const featured = ref<boolean | undefined>(route.query.featured === 'true' ? true : undefined)

// Fetch articles with filters
const { data, pending } = await useFetch('/api/articles', {
  query: computed(() => ({
    page: page.value,
    limit: 20,
    ...(language.value && { language: language.value }),
    ...(category.value && { category: category.value }),
    ...(featured.value && { featured: 'true' })
  })),
  watch: [page, language, category, featured]
})

const articles = computed(() => data.value?.articles || [])
const pagination = computed(() => data.value?.pagination)

// Update URL when filters change
watch([page, language, category, featured], () => {
  const query: any = {}
  if (page.value > 1) query.page = page.value
  if (language.value) query.language = language.value
  if (category.value) query.category = category.value
  if (featured.value) query.featured = 'true'

  router.replace({ query })
})

// Watch for locale changes and update language filter
watch(locale, (newLocale) => {
  // Only update if user hasn't manually selected a different language
  if (!route.query.language) {
    language.value = newLocale
  }
})

// Language options
const languageOptions = computed(() => [
  { value: 'en', label: t('languages.en') },
  { value: 'fr', label: t('languages.fr') },
  { value: 'es', label: t('languages.es') },
  { value: 'de', label: t('languages.de') }
])

// Category options
const categoryOptions = computed(() => [
  { value: 'news', label: t('categories.news') }
])

// Reset to page 1 when filters change
watch([language, category, featured], () => {
  page.value = 1
})
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

        <UButton
          v-if="language || category || featured"
          color="gray"
          variant="ghost"
          @click="() => { language = undefined; category = undefined; featured = undefined }"
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
          v-if="language || category || featured"
          color="secondary"
          variant="ghost"
          class="mt-4"
          @click="() => { language = undefined; category = undefined; featured = undefined }"
        >
          {{ t('filters.clearFilters') }}
        </UButton>
      </div>
    </UContainer>
  </UMain>
</template>