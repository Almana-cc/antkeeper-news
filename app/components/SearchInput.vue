<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const isExpanded = ref(false)
const searchQuery = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(-1)
const showSuggestions = ref(false)

// Debounced search query for API calls
const debouncedQuery = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (newValue) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = newValue
  }, 300)
})

// Fetch suggestions from API
const { data: suggestionsData } = await useFetch('/api/articles/suggestions', {
  query: computed(() => ({
    q: debouncedQuery.value,
    limit: 8
  })),
  watch: [debouncedQuery],
  immediate: false
})

interface Suggestion {
  type: 'tag' | 'article'
  value: string
  count?: number
  slug?: string
}

const suggestions = computed<Suggestion[]>(() => {
  if (!debouncedQuery.value || debouncedQuery.value.length < 2) {
    return []
  }
  // Cast the API response to our Suggestion type
  const rawSuggestions = suggestionsData.value?.suggestions as Suggestion[] | undefined
  return rawSuggestions || []
})

// Show suggestions when we have results and input is focused
watch([suggestions, searchQuery], () => {
  showSuggestions.value = suggestions.value.length > 0 && searchQuery.value.length >= 2
  selectedIndex.value = -1
})

function toggleSearch() {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  } else {
    searchQuery.value = ''
    showSuggestions.value = false
  }
}

function clearSearch() {
  searchQuery.value = ''
  showSuggestions.value = false
  inputRef.value?.focus()
}

function submitSearch() {
  if (searchQuery.value.trim()) {
    navigateTo({
      path: localePath('/search'),
      query: { q: searchQuery.value.trim() }
    })
    isExpanded.value = false
    showSuggestions.value = false
  }
}

function selectSuggestion(suggestion: Suggestion) {
  if (suggestion.type === 'article' && suggestion.slug) {
    // Navigate directly to the article
    navigateTo(localePath(`/articles/${suggestion.slug}`))
  } else {
    // Use the tag value as search query
    searchQuery.value = suggestion.value
    submitSearch()
  }
  showSuggestions.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (showSuggestions.value) {
      showSuggestions.value = false
      selectedIndex.value = -1
    } else {
      isExpanded.value = false
      searchQuery.value = ''
    }
    return
  }

  if (!showSuggestions.value || suggestions.value.length === 0) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, suggestions.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
  } else if (event.key === 'Enter' && selectedIndex.value >= 0) {
    event.preventDefault()
    const selected = suggestions.value[selectedIndex.value]
    if (selected) {
      selectSuggestion(selected)
    }
  }
}

function handleInputKeydown(event: KeyboardEvent) {
  handleKeydown(event)
  if (event.key === 'Enter' && selectedIndex.value < 0) {
    submitSearch()
  }
}

function handleBlur(event: FocusEvent) {
  // Only collapse if focus is moving outside the search container
  const relatedTarget = event.relatedTarget as HTMLElement | null
  if (!relatedTarget?.closest('.search-container')) {
    // Small delay to allow click events to register
    setTimeout(() => {
      showSuggestions.value = false
      if (!searchQuery.value) {
        isExpanded.value = false
      }
    }, 150)
  }
}

function handleFocus() {
  if (suggestions.value.length > 0 && searchQuery.value.length >= 2) {
    showSuggestions.value = true
  }
}
</script>

