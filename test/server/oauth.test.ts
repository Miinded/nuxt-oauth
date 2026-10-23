import type { H3Event } from 'h3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeOauthLogin,
  failOauthLogin,
  popupResponse,
  useBackendOauthLogin,
} from '../../src/runtime/server/services/useBackendOauthLogin';
import google from '../../src/runtime/server/api/auth/google.get';
import discord from '../../src/runtime/server/api/auth/discord.get';
import { resetStubs, runtimeConfig, setUserSession } from '../stubs/imports';

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('ofetch', () => ({ $fetch: fetchMock }));

const h3 = vi.hoisted(() => ({ send: vi.fn(async () => {}), sendRedirect: vi.fn(async () => {}) }));
vi.mock('h3', async (original) => ({ ...(await original<typeof import('h3')>()), ...h3 }));

const event = {} as H3Event;
const profile = { provider: 'google', identifier: 'sub-1', email: 'a@b.test' };
const login = { accessToken: 'a', refreshAccessToken: 'r', user: { id: 'u1', organizations: [] } };

/** Message transmis par la page de la popup, relu depuis le HTML envoyé */
const popupMessage = () => {
  const html = h3.send.mock.calls.at(-1)![1] as string;
  return JSON.parse(html.match(/postMessage\((.*), window\.location\.origin\)/)![1]!);
};

describe('useBackendOauthLogin', () => {
  beforeEach(() => {
    resetStubs();
    fetchMock.mockReset();
  });

  it('connecte au backend avec la clé d’API et ne garde que l’identité en session', async () => {
    fetchMock.mockResolvedValue(login);

    await useBackendOauthLogin(event, profile);

    expect(fetchMock).toHaveBeenCalledWith(
      '/auth/oauth/login',
      expect.objectContaining({
        method: 'POST',
        body: profile,
        headers: expect.objectContaining({ apiKey: 'oauth-key' }),
      }),
    );
    expect(setUserSession).toHaveBeenCalledWith(event, {
      jwt: { accessToken: 'a', refreshToken: 'r' },
      user: { id: 'u1' },
    });
  });

  it("garde le profil en session quand le compte n'existe pas encore", async () => {
    fetchMock.mockResolvedValue({ ...login, user: null });

    await useBackendOauthLogin(event, profile);

    expect(setUserSession).toHaveBeenCalledWith(event, { oauth: { provider: 'google', datas: profile } });
  });

  it('traduit les erreurs du backend en erreurs HTTP', async () => {
    fetchMock.mockRejectedValueOnce({ response: { status: 403, _data: { message: 'Compte bloqué' } } });
    await expect(useBackendOauthLogin(event, profile)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Compte bloqué',
    });

    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(useBackendOauthLogin(event, profile)).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe('fin du parcours OAuth', () => {
  beforeEach(() => {
    resetStubs();
    fetchMock.mockReset();
  });

  it('redirige après la connexion en mode redirect', async () => {
    fetchMock.mockResolvedValue(login);
    await completeOauthLogin(event, profile);
    expect(h3.sendRedirect).toHaveBeenCalledWith(event, '/overview');
  });

  it('prévient la fenêtre parente en mode popup, succès comme échec', async () => {
    runtimeConfig.public.miindedOauth.oauthFlow = 'popup';

    fetchMock.mockResolvedValueOnce(login);
    await completeOauthLogin(event, profile);
    expect(popupMessage()).toEqual({ success: true, redirect: '/overview' });

    fetchMock.mockRejectedValueOnce({ response: { status: 409, _data: { message: 'Déjà inscrit' } } });
    await completeOauthLogin(event, profile);
    expect(popupMessage()).toEqual({ success: false, error: 'Déjà inscrit' });
  });

  it("échappe le message pour qu'il ne puisse pas sortir du script", async () => {
    await popupResponse(event, { success: false, error: "</script><script>alert('x')</script>" });

    const html = h3.send.mock.calls.at(-1)![1] as string;
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(popupMessage().error).toBe("</script><script>alert('x')</script>");
    expect(h3.send.mock.calls.at(-1)![2]).toBe('text/html; charset=utf-8');
  });

  it('gère un refus du fournisseur OAuth selon le mode', async () => {
    await failOauthLogin(event, new Error('access_denied'));
    expect(h3.sendRedirect).toHaveBeenCalledWith(event, '/login?error=access_denied');

    runtimeConfig.public.miindedOauth.oauthFlow = 'popup';
    await failOauthLogin(event, {});
    expect(popupMessage()).toEqual({ success: false, error: 'Service unavailable' });
  });

  it('transmet le profil Google et Discord au backend', async () => {
    fetchMock.mockResolvedValue(login);
    type Handler = { onSuccess: (e: H3Event, data: { user: Record<string, string> }) => Promise<void> };

    await (google as unknown as Handler).onSuccess(event, {
      user: { sub: 'g1', email: 'g@b.test', given_name: 'Ada', family_name: 'L' },
    });
    await (discord as unknown as Handler).onSuccess(event, { user: { id: 'd1' } });

    expect(fetchMock.mock.calls.map(([, options]) => options.body)).toEqual([
      { provider: 'google', identifier: 'g1', email: 'g@b.test', givenName: 'Ada', familyName: 'L' },
      { provider: 'discord', identifier: 'd1', email: '', givenName: '', familyName: '' },
    ]);
  });
});
