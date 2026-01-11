<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  showClearButton?: boolean
}>()

const emit = defineEmits<{
  clear: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-4">
    <!-- Ant illustration with magnifying glass (no results found theme) -->
    <svg
      width="180"
      height="140"
      viewBox="0 0 180 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="mb-6"
    >
      <!-- Magnifying glass -->
      <circle cx="70" cy="55" r="35" stroke="#a855f7" stroke-width="4" fill="none" opacity="0.3" />
      <circle cx="70" cy="55" r="28" stroke="#a855f7" stroke-width="2" fill="none" opacity="0.2" />
      <line x1="95" y1="80" x2="120" y2="105" stroke="#a855f7" stroke-width="6" stroke-linecap="round" opacity="0.3" />
      
      <!-- Ant body -->
      <ellipse cx="90" cy="85" rx="18" ry="12" fill="#7c3aed" />
      <ellipse cx="90" cy="70" rx="10" ry="8" fill="#7c3aed" />
      <circle cx="90" cy="55" r="9" fill="#7c3aed" />
      
      <!-- Ant eyes -->
      <circle cx="86" cy="52" r="2" fill="white" />
      <circle cx="94" cy="52" r="2" fill="white" />
      
      <!-- Antennae -->
      <path d="M85 47 Q80 35 75 30" stroke="#7c3aed" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M95 47 Q100 35 105 30" stroke="#7c3aed" stroke-width="2" fill="none" stroke-linecap="round" />
      <circle cx="75" cy="30" r="3" fill="#f472b6" />
      <circle cx="105" cy="30" r="3" fill="#f472b6" />
      
      <!-- Legs -->
      <path d="M75 78 Q65 85 55 82" stroke="#7c3aed" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M75 85 Q65 90 55 92" stroke="#7c3aed" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M75 92 Q65 100 55 105" stroke="#7c3aed" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M105 78 Q115 85 125 82" stroke="#7c3aed" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M105 85 Q115 90 125 92" stroke="#7c3aed" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M105 92 Q115 100 125 105" stroke="#7c3aed" stroke-width="2" fill="none" stroke-linecap="round" />
      
      <!-- Question marks floating around -->
      <text x="40" y="45" font-size="16" fill="#a855f7" opacity="0.5">?</text>
      <text x="135" y="50" font-size="14" fill="#f472b6" opacity="0.5">?</text>
      <text x="145" y="75" font-size="12" fill="#a855f7" opacity="0.4">?</text>
    </svg>
    
    <!-- Message -->
    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
      {{ t('articles.noArticlesFound') }}
    </h3>
    <p class="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
      {{ t('articles.emptyStateHint') }}
    </p>
    
    <!-- Clear filters button -->
    <UButton
      v-if="showClearButton"
      color="primary"
      variant="soft"
      @click="emit('clear')"
    >
      {{ t('filters.clearFilters') }}
    </UButton>
  </div>
</template>
