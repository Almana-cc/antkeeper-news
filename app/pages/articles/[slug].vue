<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const { getTagLabel } = useTagTranslations()
const { getArticleReadingTime } = useReadingTime()
const localePath = useLocalePath()

// Navigate to index with tag filter applied
function filterByTag(tag: string) {
  navigateTo({
    path: localePath('/'),
    query: { tags: [tag] }
  })
}

const slug = route.params.slug as string

const { data: article, error } = await useFetch(`/api/articles/${slug}`)
const { data: relatedData } = await useFetch(`/api/articles/${slug}/related`)

if (error.value?.statusCode === 404) {
  throw createError({
    statusCode: 404,
    statusMessage: t('articles.notFound'),
    fatal: true
  })
}

const categoryColors: Record<string, 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' | 'tertiary'> = {
  research: 'warning',
  care: 'success',
  conservation: 'error',
  behavior: 'info',
  ecology: 'secondary',
  community: 'tertiary',
  news: 'primary',
  'off-topic': 'neutral'
}

const categoryColor = computed(() => {
  if (!article.value?.category) return 'neutral'
  return categoryColors[article.value.category] ?? 'neutral'
})

const formattedDate = computed(() => {
  if (!article.value?.publishedAt) return ''
  return new Date(article.value.publishedAt).toLocaleDateString()
})

const readingTime = computed(() => {
  return getArticleReadingTime(article.value?.summary, article.value?.content)
})

const siteUrl = computed(() => config.public.siteUrl || 'https://antkeeper.news')
const articleUrl = computed(() => `${siteUrl.value}/articles/${slug}`)
const isoDate = computed(() => article.value?.publishedAt ? new Date(article.value.publishedAt).toISOString() : '')

useSeoMeta({
  title: () => article.value?.title || '',
  description: () => article.value?.summary || '',
  ogType: 'article',
  ogTitle: () => article.value?.title || '',
  ogDescription: () => article.value?.summary || '',
  ogImage: () => article.value?.imageUrl || '',
  ogUrl: () => articleUrl.value,
  ogSiteName: 'Antkeeper News',
  articlePublishedTime: () => isoDate.value,
  articleAuthor: () => article.value?.author || article.value?.sourceName || 'Antkeeper News',
  twitterCard: 'summary_large_image',
  twitterTitle: () => article.value?.title || '',
  twitterDescription: () => article.value?.summary || '',
  twitterImage: () => article.value?.imageUrl || ''
})

const jsonLd = computed(() => {
  if (!article.value) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.value.title,
    description: article.value.summary || '',
    image: article.value.imageUrl || '',
    datePublished: isoDate.value,
    dateModified: isoDate.value,
    author: {
      '@type': article.value.author ? 'Person' : 'Organization',
      name: article.value.author || article.value.sourceName || 'Antkeeper News'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Antkeeper News',
      url: siteUrl.value
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl.value
    },
    url: articleUrl.value
  }
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => jsonLd.value ? JSON.stringify(jsonLd.value) : ''
    }
  ]
})
</script>

<template>
  <UMain>
    <UContainer class="py-10">
      <!-- Back button -->
      <div class="mb-6">
        <UButton
          to="/"
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
        >
          {{ t('articles.backToList') }}
        </UButton>
      </div>

      <article v-if="article" class="max-w-4xl mx-auto">
        <!-- Header -->
        <header class="mb-8">
          <!-- Category badge -->
          <UBadge
            v-if="article.category"
            :label="t(`categories.${article.category}`)"
            :color="categoryColor"
            variant="solid"
            class="mb-4"
          />

          <h1 class="text-3xl md:text-4xl font-bold mb-4">
            {{ article.title }}
          </h1>

          <!-- Meta info -->
          <div class="flex flex-wrap items-center gap-4 text-sm text-muted mb-6">
            <span v-if="article.sourceName" class="flex items-center gap-2">
              <img
                :src="`https://favicon.is/${article.sourceName}`"
                :alt="article.sourceName"
                class="w-4 h-4"
              >
              {{ article.sourceName }}
            </span>
            <span v-if="article.author">
              {{ article.author }}
            </span>
            <time v-if="article.publishedAt" :datetime="article.publishedAt">
              {{ formattedDate }}
            </time>
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-clock" class="size-4" />
              {{ t('articles.readingTime', { minutes: readingTime }) }}
            </span>
          </div>
        </header>

        <!-- Featured image -->
        <div v-if="article.imageUrl" class="mb-8">
          <img
            :src="article.imageUrl"
            :alt="article.title"
            class="w-full h-auto rounded-lg object-cover max-h-96"
          >
        </div>

        <!-- Summary -->
        <div v-if="article.summary" class="mb-8">
          <p class="text-lg text-muted leading-relaxed">
            {{ article.summary }}
          </p>
        </div>

        <!-- Content -->
        <div v-if="article.content" class="prose dark:prose-invert max-w-none mb-8">
          {{ article.content }}
        </div>

        <!-- Tags -->
        <div v-if="article.tags && article.tags.length > 0" class="flex flex-wrap gap-2 mb-8">
          <UBadge
            v-for="tag in article.tags"
            :key="tag"
            :label="getTagLabel(tag)"
            size="sm"
            :color="categoryColor"
            variant="soft"
            class="cursor-pointer hover:opacity-80 transition-opacity"
            @click="filterByTag(tag)"
          />
        </div>

        <!-- Source link -->
        <div v-if="article.sourceUrl" class="border-t pt-6">
          <UButton
            :to="article.sourceUrl"
            target="_blank"
            color="primary"
            variant="soft"
            icon="i-lucide-external-link"
          >
            {{ t('articles.readOriginal') }}
          </UButton>
        </div>

        <!-- Related articles -->
        <div v-if="relatedData?.relatedArticles && relatedData.relatedArticles.length > 0" class="border-t pt-8 mt-8">
          <h2 class="text-xl font-semibold mb-6">{{ t('articles.relatedArticles') }}</h2>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="related in relatedData.relatedArticles"
              :key="related.id"
              :to="`/articles/${related.slug}`"
              class="group block rounded-lg border p-4 hover:border-primary transition-colors"
            >
              <div v-if="related.imageUrl" class="mb-3 aspect-video overflow-hidden rounded-md">
                <img
                  :src="related.imageUrl"
                  :alt="related.title"
                  class="h-full w-full object-cover group-hover:scale-105 transition-transform"
                >
              </div>
              <h3 class="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {{ related.title }}
              </h3>
              <div class="mt-2 text-sm text-muted flex items-center gap-2">
                <span v-if="related.sourceName">{{ related.sourceName }}</span>
                <span v-if="related.publishedAt">
                  {{ new Date(related.publishedAt).toLocaleDateString() }}
                </span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </article>
    </UContainer>
  </UMain>
</template>
