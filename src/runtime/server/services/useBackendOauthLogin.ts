import { type H3Event, createError, send, sendRedirect } from 'h3';
import type { UserLogin } from '#auth-utils';
import { setUserSession, useRuntimeConfig } from '#imports';
import { backendFetch, sessionUser } from '../utils/backend';

export type OauthProfile = Record<string, unknown> & { provider: string; identifier: string };

/**
 * Connecte (ou prépare l'inscription d') un utilisateur OAuth auprès du backend (POST /auth/oauth/login).
 * Sans compte (user null), le profil est gardé en session (session.oauth) pour finaliser l'inscription.
 */
export const useBackendOauthLogin = async (event: H3Event, datas: OauthProfile): Promise<UserLogin> => {
  const config = useRuntimeConfig(event);

  try {
    const result = await backendFetch<UserLogin>(event, '/auth/oauth/login', {
      method: 'POST',
      apiKey: config.oauthApiKey,
      body: datas,
    });

    if (result.user === null) {
      await setUserSession(event, { oauth: { provider: datas.provider, datas } });
      return result;
    }

    await setUserSession(event, {
      jwt: { accessToken: result.accessToken, refreshToken: result.refreshAccessToken },
      user: sessionUser(event, result.user),
    });
    return result;
  } catch (error: unknown) {
    const response = (error as { response?: { status?: number; _data?: { message?: string } } }).response;
    if (response) {
      throw createError({
        statusCode: response.status || 500,
        message: response._data?.message || 'Une erreur est survenue',
      });
    }
    throw createError({ statusCode: 503, message: 'Service unavailable' });
  }
};

/** Page de la popup OAuth : transmet le résultat à la fenêtre parente puis se ferme */
export const popupResponse = (
  event: H3Event,
  payload: { success: boolean; redirect?: string; error?: string },
): Promise<void> => {
  // JSON sérialisé et « < » échappé : un message d'erreur ne peut pas sortir du script
  const message = JSON.stringify(payload).replace(/</g, '\\u003c');
  const html = `<!doctype html><script>window.opener && window.opener.postMessage(${message}, window.location.origin);window.close();</script>`;
  return send(event, html, 'text/html; charset=utf-8');
};

const errorMessage = (error: unknown) =>
  (error as { statusMessage?: string; message?: string })?.statusMessage ||
  (error as { message?: string })?.message ||
  'Service unavailable';

/** Fin du parcours OAuth : connexion au backend puis redirection, ou message à la fenêtre parente (popup) */
export const completeOauthLogin = async (event: H3Event, profile: OauthProfile): Promise<void> => {
  const { oauthFlow, redirectAfterLogin } = useRuntimeConfig(event).public.miindedOauth;

  if (oauthFlow !== 'popup') {
    await useBackendOauthLogin(event, profile);
    return sendRedirect(event, redirectAfterLogin);
  }

  try {
    await useBackendOauthLogin(event, profile);
    return popupResponse(event, { success: true, redirect: redirectAfterLogin });
  } catch (error) {
    return popupResponse(event, { success: false, error: errorMessage(error) });
  }
};

/** Échec côté fournisseur OAuth (refus, erreur) : retour à la connexion, ou message à la fenêtre parente */
export const failOauthLogin = (event: H3Event, error: unknown): Promise<void> => {
  const { oauthFlow, loginPath } = useRuntimeConfig(event).public.miindedOauth;
  if (oauthFlow === 'popup') {
    return popupResponse(event, { success: false, error: errorMessage(error) });
  }
  return sendRedirect(event, `${loginPath}?error=${encodeURIComponent(errorMessage(error))}`);
};
