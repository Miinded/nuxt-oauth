import type { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthHandler } from '../../src/runtime/composables/useAuthHandler';
import { useLogout } from '../../src/runtime/composables/useLogout';
import { useMutationAuth } from '../../src/runtime/composables/useMutationAuth';
import { useQueryAuth } from '../../src/runtime/composables/useQueryAuth';
import {
  clearSession,
  fetchSession,
  navigateTo,
  resetStubs,
  session,
  useMutation,
  useQuery,
  UseRawQueryOnErrorAction,
} from '../stubs/imports';

const fetchMock = vi.fn();
const httpError = (status: number) => ({ response: { status } }) as AxiosError;

describe('useAuthHandler', () => {
  beforeEach(() => {
    resetStubs();
    fetchMock.mockReset();
    vi.stubGlobal('$fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("construit l'en-tête Authorization depuis la session", () => {
    const { authToken } = useAuthHandler();
    expect(authToken.value).toEqual({});

    session.value = { jwt: { accessToken: 'jwt', refreshToken: 'r' } };
    expect(authToken.value).toEqual({ Authorization: 'Bearer jwt' });
  });

  it('renouvelle les jetons sur un 401 puis demande de rejouer la requête', async () => {
    fetchMock.mockResolvedValue('a2');

    await expect(useAuthHandler().onErrorCallback(httpError(401))).resolves.toBe(UseRawQueryOnErrorAction.REFRESH);
    expect(fetchMock).toHaveBeenCalledWith('/api/session-refresh', { method: 'POST' });
    expect(fetchSession).toHaveBeenCalled();
  });

  it('renvoie à la connexion quand le renouvellement est refusé', async () => {
    fetchMock.mockRejectedValue({ statusCode: 401 });

    await expect(useAuthHandler().onErrorCallback(httpError(401))).resolves.toBe(UseRawQueryOnErrorAction.CANCEL);
    expect(clearSession).toHaveBeenCalled();
    expect(navigateTo).toHaveBeenCalledWith('/login');
  });

  it("laisse l'erreur s'afficher quand le backend est indisponible ou pour un autre statut", async () => {
    fetchMock.mockRejectedValue({ status: 503 });
    const { onErrorCallback } = useAuthHandler();

    await expect(onErrorCallback(httpError(401))).resolves.toBe(UseRawQueryOnErrorAction.NOTHING);
    await expect(onErrorCallback(httpError(500))).resolves.toBe(UseRawQueryOnErrorAction.NOTHING);
    expect(clearSession).not.toHaveBeenCalled();
  });
});

describe('useQueryAuth et useMutationAuth', () => {
  beforeEach(resetStubs);

  it('ajoutent le jeton et le renouvellement aux options', () => {
    useQueryAuth('/me', ['me'], undefined, { fetchOnMount: false, retry: { max: 2 } });
    useMutationAuth(['me'], { minDelay: 100 });

    expect(useQuery).toHaveBeenCalledWith(
      '/me',
      ['me'],
      undefined,
      expect.objectContaining({
        fetchOnMount: false,
        retry: { max: 2 },
        authToken: expect.anything(),
        onErrorCallback: expect.any(Function),
      }),
    );
    expect(useMutation).toHaveBeenCalledWith(
      ['me'],
      expect.objectContaining({ minDelay: 100, authToken: expect.anything(), onErrorCallback: expect.any(Function) }),
    );
  });
});

describe('useLogout', () => {
  beforeEach(() => {
    resetStubs();
    fetchMock.mockReset();
    vi.stubGlobal('$fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('révoque les jetons, efface la session et renvoie à la connexion', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    await useLogout()();

    expect(fetchMock).toHaveBeenCalledWith('/api/logout', { method: 'POST' });
    expect(clearSession).toHaveBeenCalled();
    expect(navigateTo).toHaveBeenCalledWith('/login');
  });

  it('déconnecte localement même si la révocation échoue', async () => {
    fetchMock.mockRejectedValue(new Error('down'));

    await expect(useLogout()()).rejects.toThrow('down');
    expect(clearSession).toHaveBeenCalled();
    expect(navigateTo).toHaveBeenCalledWith('/login');
  });
});
