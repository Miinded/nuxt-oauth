import type { H3Event } from 'h3';
import type { UserSession } from '#auth-utils';
import { defineNitroPlugin, replaceUserSession, sessionHooks, useRuntimeConfig } from '#imports';
import { backendStatus, fetchMe, refreshTokens } from '../utils/backend';

/**
 * Complète la session lue par le client (/api/_auth/session, y compris au rendu serveur) avec l'utilisateur
 * complet du backend : le cookie n'en garde que l'identité (cf. utils/backend sessionUser).
 */
export const hydrateSession = async (session: UserSession, event: H3Event): Promise<void> => {
  if (useRuntimeConfig(event).public.miindedOauth?.hydrateUser === false || !session.jwt?.accessToken) {
    return;
  }

  try {
    session.user = await fetchMe(event, session.jwt.accessToken);
    return;
  } catch (error) {
    // Backend indisponible : on garde l'identité du cookie plutôt que de déconnecter l'utilisateur
    if (backendStatus(error) !== 401 || !session.jwt.refreshToken) {
      return;
    }
  }

  // Jeton d'accès expiré : renouvellement, puis nouvelle lecture de l'utilisateur
  try {
    const { accessToken, refreshAccessToken } = await refreshTokens(event, session.jwt.refreshToken);
    session.jwt = { accessToken, refreshToken: refreshAccessToken };
    await replaceUserSession(event, { jwt: session.jwt, user: session.user });
    session.user = await fetchMe(event, accessToken);
  } catch {
    // Renouvellement refusé : le client repasse par la connexion
    delete session.user;
  }
};

export default defineNitroPlugin(() => {
  sessionHooks.hook('fetch', hydrateSession);
});
