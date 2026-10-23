import MyModule from '../../../src/module';

export default defineNuxtConfig({
  modules: ['@pinia/nuxt', MyModule],
  runtimeConfig: {
    // mot de passe de test (32 caractères minimum), jamais utilisé hors des tests
    session: { password: 'test-session-password-0123456789abcdef' },
    public: { BACKEND_URI: 'http://127.0.0.1:9' },
  },
});
