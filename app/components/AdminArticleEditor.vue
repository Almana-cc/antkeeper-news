<script setup lang="ts">
interface EditableArticle {
  id: number
  title: string
  summary?: string | null
  content?: string | null
  category?: string | null
  tags?: string[] | null
  imageUrl?: string | null
}

const props = defineProps<{ article: EditableArticle; iconOnly?: boolean }>()
const emit = defineEmits<{ updated: [article: Record<string, unknown>] }>()

const { t } = useI18n()
const toast = useToast()

const open = ref(false)
const saving = ref(false)

const form = reactive({
  title: '',
  summary: '',
  content: '',
  category: 'news',
  tags: [] as string[],
  imageUrl: ''
})

watch(open, (isOpen) => {
  if (isOpen) {
    form.title = props.article.title
    form.summary = props.article.summary || ''
    form.content = props.article.content || ''
    form.category = props.article.category || 'news'
    form.tags = [...(props.article.tags || [])]
    form.imageUrl = props.article.imageUrl || ''
  }
})

const categoryItems = computed(() =>
  VALID_CATEGORIES.map((c) => ({ value: c as string, label: t(`categories.${c}`) }))
)

async function save() {
  saving.value = true
  try {
    const { article } = await $fetch<{ article: Record<string, unknown> }>(
      `/api/admin/articles/${props.article.id}`,
      {
        method: 'PATCH',
        body: {
          title: form.title,
          summary: form.summary || null,
          content: form.content || null,
          category: form.category,
          tags: form.tags,
          imageUrl: form.imageUrl.trim() || null
        }
      }
    )
    toast.add({ title: t('admin.edit.saved'), color: 'success', icon: 'i-lucide-check' })
    emit('updated', article)
    open.value = false
  } catch (error) {
    console.error('Failed to update article:', error)
    toast.add({ title: t('admin.edit.error'), color: 'error', icon: 'i-lucide-alert-triangle' })
  } finally {
    saving.value = false
  }
}

function markAs(category: string) {
  form.category = category
  save()
}
</script>

<template>
  <UModal v-model:open="open" :title="t('admin.edit.title')">
    <UButton
      color="secondary"
      :variant="iconOnly ? 'solid' : 'soft'"
      icon="i-lucide-pencil"
      size="sm"
      :aria-label="t('admin.edit.button')"
    >
      <template v-if="!iconOnly">{{ t('admin.edit.button') }}</template>
    </UButton>

    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('admin.edit.titleField')">
          <UInput v-model="form.title" class="w-full" />
        </UFormField>

        <UFormField :label="t('admin.edit.summaryField')">
          <UTextarea v-model="form.summary" :rows="3" class="w-full" />
        </UFormField>

        <UFormField :label="t('admin.edit.contentField')">
          <UTextarea v-model="form.content" :rows="6" class="w-full" />
        </UFormField>

        <UFormField :label="t('admin.edit.categoryField')">
          <USelect v-model="form.category" :items="categoryItems" class="w-full" />
        </UFormField>

        <UFormField :label="t('admin.edit.tagsField')">
          <UInputTags v-model="form.tags" class="w-full" />
        </UFormField>

        <UFormField :label="t('admin.edit.imageField')" :hint="t('admin.edit.imageHint')">
          <UInput
            v-model="form.imageUrl"
            type="url"
            placeholder="https://..."
            icon="i-lucide-image"
            class="w-full"
          />
          <img
            v-if="form.imageUrl.trim()"
            :src="form.imageUrl.trim()"
            :alt="form.title"
            class="mt-2 w-full max-h-48 object-cover rounded-md"
          >
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex flex-wrap items-center gap-2 w-full">
        <UButton
          color="warning"
          variant="soft"
          icon="i-lucide-eye-off"
          size="sm"
          :loading="saving"
          @click="markAs('off-topic')"
        >
          {{ t('admin.edit.markOffTopic') }}
        </UButton>
        <UButton
          color="warning"
          variant="soft"
          icon="i-lucide-bug-off"
          size="sm"
          :loading="saving"
          @click="markAs('pest-control')"
        >
          {{ t('admin.edit.markPestControl') }}
        </UButton>

        <div class="ml-auto flex gap-2">
          <UButton color="neutral" variant="ghost" @click="open = false">
            {{ t('admin.edit.cancel') }}
          </UButton>
          <UButton color="primary" :loading="saving" icon="i-lucide-save" @click="save">
            {{ t('admin.edit.save') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
