import { eventHandler } from 'h3';
import { clearUserSession, getUserSession } from '#imports';
import { backendFetch } from '../utils/backend';

/**
 * Déconnexion : prévient le backend avant d'effacer la session pour qu'il révoque le refresh token et les jetons
 * d'accès déjà émis (sinon un jeton copié reste utilisable jusqu'à son expiration). Un échec du backend
 * n'empêche jamais la déconnexion locale.
 */
export default eventHandler(async (event) => {
  const session = await getUserSession(event);
  const token = session.jwt?.refreshToken || session.jwt?.accessToken;
  if (token) {
    try {
      await backendFetch(event, '/auth/logout', { method: 'POST', token });
    } catch (error) {
      console.error('[nuxt-oauth] backend logout failed:', (error as Error)?.message);
    }
  }
  await clearUserSession(event);
  return { ok: true };
});
