// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/hints',
    '@nuxt/scripts',
    '@nuxt/ui',
    '@nuxthub/core',
    '@nuxt/fonts'
  ],
  hub: {
    db: {
      dialect: 'postgresql',
      driver: 'postgres-js',
      connection: {
        connectionString: process.env.DATABASE_URL
      }
    }
  },
  nitro: {
    experimental: {
      tasks: true
    }
  },
  css: ['~/assets/css/main.css'],
  // $development: {
  //   hub: {
  //     db: 'postgresql'
  //   }
  // }
})
