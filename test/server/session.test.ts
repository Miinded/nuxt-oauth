import type { H3Event } from 'h3';
import type { UserSession } from '#auth-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import plugin, { hydrateSession } from '../../src/runtime/server/plugins/session';
import refreshHandler from '../../src/runtime/server/api/session-refresh.post';
import logoutHandler from '../../src/runtime/server/api/logout.post';
import providersHandler from '../../src/runtime/server/api/auth/providers.get';
import {
  clearUserSession,
  getUserSession,
  replaceUserSession,
  resetStubs,
  runtimeConfig,
  sessionHooks,
} from '../stubs/imports';

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('ofetch', () => ({ $fetch: fetchMock }));

const event = {} as H3Event;
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });
const call = (handler: unknown) => (handler as (event: H3Event) => Promise<unknown>)(event);
const user = { id: 'u1', nickname: 'admin', organizations: [{ id: 'o1' }] };

describe('plugin de session (hydratation)', () => {
  beforeEach(() => {
    resetStubs();
    fetchMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it("s'abonne au hook fetch de nuxt-auth-utils", () => {
    (plugin as unknown as () => void)();
    expect(sessionHooks.hook).toHaveBeenCalledWith('fetch', hydrateSession);
  });

  it("recharge l'utilisateur complet depuis /auth/me", async () => {
    fetchMock.mockResolvedValue(user);
    const session: UserSession = { jwt: { accessToken: 'a', refreshToken: 'r' }, user: { id: 'u1' } };

    await hydrateSession(session, event);

    expect(session.user).toEqual(user);
  });

  it('ne fait rien sans jeton ou si hydrateUser est désactivé', async () => {
    await hydrateSession({ user: { id: 'u1' } }, event);
    runtimeConfig.public.miindedOauth.hydrateUser = false;
    await hydrateSession({ jwt: { accessToken: 'a', refreshToken: 'r' } }, event);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("garde l'identité du cookie quand le backend est indisponible", async () => {
    fetchMock.mockRejectedValue(httpError(503));
    const session: UserSession = { jwt: { accessToken: 'a', refreshToken: 'r' }, user: { id: 'u1' } };

    await hydrateSession(session, event);

    expect(session.user).toEqual({ id: 'u1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('renouvelle un jeton expiré puis recharge l’utilisateur', async () => {
    fetchMock
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce({ accessToken: 'a2', refreshAccessToken: 'r2' })
      .mockResolvedValueOnce(user);
    const session: UserSession = { jwt: { accessToken: 'a', refreshToken: 'r' }, user: { id: 'u1' } };

    await hydrateSession(session, event);

    expect(session.jwt).toEqual({ accessToken: 'a2', refreshToken: 'r2' });
    expect(replaceUserSession).toHaveBeenCalledWith(event, {
      jwt: { accessToken: 'a2', refreshToken: 'r2' },
      user: { id: 'u1' },
    });
    expect(session.user).toEqual(user);
  });

  it("retire l'utilisateur si le renouvellement est refusé", async () => {
    fetchMock.mockRejectedValueOnce(httpError(401)).mockRejectedValueOnce(httpError(401));
    const session: UserSession = { jwt: { accessToken: 'a', refreshToken: 'r' }, user: { id: 'u1' } };

    await hydrateSession(session, event);

    expect(session.user).toBeUndefined();
  });
});

describe('POST /api/session-refresh', () => {
  beforeEach(() => {
    resetStubs();
    fetchMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('répond 401 sans refresh token', async () => {
    getUserSession.mockResolvedValue({});
    await expect(call(refreshHandler)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('remplace les jetons et garde l’utilisateur de la session', async () => {
    getUserSession.mockResolvedValue({ jwt: { accessToken: 'a', refreshToken: 'r' }, user: { id: 'u1' } });
    fetchMock.mockResolvedValue({ accessToken: 'a2', refreshAccessToken: 'r2' });

    await expect(call(refreshHandler)).resolves.toBe('a2');
    expect(replaceUserSession).toHaveBeenCalledWith(event, {
      jwt: { accessToken: 'a2', refreshToken: 'r2' },
      user: { id: 'u1' },
    });
  });

  it.each([401, 403])('efface la session et répond 401 quand le backend refuse (%i)', async (status) => {
    getUserSession.mockResolvedValue({ jwt: { accessToken: 'a', refreshToken: 'r' } });
    fetchMock.mockRejectedValue(httpError(status));

    await expect(call(refreshHandler)).rejects.toMatchObject({ statusCode: 401 });
    expect(clearUserSession).toHaveBeenCalledWith(event);
  });

  it('répond 503 sans déconnecter quand le backend est indisponible', async () => {
    getUserSession.mockResolvedValue({ jwt: { accessToken: 'a', refreshToken: 'r' } });
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(call(refreshHandler)).rejects.toMatchObject({ statusCode: 503 });
    expect(clearUserSession).not.toHaveBeenCalled();
  });
});

describe('POST /api/logout', () => {
  beforeEach(() => {
    resetStubs();
    fetchMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('fait révoquer le refresh token par le backend puis efface la session', async () => {
    getUserSession.mockResolvedValue({ jwt: { accessToken: 'a', refreshToken: 'r' } });
    fetchMock.mockResolvedValue({});

    await expect(call(logoutHandler)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/auth/logout',
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ authorization: 'Bearer r' }) }),
    );
    expect(clearUserSession).toHaveBeenCalled();
  });

  it('efface la session même si le backend échoue, ou sans jeton', async () => {
    getUserSession.mockResolvedValueOnce({ jwt: { accessToken: 'a' } });
    fetchMock.mockRejectedValue(new Error('down'));
    await call(logoutHandler);
    expect(fetchMock.mock.calls[0]![1].headers.authorization).toBe('Bearer a');

    getUserSession.mockResolvedValueOnce({});
    await call(logoutHandler);

    expect(clearUserSession).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/auth/providers', () => {
  beforeEach(resetStubs);

  it('liste les fournisseurs activés et configurés', () => {
    runtimeConfig.public.miindedOauth.providers = { google: true, discord: true };
    runtimeConfig.oauth = { google: { clientId: 'id' }, discord: {} };

    expect((providersHandler as unknown as (e: H3Event) => string[])(event)).toEqual(['google']);
  });
});
