<script setup lang="ts">
interface Props {
  article: ArticleWithDuplicates
}

const props = defineProps<Props>()
const { t } = useI18n()

// State for expand/collapse
const isExpanded = ref(false)

// NEW: State for duplicate expansion
const isDuplicatesExpanded = ref(false)

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
    variant="outline"
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
          <button
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors w-full text-left"
            @click.stop.prevent="isDuplicatesExpanded = !isDuplicatesExpanded"
          >
            <UIcon
              :name="isDuplicatesExpanded ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="w-4 h-4"
            />
            <span>{{ t('articles.duplicates.alsoCoveredBy', { count: article.duplicates.count }) }}</span>
          </button>

          <!-- Expanded duplicate list -->
          <div v-if="isDuplicatesExpanded" class="mt-2 ml-6 space-y-2">
            <div
              v-for="duplicate in article.duplicates.articles"
              :key="duplicate.id"
              class="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <!-- Favicon -->
              <img
                v-if="duplicate.sourceName"
                :src="`https://favicon.is/${duplicate.sourceName}`"
                :alt="duplicate.sourceName"
                class="w-4 h-4 mt-0.5 flex-shrink-0"
                @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
              />

              <div class="flex-1 min-w-0">
                <!-- Source name + language flag -->
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ duplicate.sourceName || t('articles.duplicates.unknownSource') }}
                  </span>
                  <UBadge
                    :label="getLanguageFlag(duplicate.language)"
                    size="xs"
                    color="neutral"
                    variant="soft"
                  />
                </div>

                <!-- Source URL -->
                <a
                  v-if="duplicate.sourceUrl"
                  :href="duplicate.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 truncate block"
                  @click.stop
                >
                  {{ duplicate.sourceUrl }}
                </a>
              </div>
            </div>
          </div>
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
