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
    '@nuxtjs/i18n'
  ],
  googleFonts: {
    families: {
      Montserrat: [400, 500, 600, 700]
    },
    display: 'swap'
  },
  ui: {
    theme: {
      colors: {
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#5B21B6', // Brand purple
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764'
        }
      }
    }
  },
  i18n: {
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json', flag: '🇫🇷' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json', flag: '🇬🇧' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json', flag: '🇪🇸' },
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json', flag: '🇩🇪' }
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
