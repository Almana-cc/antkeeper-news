<script setup lang="ts">
const { locale, locales, t, setLocale } = useI18n()
const updateLocale = (locale: string) => {
  setLocale(locale as 'fr' | 'en' | 'es' | 'de')
}
const items = computed(() => {
  return locales.value.map(i => ({
    label: i.flag + ' ' + i.name,
    value: i.code
  }))
})
// SEO meta tags
useHead({
  htmlAttrs: {
    lang: locale
  },
  title: () => t('site.title'),
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
    <UHeader class="bg-purple-800 py-16">
      <template #title>
        <img src="~/assets/logo.svg" class="fill-white h-12 mr-2" >
        <h1 class="text-white text-4xl md:text-5xl font-bold">{{ t('site.title') }}</h1>
      </template>

      <template #right>

        <USelect color="primary" variant="soft" :items :model-value="locale" @update:model-value="(value: any) => updateLocale(value as string)"/>
      
      </template>
    </UHeader>

    <NuxtPage />
  </UApp>
</template>
