<script setup lang="ts" >
const { data: articles } = await useFetch<Article[]>('/api/articles')

console.log(articles.value)
</script>

<template>
  <UMain>
    <UHeader title="Antkeeper News" />
    <UContainer class="py-10">
      <UButton to="/articles">View Articles</UButton>
    </UContainer>
  </UMain>
</template>