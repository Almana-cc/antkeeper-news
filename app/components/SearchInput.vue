<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const isExpanded = ref(false)
const searchQuery = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function toggleSearch() {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  } else {
    searchQuery.value = ''
  }
}

function clearSearch() {
  searchQuery.value = ''
  inputRef.value?.focus()
}

function submitSearch() {
  if (searchQuery.value.trim()) {
    navigateTo({
      path: localePath('/search'),
      query: { q: searchQuery.value.trim() }
    })
    isExpanded.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isExpanded.value = false
    searchQuery.value = ''
  }
}

function handleBlur(event: FocusEvent) {
  // Only collapse if focus is moving outside the search container
  const relatedTarget = event.relatedTarget as HTMLElement | null
  if (!relatedTarget?.closest('.search-container')) {
    // Small delay to allow click events to register
    setTimeout(() => {
      if (!searchQuery.value) {
        isExpanded.value = false
      }
    }, 150)
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
        <div v-if="isExpanded" class="overflow-hidden mr-2">
          <UInput
            ref="inputRef"
            v-model="searchQuery"
            :placeholder="t('search.placeholder')"
            class="w-64"
            size="sm"
            @keydown.enter="submitSearch"
            @keydown.escape="handleKeydown"
            @blur="handleBlur"
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
        <div class="flex items-center gap-2 w-full">
          <UInput
            ref="inputRef"
            v-model="searchQuery"
            :placeholder="t('search.placeholder')"
            class="flex-1"
            size="sm"
            @keydown.enter="submitSearch"
            @keydown.escape="handleKeydown"
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
      </template>
    </div>
  </div>
</template>
