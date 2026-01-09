<script setup lang="ts">
interface Props {
  article: ArticleWithDuplicates
}

const props = defineProps<Props>()
const { t } = useI18n()

// State for expand/collapse
const isExpanded = ref(false)

// Map categories to badge colors
const categoryColors: Record<string, 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' | 'tertiary'> = {
  research: 'warning',
  care: 'success',
  conservation: 'error',
  behavior: 'info',
  ecology: 'secondary',
  community: 'tertiary',
  news: 'primary',
  "off-topic": 'neutral'
}

const categoryColor = computed(() => {
  if (!props.article.category) return 'neutral'
  return categoryColors[props.article.category] ?? 'neutral'
})

// Check if description is long enough to need expansion
const needsExpansion = computed(() => {
  return (props.article.summary?.length ?? 0) > 200
})

// NEW: Language flag mapping
const languageFlags: Record<string, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪'
}

// NEW: Get language flag
const getLanguageFlag = (lang: string | null) => {
  return languageFlags[lang || 'en'] || '🌐'
}

// NEW: Has duplicates
const hasDuplicates = computed(() => {
  return (props.article.duplicates?.count || 0) > 0
})

const author =  {
    name: props.article.author || undefined,
    description: props.article.sourceName || undefined,
    avatar: {
      src: 'https://favicon.is/' + props.article.sourceName
    }
  }
</script>

<template>
  <UBlogPost
    class="h-full flex flex-col"
    :title="article.title"
    :description="article.summary || undefined"
    :image="article.imageUrl || undefined"
    :date="article.publishedAt || undefined"
    :to="article.sourceUrl || undefined"
    :target="article.sourceUrl ? '_blank' : undefined"
    :authors="[author]"
    :badge="{
      label: t(`categories.${article.category}`),
      color: categoryColor,
      variant: 'solid'
    }"
    orientation="vertical"
    variant="soft"
  >
    <template #description>
      <p
        :class="[
          'text-muted',
          !isExpanded && needsExpansion ? 'line-clamp-3' : ''
        ]"
      >
        {{ article.summary }}
      </p>
      <button
        v-if="needsExpansion"
        class="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-2 transition-colors inline-block relative z-10"
        @click.stop.prevent="isExpanded = !isExpanded"
      >
        {{ isExpanded ? t('articles.showLess') : t('articles.showMore') }}
      </button>
      <!-- Duplicate Articles Section -->
      <div v-if="hasDuplicates" class="mt-2 pt-3">
        <UCollapsible class="w-full">
          <UButton
            as="span"
            :label="t('articles.duplicates.alsoCoveredBy', { count: article.duplicates.count })"
            color="neutral"
            variant="link"
            trailing-icon="i-lucide-chevron-down"
            block
          />
          <template #content>
            <div class="mt-2 ml-6 flex flex-col gap-2">
              <UUser
                v-for="duplicate in article.duplicates.articles"
                :key="duplicate.id"
                :to="duplicate.sourceUrl || undefined"
                :name="duplicate.author || undefined"
                :description="duplicate.sourceName || undefined"
                :avatar="{
                  src: `https://favicon.is/${duplicate.sourceName}`,
                  icon: 'i-lucide-image'
                }"
                size="sm"
              />
            </div>
          </template>
        </UCollapsible>
      </div>
    </template>

    <!-- Tags in footer slot -->
    <template #footer>
      <div class="flex flex-col gap-3">
        <div v-if="article.tags && article.tags.length > 0" class="flex flex-wrap justify-end gap-2">
          <UBadge
            v-for="tag in article.tags"
            :key="tag"
            :label="tag"
            size="sm"
            :color="categoryColor"
            variant="soft"
          />
        </div>
      </div>
    </template>
  </UBlogPost>
</template>
