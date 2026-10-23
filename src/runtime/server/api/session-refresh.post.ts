import { createError, eventHandler } from 'h3';
import { clearUserSession, getUserSession, replaceUserSession } from '#imports';
import { backendStatus, refreshTokens } from '../utils/backend';

/**
 * Renouvelle les jetons de la session. Un refresh token refusé (401/403) efface la session et répond 401 ;
 * un backend indisponible répond 503 sans déconnecter l'utilisateur.
 */
export default eventHandler(async (event) => {
  const session = await getUserSession(event);
  if (!session.jwt?.refreshToken) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  try {
    const { accessToken, refreshAccessToken } = await refreshTokens(event, session.jwt.refreshToken);
    await replaceUserSession(event, { jwt: { accessToken, refreshToken: refreshAccessToken }, user: session.user });
    return accessToken;
  } catch (error) {
    const status = backendStatus(error);
    if (status === 401 || status === 403) {
      await clearUserSession(event);
      throw createError({ statusCode: 401, message: 'Session expired' });
    }
    console.error('[nuxt-oauth] token refresh failed:', (error as Error)?.message);
    throw createError({ statusCode: 503, message: 'Service temporarily unavailable' });
  }
});
