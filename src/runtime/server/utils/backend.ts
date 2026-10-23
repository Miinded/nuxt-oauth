import type { H3Event } from 'h3';
import { $fetch } from 'ofetch';
import type { JWTToken, User, UserLogin } from '#auth-utils';
import { useRuntimeConfig } from '#imports';

type BackendOptions = { method?: 'GET' | 'POST'; token?: string; apiKey?: string; body?: Record<string, unknown> };

/** URI du backend : runtimeConfig.backendUri (privé), sinon runtimeConfig.public.BACKEND_URI */
export const backendUri = (event: H3Event): string => {
  const config = useRuntimeConfig(event);
  return (config.backendUri || config.public.BACKEND_URI || '') as string;
};

/** Appel au backend Miinded depuis le serveur Nitro */
export const backendFetch = <T>(event: H3Event, path: string, options: BackendOptions = {}): Promise<T> =>
  $fetch<T>(path, {
    baseURL: backendUri(event),
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.apiKey ? { apiKey: options.apiKey } : {}),
    },
    ...(options.body ? { body: options.body } : {}),
  });

/** Code HTTP renvoyé par le backend, ou undefined s'il n'a pas répondu (réseau, timeout) */
export const backendStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status ?? (error as { statusCode?: number })?.statusCode;

/** Renouvelle la paire de jetons à partir du refresh token */
export const refreshTokens = (event: H3Event, refreshToken: string) =>
  backendFetch<JWTToken>(event, '/auth/refreshtoken', { token: refreshToken });

/** Utilisateur courant tel que renvoyé par le backend */
export const fetchMe = (event: H3Event, accessToken: string) =>
  backendFetch<User>(event, '/auth/me', { token: accessToken });

/**
 * Utilisateur à stocker dans le cookie de session : son identité seule quand hydrateUser est actif (le reste est
 * rechargé à chaque lecture de session, cf. plugins/session), l'utilisateur complet sinon.
 */
export const sessionUser = (event: H3Event, user: User): User =>
  useRuntimeConfig(event).public.miindedOauth?.hydrateUser === false ? user : { id: user.id };

export type { UserLogin };
