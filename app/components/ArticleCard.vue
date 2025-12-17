<script setup lang="ts">
interface Props {
  article: Article
  categoryColor: string
}

const props = defineProps<Props>()

// State for expand/collapse
const isExpanded = ref(false)

// Check if description is long enough to need expansion
const needsExpansion = computed(() => {
  return (props.article.summary?.length ?? 0) > 200
})
</script>

<template>
  <div class="h-full flex flex-col">
    <UBlogPost
      class="h-full flex flex-col"
      :title="article.title"
      :description="article.summary || undefined"
      :image="article.imageUrl || undefined"
      :date="article.publishedAt || undefined"
      :to="article.sourceUrl || undefined"
      :target="article.sourceUrl ? '_blank' : undefined"
      :badge="article.category ? {
        label: article.category,
        color: categoryColor,
        variant: 'subtle'
      } : undefined"
      :authors="article.author ? [{
        name: article.author,
        description: article.sourceName || undefined
      }] : undefined"
      orientation="vertical"
      variant="subtle"
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
          {{ isExpanded ? 'Show less' : 'More...' }}
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
            color="neutral"
            variant="soft"
          />
        </div>
      </template>
    </UBlogPost>
  </div>
</template>
