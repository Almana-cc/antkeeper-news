<script setup lang="ts">
interface Props {
  article: ArticleWithDuplicates
}

const props = defineProps<Props>()
const { t } = useI18n()
const { getTagLabel } = useTagTranslations()
const router = useRouter()

const handleTagClick = (tag: string) => {
  router.push({ path: '/', query: { tags: tag } })
}

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

// Extract domain from URL for favicon
function getDomainFromUrl(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

// Get favicon URL with Google's service (cached by browser)
function getFaviconUrl(url: string | null): string | undefined {
  const domain = getDomainFromUrl(url)
  if (!domain) return undefined
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

const author = {
  name: props.article.author || undefined,
  description: props.article.sourceName || undefined,
  avatar: {
    src: getFaviconUrl(props.article.sourceUrl),
    icon: 'i-lucide-globe'
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
                  src: getFaviconUrl(duplicate.sourceUrl),
                  icon: 'i-lucide-globe'
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
            :label="getTagLabel(tag)"
            size="sm"
            :color="categoryColor"
            variant="soft"
            class="cursor-pointer hover:opacity-80 transition-opacity"
            @click.stop.prevent="handleTagClick(tag)"
          />
        </div>
      </div>
    </template>
  </UBlogPost>
</template>
