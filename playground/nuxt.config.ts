export default defineNuxtConfig({
  modules: [
    //
    '../src/module',
    'nuxt-auth-utils',
    '@pinia/nuxt',
    '@miinded/nuxt-api',
  ],
  runtimeConfig: {
    public: {
      BACKEND_URI: 'Test',
    },
  },
  devtools: { enabled: true },
  compatibilityDate: '2025-01-16',
});
