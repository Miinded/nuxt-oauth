import type { H3Event } from 'h3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backendFetch,
  backendStatus,
  backendUri,
  fetchMe,
  refreshTokens,
  sessionUser,
} from '../../src/runtime/server/utils/backend';
import { resetStubs, runtimeConfig } from '../stubs/imports';

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('ofetch', () => ({ $fetch: fetchMock }));

const event = {} as H3Event;

describe('utils/backend', () => {
  beforeEach(() => {
    resetStubs();
    fetchMock.mockReset();
  });

  it('privilégie runtimeConfig.backendUri, sinon public.BACKEND_URI', () => {
    expect(backendUri(event)).toBe('https://api.example.test');
    runtimeConfig.backendUri = 'http://backend:5000';
    expect(backendUri(event)).toBe('http://backend:5000');
  });

  it('envoie le jeton, la clé d’API et le corps au backend', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    await backendFetch(event, '/auth/oauth/login', { method: 'POST', token: 'jwt', apiKey: 'key', body: { a: 1 } });

    expect(fetchMock).toHaveBeenCalledWith('/auth/oauth/login', {
      baseURL: 'https://api.example.test',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer jwt', apiKey: 'key' },
      body: { a: 1 },
    });
  });

  it('fait un GET sans en-têtes facultatifs par défaut', async () => {
    fetchMock.mockResolvedValue({});
    await backendFetch(event, '/health');
    expect(fetchMock).toHaveBeenCalledWith('/health', {
      baseURL: 'https://api.example.test',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('appelle les routes de renouvellement et de profil avec le bon jeton', async () => {
    fetchMock.mockResolvedValue({});
    await refreshTokens(event, 'refresh');
    await fetchMe(event, 'access');

    expect(fetchMock.mock.calls.map(([path, options]) => [path, options.headers.authorization])).toEqual([
      ['/auth/refreshtoken', 'Bearer refresh'],
      ['/auth/me', 'Bearer access'],
    ]);
  });

  it("lit le code HTTP d'une erreur ofetch ou h3", () => {
    expect(backendStatus({ response: { status: 401 } })).toBe(401);
    expect(backendStatus({ statusCode: 503 })).toBe(503);
    expect(backendStatus(new Error('network'))).toBeUndefined();
  });

  it("ne garde que l'identité en session quand hydrateUser est actif", () => {
    const user = { id: 'u1', organizations: [{ id: 'o1' }] } as never;
    expect(sessionUser(event, user)).toEqual({ id: 'u1' });

    runtimeConfig.public.miindedOauth.hydrateUser = false;
    expect(sessionUser(event, user)).toBe(user);
  });
});
