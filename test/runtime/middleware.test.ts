import type { H3Event } from 'h3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import middleware, { forwardSessionCookie, isExpired } from '../../src/runtime/middleware/jwt.global';
import {
  clearSession,
  fetchSession,
  navigateTo,
  nuxtApp,
  requestFetch,
  resetStubs,
  runtimeConfig,
  session,
  useRequestEvent,
} from '../stubs/imports';

const h3 = vi.hoisted(() => ({ appendResponseHeader: vi.fn() }));
vi.mock('h3', async (original) => ({ ...(await original<typeof import('h3')>()), ...h3 }));

/** JWT non signé, suffisant pour decode() */
const jwt = (exp: number) =>
  ['{"alg":"none"}', JSON.stringify({ exp })].map((part) => Buffer.from(part).toString('base64url')).join('.') + '.sig';
const now = () => Math.floor(Date.now() / 1000);
const valid = () => jwt(now() + 3600);
const expired = () => jwt(now() - 60);

const run = (path = '/admin/dashboard') =>
  (middleware as unknown as (to: { path: string }) => Promise<unknown>)({ path });

describe('isExpired', () => {
  it('compare exp à maintenant et considère un jeton illisible comme expiré', () => {
    expect(isExpired(valid())).toBe(false);
    expect(isExpired(expired())).toBe(true);
    expect(isExpired('not-a-jwt')).toBe(true);
  });
});

describe('forwardSessionCookie', () => {
  it('reporte uniquement le cookie de session, une seule fois, sur la réponse et la requête', () => {
    const headers = new Headers({ cookie: 'nuxt-session=old; theme=dark' });
    const event = { headers, node: { req: { headers: {} as Record<string, string> } } } as unknown as H3Event;

    forwardSessionCookie(event, ['nuxt-session=new; Path=/; HttpOnly', 'other=1; Path=/'], 'nuxt-session');

    expect(h3.appendResponseHeader).toHaveBeenCalledTimes(1);
    expect(h3.appendResponseHeader).toHaveBeenCalledWith(event, 'Set-Cookie', 'nuxt-session=new; Path=/; HttpOnly');
    expect(headers.get('cookie')).toBe('nuxt-session=new; theme=dark');
    expect(event.node!.req.headers.cookie).toBe('nuxt-session=new; theme=dark');
  });
});

describe('middleware jwt.global', () => {
  beforeEach(() => {
    resetStubs();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    h3.appendResponseHeader.mockClear();
    runtimeConfig.public.miindedOauth.protectedRoutes = ['/admin'];
  });

  it("ne fait rien à l'hydratation d'une page rendue côté serveur", async () => {
    globalThis.__NUXT_CLIENT__ = true;
    globalThis.__NUXT_SERVER__ = false;
    Object.assign(nuxtApp, { isHydrating: true, payload: { serverRendered: true } });

    await expect(run()).resolves.toBeUndefined();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('renvoie vers la connexion sans session sur une route protégée seulement', async () => {
    await expect(run('/admin')).resolves.toBe('navigate:/login');
    await expect(run('/blog')).resolves.toBeUndefined();
    await expect(run('/login')).resolves.toBeUndefined();
  });

  it('laisse passer une session valide sans appel', async () => {
    session.value = { jwt: { accessToken: valid(), refreshToken: valid() } };

    await expect(run()).resolves.toBeUndefined();
    expect(requestFetch).not.toHaveBeenCalled();
  });

  it('efface la session quand les deux jetons sont expirés', async () => {
    session.value = { jwt: { accessToken: expired(), refreshToken: expired() } };

    await expect(run()).resolves.toBe('navigate:/login');
    await expect(run('/blog')).resolves.toBeUndefined();
    expect(clearSession).toHaveBeenCalledTimes(2);
  });

  it("renouvelle un jeton d'accès expiré et reporte le cookie pendant le rendu serveur", async () => {
    session.value = { jwt: { accessToken: expired(), refreshToken: valid() } };
    const headers = new Headers({ cookie: 'nuxt-session=old' });
    useRequestEvent.mockReturnValue({ headers, node: { req: { headers: {} } } } as never);
    requestFetch.mockImplementation(async (_url: string, options: { onResponse: (ctx: unknown) => void }) => {
      options.onResponse({ response: { headers: { getSetCookie: () => ['nuxt-session=new; Path=/'] } } });
    });

    await expect(run()).resolves.toBeUndefined();

    expect(requestFetch).toHaveBeenCalledWith('/api/session-refresh', expect.objectContaining({ method: 'POST' }));
    expect(headers.get('cookie')).toBe('nuxt-session=new');
    expect(fetchSession).toHaveBeenCalled();
  });

  it('termine la session si le renouvellement est refusé', async () => {
    session.value = { jwt: { accessToken: expired(), refreshToken: valid() } };
    requestFetch.mockRejectedValue({ statusCode: 401 });

    await expect(run()).resolves.toBe('navigate:/login');
    expect(clearSession).toHaveBeenCalled();
  });

  it("laisse l'interface s'afficher quand le backend est indisponible", async () => {
    session.value = { jwt: { accessToken: expired(), refreshToken: valid() } };
    requestFetch.mockRejectedValue({ statusCode: 503 });

    await expect(run()).resolves.toBeUndefined();
    expect(clearSession).not.toHaveBeenCalled();
  });
});
