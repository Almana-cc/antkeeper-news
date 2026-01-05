<script setup lang="ts">
const route = useRoute()
const router = useRouter()

// Filters from URL query params
const page = ref(Number(route.query.page) || 1)
const language = ref<string | undefined>((route.query.language as string) || undefined)
const category = ref<string | undefined>((route.query.category as string) || undefined)
const featured = ref<boolean | undefined>(route.query.featured === 'true' ? true : undefined)

// Fetch articles with filters
const { data, pending, refresh } = await useFetch('/api/articles', {
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

// Language options
const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' }
]

// Category options
const categoryOptions = [
  { value: 'news', label: 'News' }
]

// Reset to page 1 when filters change
watch([language, category, featured], () => {
  page.value = 1
})

// Pagination handlers
const goToPage = (newPage: number) => {
  page.value = newPage
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <UMain>
    <!-- Brand Hero Section -->
    <div class="bg-purple-800 text-white py-16">
      <UContainer>
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Antkeeper News</h1>
        <p class="text-xl opacity-90">Latest news, research, and care guides from the antkeeping community</p>
      </UContainer>
    </div>

    <UContainer class="py-10">
      <!-- Filters -->
      <div class="mb-8 flex flex-wrap gap-4 items-center">
        <USelect
          v-model="language"
          :items="languageOptions"
          placeholder="All Languages"
          class="w-48"
        />

        <USelect
          v-model="category"
          :items="categoryOptions"
          placeholder="All Categories"
          class="w-48"
        />

        <UButton
          v-if="language || category || featured"
          color="gray"
          variant="ghost"
          @click="() => { language = undefined; category = undefined; featured = undefined }"
        >
          Clear Filters
        </UButton>

        <!-- Results count -->
        <div v-if="pagination" class="ml-auto text-sm text-gray-500">
          {{ pagination.total }} article{{ pagination.total !== 1 ? 's' : '' }}
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="pending" class="text-center py-12">
        <p class="text-muted">Loading articles...</p>
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
        <p class="text-muted">No articles found.</p>
        <UButton
          v-if="language || category || featured"
          color="gray"
          variant="ghost"
          class="mt-4"
          @click="() => { language = undefined; category = undefined; featured = undefined }"
        >
          Clear Filters
        </UButton>
      </div>
    </UContainer>
  </UMain>
</template>