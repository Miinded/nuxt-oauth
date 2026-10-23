import { appendResponseHeader, type H3Event } from 'h3';
import { parse, parseSetCookie, serialize } from 'cookie-es';
import { decode, type JwtData } from '@tsndr/cloudflare-worker-jwt';
import {
  defineNuxtRouteMiddleware,
  navigateTo,
  useNuxtApp,
  useRequestEvent,
  useRequestFetch,
  useRuntimeConfig,
} from '#app';
import { useUserSession } from '#imports';

/** Jeton expiré, ou illisible */
export const isExpired = (token: string): boolean => {
  try {
    const { payload } = decode(token) as JwtData;
    return !!payload?.exp && payload.exp < Date.now() / 1000;
  } catch {
    return true;
  }
};

const statusOf = (error: unknown): number | undefined =>
  (error as { statusCode?: number })?.statusCode ?? (error as { response?: { status?: number } })?.response?.status;

/**
 * Pendant le rendu serveur, reporte le cookie de session renouvelé sur la réponse et sur la requête en cours
 * (pour les appels suivants du même rendu), sans dupliquer les en-têtes.
 */
export const forwardSessionCookie = (serverEvent: H3Event, setCookies: string[], sessionName: string) => {
  const cookies = parse(serverEvent.headers.get('cookie') || '');
  for (const setCookie of setCookies) {
    const { name, value } = parseSetCookie(setCookie);
    if (name === sessionName) {
      cookies[name] = value;
      appendResponseHeader(serverEvent, 'Set-Cookie', setCookie);
    }
  }
  const cookieString = Object.entries(cookies)
    .map(([name, value]) => serialize(name, value))
    .join('; ');
  serverEvent.headers.set('cookie', cookieString);
  if (serverEvent.node?.req?.headers) {
    serverEvent.node.req.headers.cookie = cookieString;
  }
};

export default defineNuxtRouteMiddleware(async (to) => {
  const nuxtApp = useNuxtApp();
  // Rien à faire à l'hydratation d'une page rendue côté serveur : le serveur l'a déjà fait
  if (import.meta.client && nuxtApp.isHydrating && nuxtApp.payload.serverRendered) {
    return;
  }

  const runtimeConfig = useRuntimeConfig();
  const { loginPath, protectedRoutes } = runtimeConfig.public.miindedOauth;
  const isProtected = to.path !== loginPath && protectedRoutes.some((prefix) => to.path.startsWith(prefix));
  const { session, clear: clearSession, fetch: fetchSession } = useUserSession();

  if (!session.value?.jwt) {
    return isProtected ? navigateTo(loginPath) : undefined;
  }

  const { accessToken, refreshToken } = session.value.jwt;

  if (isExpired(accessToken) && isExpired(refreshToken)) {
    console.info('[nuxt-oauth] both tokens expired, clearing session');
    await clearSession();
    return isProtected ? navigateTo(loginPath) : undefined;
  }

  if (!isExpired(accessToken)) {
    return;
  }

  console.info('[nuxt-oauth] access token expired, refreshing');
  const serverEvent = useRequestEvent();
  try {
    await useRequestFetch()('/api/session-refresh', {
      method: 'POST',
      onResponse({ response }) {
        if (import.meta.server && serverEvent) {
          const sessionName = runtimeConfig.session?.name ?? 'nuxt-session';
          forwardSessionCookie(serverEvent as unknown as H3Event, response.headers.getSetCookie(), sessionName);
        }
      },
    });
    await fetchSession();
  } catch (error) {
    if (statusOf(error) === 401) {
      // Refresh token refusé : la session est terminée
      await clearSession();
      return isProtected ? navigateTo(loginPath) : undefined;
    }
    // Backend indisponible : on laisse l'interface s'afficher, les requêtes gèrent leurs erreurs
    console.warn('[nuxt-oauth] token refresh failed, backend unavailable:', (error as Error)?.message);
  }
});