<template>
  <div class="search-container relative flex items-center">
    <!-- Desktop: Expandable search -->
    <div class="hidden lg:flex items-center">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="w-0 opacity-0"
        enter-to-class="w-64 opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="w-64 opacity-100"
        leave-to-class="w-0 opacity-0"
      >
        <div v-if="isExpanded" class="overflow-hidden mr-2 relative">
          <UInput
            ref="inputRef"
            v-model="searchQuery"
            :placeholder="t('search.placeholder')"
            class="w-64"
            size="sm"
            autocomplete="off"
            @keydown="handleInputKeydown"
            @blur="handleBlur"
            @focus="handleFocus"
          >
            <template #trailing>
              <UButton
                v-if="searchQuery"
                icon="i-lucide-x"
                color="neutral"
                variant="link"
                size="xs"
                :padded="false"
                :aria-label="t('search.clear')"
                @click="clearSearch"
              />
            </template>
          </UInput>

          <!-- Suggestions dropdown -->
          <div
            v-if="showSuggestions && suggestions.length > 0"
            class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            <ul class="py-1" role="listbox">
              <li
                v-for="(suggestion, index) in suggestions"
                :key="`${suggestion.type}-${suggestion.value}`"
                :class="[
                  'px-3 py-2 cursor-pointer flex items-center gap-2',
                  index === selectedIndex
                    ? 'bg-primary-100 dark:bg-primary-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                ]"
                role="option"
                :aria-selected="index === selectedIndex"
                @click="selectSuggestion(suggestion)"
                @mouseenter="selectedIndex = index"
              >
                <UIcon
                  :name="suggestion.type === 'tag' ? 'i-lucide-tag' : 'i-lucide-file-text'"
                  class="size-4 text-gray-400 flex-shrink-0"
                />
                <span class="truncate flex-1">{{ suggestion.value }}</span>
                <span v-if="suggestion.type === 'tag' && suggestion.count" class="text-xs text-gray-400">
                  {{ suggestion.count }}
                </span>
                <span v-else-if="suggestion.type === 'article'" class="text-xs text-gray-400">
                  {{ t('search.article') }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </Transition>
      <UButton
        :icon="isExpanded ? 'i-lucide-arrow-right' : 'i-lucide-search'"
        color="primary"
        variant="soft"
        :aria-label="isExpanded ? t('search.submit') : t('search.open')"
        @click="isExpanded ? submitSearch() : toggleSearch()"
      />
    </div>

    <!-- Mobile: Full-width expandable search -->
    <div class="lg:hidden flex items-center w-full">
      <template v-if="!isExpanded">
        <UButton
          icon="i-lucide-search"
          color="primary"
          variant="soft"
          :aria-label="t('search.open')"
          @click="toggleSearch"
        />
      </template>
      <template v-else>
        <div class="flex flex-col w-full relative">
          <div class="flex items-center gap-2 w-full">
            <UInput
              ref="inputRef"
              v-model="searchQuery"
              :placeholder="t('search.placeholder')"
              class="flex-1"
              size="sm"
              autocomplete="off"
              @keydown="handleInputKeydown"
              @focus="handleFocus"
            >
              <template #trailing>
                <UButton
                  v-if="searchQuery"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="link"
                  size="xs"
                  :padded="false"
                  :aria-label="t('search.clear')"
                  @click="clearSearch"
                />
              </template>
            </UInput>
            <UButton
              icon="i-lucide-arrow-right"
              color="primary"
              variant="soft"
              :aria-label="t('search.submit')"
              @click="submitSearch"
            />
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              :aria-label="t('search.close')"
              @click="toggleSearch"
            />
          </div>

          <!-- Mobile suggestions dropdown -->
          <div
            v-if="showSuggestions && suggestions.length > 0"
            class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            <ul class="py-1" role="listbox">
              <li
                v-for="(suggestion, index) in suggestions"
                :key="`${suggestion.type}-${suggestion.value}`"
                :class="[
                  'px-3 py-2 cursor-pointer flex items-center gap-2',
                  index === selectedIndex
                    ? 'bg-primary-100 dark:bg-primary-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                ]"
                role="option"
                :aria-selected="index === selectedIndex"
                @click="selectSuggestion(suggestion)"
              >
                <UIcon
                  :name="suggestion.type === 'tag' ? 'i-lucide-tag' : 'i-lucide-file-text'"
                  class="size-4 text-gray-400 flex-shrink-0"
                />
                <span class="truncate flex-1">{{ suggestion.value }}</span>
                <span v-if="suggestion.type === 'tag' && suggestion.count" class="text-xs text-gray-400">
                  {{ suggestion.count }}
                </span>
                <span v-else-if="suggestion.type === 'article'" class="text-xs text-gray-400">
                  {{ t('search.article') }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
