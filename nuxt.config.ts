import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', '@nuxt/eslint'],
  css: ['~/assets/scss/main.scss'],
  // Everything is imported explicitly: project code through slice public APIs,
  // Vue APIs from 'vue', Nuxt composables from '#imports'.
  components: { dirs: [] },
  imports: { scan: false, autoImport: false },
  typescript: {
    strict: true,
    typeCheck: false,
  },
  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'Заметки',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Заметки со списками задач' },
        { name: 'theme-color', content: '#f6f7fb' },
      ],
    },
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/tokens" as *;\n',
        },
      },
    },
  },
})
