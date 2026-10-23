import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils/e2e';

describe('module dans une application Nuxt', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  });

  it('rend la page sans session', async () => {
    const html = await $fetch('/');
    expect(html).toContain('<div>basic</div>');
  });

  it('expose les routes du module', async () => {
    expect(await $fetch('/api/auth/providers')).toEqual([]);
    expect(await $fetch('/api/logout', { method: 'POST' })).toEqual({ ok: true });
    await expect($fetch('/api/session-refresh', { method: 'POST' })).rejects.toMatchObject({ statusCode: 401 });
  });
});
