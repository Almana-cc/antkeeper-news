<script setup lang="ts">
  const { data: articles } = await useFetch<Article[]>('/api/articles')

  // Helper function to get category badge color
  const getCategoryColor = (category: string | null) => {
    if (!category) return 'neutral'
    const colorMap: Record<string, string> = {
      'research': 'primary',
      'care': 'success',
      'news': 'info'
    }
    return colorMap[category] || 'neutral'
  }

  // Sort articles by publishedAt (newest first)
  const sortedArticles = computed(() => {
    if (!articles.value) return []
    return [...articles.value].sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return dateB - dateA
    })
  })
  </script>

  <template>
    <UMain>
      <UHeader
        title="Antkeeper News"
        description="Latest news, research, and care guides from the antkeeping community"
      />

      <UContainer class="py-10">
        <div v-if="sortedArticles.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ArticleCard
            v-for="article in sortedArticles"
            :key="article.id"
            :article="article"
            :category-color="getCategoryColor(article.category)"
          />
        </div>

        <!-- Empty state -->
        <div v-else class="text-center py-12">
          <p class="text-muted">No articles found.</p>
        </div>
      </UContainer>
    </UMain>
  </template>