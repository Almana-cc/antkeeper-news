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
