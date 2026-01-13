<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

const { locale, locales, t, setLocale } = useI18n()
const items = computed<DropdownMenuItem[]>(() => {
  return locales.value.map(l => ({
    icon: l.icon,
    label: l.name,
    color: locale.value === l.code ? 'secondary': 'antral',
    value: l.code,
    onSelect: () => setLocale(l.code)
  }))
})

const colorMode = useColorMode()

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set(_isDark) {
    colorMode.preference = _isDark ? 'dark' : 'light'
  }
})

const itemsMobile = computed<NavigationMenuItem[]>(() => [
  ...locales.value.map(l => ({
    label: l.name,
    active: locale.value === l.code,
    icon: l.icon,
    onSelect: () => setLocale(l.code)
  })),
  {
    type: "label",
    label: "Color Mode"
  },
  {
    icon: 'i-lucide-moon',
    active: isDark.value,
    onSelect: () => {colorMode.preference = 'dark'}
  },
  {
    icon: 'i-lucide-sun',
    active: !isDark.value,
    onSelect: () => {colorMode.preference = 'light'}
  },
])

// SEO meta tags
useHead({
  htmlAttrs: {
    lang: locale
  },
  title: () => t('site.title'),
  link: [
    {
      rel: 'icon',
      type: 'image/png',
      href: '/favicon.ico'
    }
  ],
  meta: [
    {
      name: 'description',
      content: () => t('site.description')
    },
    {
      property: 'og:title',
      content: () => t('site.title')
    },
    {
      property: 'og:description',
      content: () => t('site.description')
    },
    {
      property: 'og:type',
      content: 'website'
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image'
    },
    {
      name: 'twitter:title',
      content: () => t('site.title')
    },
    {
      name: 'twitter:description',
      content: () => t('site.description')
    }
  ]
})
</script>

<template>
  <UApp>
    <UHeader class="bg-purple-800 py-8" :ui="{
      root: 'static'
    }">
      <template #title>
        <div class="flex items-center">
          <img src="~/assets/logo.svg" class="fill-white h-6 mr-2" >
          <h1 class="text-white text-3xl font-bold">{{ t('site.title') }}</h1>
        </div>
      </template>

      <template #right>
        <div class="flex items-center gap-2">
          <SearchInput />
          <UFieldGroup class="hidden lg:flex items-center">
            <UButton
              v-if="!colorMode?.forced"
              :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
              color="primary"
              variant="soft"
              :aria-label="`Switch to ${isDark ? 'light' : 'dark'} mode`"
              @click="isDark = !isDark"
            />
            <UDropdownMenu :items>
              <UButton icon="i-lucide-languages" color="primary" variant="soft" />
            </UDropdownMenu>
          </UFieldGroup>
        </div>
      </template>

      <template #body>
        <UNavigationMenu :items="itemsMobile" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>

    <NuxtPage />
  </UApp>
</template>
