import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Vérifie le code client du module (module, composables, middleware) dans le contexte app de Nuxt.
// Les types Nitro générés (routes du $fetch typé, auto-imports serveur) importent les sources serveur du module, qui
// utilisent des utilitaires introuvables côté app : on les retire du contexte client. Le code serveur est vérifié à
// part, avec src/runtime/server/tsconfig.json.

const buildDir = resolve(process.cwd(), '.nuxt');
const base = JSON.parse(readFileSync(resolve(buildDir, 'tsconfig.json'), 'utf8'));

// nuxt.d.ts sans ses références aux types Nitro
const nuxtTypes = readFileSync(resolve(buildDir, 'nuxt.d.ts'), 'utf8')
  .split('\n')
  .filter((line) => !/types\/nitro[\w-]*\.d\.ts/.test(line))
  .join('\n');
writeFileSync(resolve(buildDir, 'nuxt.client.d.ts'), nuxtTypes);

const config = {
  extends: './tsconfig.json',
  compilerOptions: {
    types: ['vitest/globals'],
    // table de routes vide, celle que Nuxt génère pour le contexte « shared »
    paths: { ...base.compilerOptions.paths, '#build/server-routes': ['./types/shared-server-routes.d.ts'] },
  },
  include: [
    './nuxt.client.d.ts',
    '../src/module.ts',
    '../src/types/**/*',
    '../src/runtime/composables/**/*',
    '../src/runtime/middleware/**/*',
  ],
};
writeFileSync(resolve(buildDir, 'tsconfig.client.json'), JSON.stringify(config, null, 2));

const vueTsc = createRequire(import.meta.url).resolve('vue-tsc/bin/vue-tsc.js');
const result = spawnSync(process.execPath, [vueTsc, '--noEmit', '-p', resolve(buildDir, 'tsconfig.client.json')], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
