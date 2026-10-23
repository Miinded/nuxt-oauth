import { beforeEach } from 'vitest';

declare global {
  var __NUXT_CLIENT__: boolean;
  var __NUXT_SERVER__: boolean;
}

// Par défaut, le code s'exécute comme pendant le rendu serveur
beforeEach(() => {
  globalThis.__NUXT_CLIENT__ = false;
  globalThis.__NUXT_SERVER__ = true;
});
