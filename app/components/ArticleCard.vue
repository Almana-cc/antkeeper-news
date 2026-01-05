<script setup lang="ts">
interface Props {
  article: Article
}

const props = defineProps<Props>()
const { t } = useI18n()

// State for expand/collapse
const isExpanded = ref(false)

// Check if description is long enough to need expansion
const needsExpansion = computed(() => {
  return (props.article.summary?.length ?? 0) > 200
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
  <div class="h-full flex flex-col group">
    <UBlogPost
      class="h-full flex flex-col transition-transform duration-200 hover:scale-[1.02]"
      :title="article.title"
      :description="article.summary || undefined"
      :image="article.imageUrl || undefined"
      :date="article.publishedAt || undefined"
      :to="article.sourceUrl || undefined"
      :target="article.sourceUrl ? '_blank' : undefined"
      :authors="[author]"
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
          @click.stop.prevent="isExpanded = !isExpanded"
          class="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-2 transition-colors inline-block relative z-10"
        >
          {{ isExpanded ? t('articles.showLess') : t('articles.showMore') }}
        </button>
      </template>

      <!-- Tags in footer slot -->
      <template v-if="article.tags && article.tags.length > 0" #footer>
        <div class="flex flex-wrap justify-end gap-2">
          <UBadge
            v-for="tag in article.tags"
            :key="tag"
            :label="tag"
            size="sm"
            color="primary"
            variant="soft"
          />
        </div>
      </template>
    </UBlogPost>
  </div>
</template>
