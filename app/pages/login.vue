<script setup lang="ts">
const { loggedIn, user, session, clear } = useUserSession()
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

const hasOAuthError = computed(() => route.query.error === 'oauth')
const isAdmin = computed(() => session.value?.isAdmin === true)

async function logout() {
  await clear()
  navigateTo(localePath('/'))
}

useSeoMeta({
  title: () => t('admin.login.title'),
  robots: 'noindex, nofollow'
})
</script>

<template>
  <UMain>
    <UContainer class="py-20 flex justify-center">
      <UCard class="w-full max-w-md">
        <template #header>
          <h1 class="text-xl font-semibold">{{ t('admin.login.title') }}</h1>
        </template>

        <UAlert
          v-if="hasOAuthError"
          color="error"
          variant="soft"
          icon="i-lucide-alert-triangle"
          :title="t('admin.login.error')"
          class="mb-4"
        />

        <!-- Logged in -->
        <div v-if="loggedIn && user" class="space-y-4">
          <div class="flex items-center gap-3">
            <UAvatar :src="user.avatarUrl || undefined" :alt="user.login" size="lg" />
            <div>
              <p class="font-medium">{{ user.name || user.login }}</p>
              <p class="text-sm text-muted">@{{ user.login }}</p>
            </div>
          </div>

          <UAlert
            v-if="isAdmin"
            color="success"
            variant="soft"
            icon="i-lucide-shield-check"
            :title="t('admin.login.adminAccess')"
            :description="t('admin.login.adminAccessHint')"
          />
          <UAlert
            v-else
            color="warning"
            variant="soft"
            icon="i-lucide-shield-off"
            :title="t('admin.login.noAdminAccess')"
          />

          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-log-out"
              @click="logout"
            >
              {{ t('admin.login.logout') }}
            </UButton>
            <UButton
              :to="localePath('/')"
              color="primary"
              variant="ghost"
              icon="i-lucide-home"
            >
              {{ t('admin.login.backHome') }}
            </UButton>
          </div>
        </div>

        <!-- Logged out -->
        <div v-else class="space-y-4">
          <p class="text-sm text-muted">{{ t('admin.login.description') }}</p>
          <UButton
            to="/auth/github"
            external
            color="neutral"
            icon="i-simple-icons-github"
            block
          >
            {{ t('admin.login.withGithub') }}
          </UButton>
        </div>
      </UCard>
    </UContainer>
  </UMain>
</template>
