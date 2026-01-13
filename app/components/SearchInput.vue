<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const isOpen = ref(false)
const searchTerm = ref('')
const loading = ref(false)

defineShortcuts({
  meta_k: () => {
    isOpen.value = true
  }
})

const debouncedSearchTerm = refDebounced(searchTerm, 300)

interface SuggestionsResponse {
  suggestions: Suggestion[]
}

const suggestionsData = ref<SuggestionsResponse | null>(null)

watch(debouncedSearchTerm, async (query) => {
  if (query.length < 2) {
    suggestionsData.value = null
    return
  }
  loading.value = true
  try {
    suggestionsData.value = await $fetch('/api/articles/suggestions', {
      query: { q: query, limit: 10 }
    })
  } finally {
    loading.value = false
  }
})

interface Suggestion {
  type: 'tag' | 'article'
  value: string
  count?: number
  slug?: string
}

function submitSearch() {
  if (searchTerm.value.trim()) {
    navigateTo({
      path: localePath('/search'),
      query: { q: searchTerm.value.trim() }
    })
    isOpen.value = false
    searchTerm.value = ''
  }
}

const groups = computed(() => {
  const rawSuggestions = (suggestionsData.value?.suggestions || []) as Suggestion[]
  const groups = []

  // Always show "Search for..." option when there's a search term
  if (searchTerm.value.trim().length >= 2) {
    groups.push({
      id: 'search',
      items: [{
        id: 'search-query',
        label: `${t('search.submit')} "${searchTerm.value.trim()}"`,
        icon: 'i-lucide-search',
        onSelect: () => submitSearch()
      }],
      ignoreFilter: true
    })
  }

  const tagItems = rawSuggestions
    .filter(s => s.type === 'tag')
    .map(s => ({
      id: `tag-${s.value}`,
      label: s.value,
      icon: 'i-lucide-tag',
      suffix: s.count ? `${s.count}` : undefined,
      onSelect: () => {
        navigateTo({
          path: localePath('/search'),
          query: { q: s.value }
        })
        isOpen.value = false
        searchTerm.value = ''
      }
    }))

  const articleItems = rawSuggestions
    .filter(s => s.type === 'article')
    .map(s => ({
      id: `article-${s.slug}`,
      label: s.value,
      icon: 'i-lucide-file-text',
      to: localePath(`/articles/${s.slug}`),
      onSelect: () => {
        isOpen.value = false
        searchTerm.value = ''
      }
    }))

  if (tagItems.length > 0) {
    groups.push({
      id: 'tags',
      label: t('filters.allTags'),
      items: tagItems,
      ignoreFilter: true
    })
  }

  if (articleItems.length > 0) {
    groups.push({
      id: 'articles',
      label: t('articles.title'),
      items: articleItems,
      ignoreFilter: true
    })
  }

  return groups
})

function onUpdateOpen(value: boolean) {
  isOpen.value = value
  if (!value) {
    searchTerm.value = ''
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && searchTerm.value.trim()) {
    const hasSuggestions = groups.value.some(g => g.items.length > 0)
    if (!hasSuggestions) {
      submitSearch()
    }
  }
}
</script>

<template>
  <div>
    <UButton
      icon="i-lucide-search"
      color="primary"
      variant="soft"
      :aria-label="t('search.open')"
      @click="isOpen = true"
    />

    <UModal
      v-model:open="isOpen"
      :ui="{ content: 'sm:max-w-xl' }"
      @update:open="onUpdateOpen"
    >
      <template #content>
        <UCommandPalette
          v-model:search-term="searchTerm"
          :groups="groups"
          :loading="loading"
          :placeholder="t('search.placeholder')"
          :close="{ onClick: () => { isOpen = false; searchTerm = '' } }"
          @keydown="handleKeydown"
          @update:model-value="() => { isOpen = false; searchTerm = '' }"
        >
          <template #empty>
            <div v-if="searchTerm.length >= 2" class="flex flex-col items-center justify-center p-8 text-center">
              <UIcon name="i-lucide-search" class="size-8 text-gray-400 mb-2" />
              <p class="text-sm text-gray-500">{{ t('search.noResultsHint') }}</p>
              <UButton
                class="mt-4"
                color="primary"
                variant="soft"
                @click="submitSearch"
              >
                {{ t('search.submit') }} "{{ searchTerm }}" <UKbd value="Enter"/>
              </UButton>
            </div>
            <div v-else class="flex flex-col items-center justify-center p-8 text-center">
              <UIcon name="i-lucide-search" class="size-8 text-gray-400 mb-2" />
              <p class="text-sm text-gray-500">{{ t('search.placeholder') }}</p>
            </div>
          </template>
        </UCommandPalette>
      </template>
    </UModal>
  </div>
</template>
