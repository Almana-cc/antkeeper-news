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
    '@nuxt/fonts',
    '@nuxtjs/i18n',
    '@vueuse/nuxt'
  ],
  googleFonts: {
    families: {
      Montserrat: [400, 500, 600, 700]
    },
    display: 'swap'
  },
  ui: {
    theme: {
      colors: [
        'primary',
        'secondary',
        'tertiary',
        'info',
        'success',
        'warning',
        'error',
        'antral'
      ]
    }
  },
  i18n: {
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json', flag: '🇫🇷', icon: 'i-flagpack-fr' },
      { code: 'en', language: 'en-GB', name: 'English', file: 'en.json', flag: '🇬🇧', icon: 'i-flagpack-gb-ukm' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json', flag: '🇪🇸', icon: 'i-flagpack-es' },
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json', flag: '🇩🇪', icon: 'i-flagpack-de' }
    ],
    defaultLocale: 'fr',
    strategy: 'prefix_except_default',
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root'
    }
  },
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
