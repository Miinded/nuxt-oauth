import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const stubs = fileURLToPath(new URL('./test/stubs/imports.ts', import.meta.url));

export default defineConfig({
  resolve: {
    // Imports virtuels de Nuxt et Nitro, indisponibles hors d'une application Nuxt
    alias: { '#imports': stubs, '#app': stubs },
  },
  // import.meta.client / server pilotés par les tests (cf. test/setup.ts)
  define: {
    'import.meta.client': 'globalThis.__NUXT_CLIENT__',
    'import.meta.server': 'globalThis.__NUXT_SERVER__',
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: true,
    setupFiles: ['./test/setup.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/types/**'],
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      // Seuils minimaux : la CI échoue si la couverture régresse
      thresholds: { statements: 95, branches: 85, functions: 95, lines: 95 },
    },
  },
});
