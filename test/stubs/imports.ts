import { vi } from 'vitest';
import { ref } from 'vue';

// Remplace les imports virtuels de Nuxt et Nitro (`#imports`, `#app`) dans les tests unitaires (cf. vitest.config.ts).
// Chaque fonction est un vi.fn() que les tests configurent ; resetStubs() remet l'état de départ.

// Auto-importé par @miinded/nuxt-api dans une application ; même enum ici
export enum UseRawQueryOnErrorAction {
  REFRESH = 'REFRESH',
  CANCEL = 'CANCEL',
  NOTHING = 'NOTHING',
}

export const runtimeConfig = {
  backendUri: '',
  oauthApiKey: 'oauth-key',
  oauth: {} as Record<string, { clientId?: string }>,
  session: { name: 'nuxt-session' },
  public: {
    BACKEND_URI: 'https://api.example.test',
    miindedOauth: {
      providers: { google: false, discord: false },
      loginPath: '/login',
      protectedRoutes: [] as string[],
      oauthFlow: 'redirect' as 'redirect' | 'popup',
      redirectAfterLogin: '/overview',
      hydrateUser: true,
    },
  },
};
const defaults = JSON.stringify(runtimeConfig);

export const session = ref<Record<string, any>>({});

export const useRuntimeConfig = vi.fn(() => runtimeConfig);
export const getUserSession = vi.fn();
export const setUserSession = vi.fn();
export const replaceUserSession = vi.fn();
export const clearUserSession = vi.fn();
export const sessionHooks = { hook: vi.fn() };
export const defineNitroPlugin = <T>(plugin: T): T => plugin;
export const defineOAuthGoogleEventHandler = <T>(handler: T): T => handler;
export const defineOAuthDiscordEventHandler = <T>(handler: T): T => handler;

export const fetchSession = vi.fn();
export const clearSession = vi.fn();
export const useUserSession = vi.fn(() => ({ session, fetch: fetchSession, clear: clearSession }));
export const navigateTo = vi.fn((path: string) => `navigate:${path}`);
export const useQuery = vi.fn();
export const useMutation = vi.fn();

// #app
export const nuxtApp = { isHydrating: false, payload: { serverRendered: false } };
export const useNuxtApp = vi.fn(() => nuxtApp);
export const defineNuxtRouteMiddleware = <T>(middleware: T): T => middleware;
export const requestFetch = vi.fn();
export const useRequestFetch = vi.fn(() => requestFetch);
export const useRequestEvent = vi.fn(() => undefined);

export const resetStubs = () => {
  vi.clearAllMocks();
  Object.assign(runtimeConfig, JSON.parse(defaults));
  session.value = {};
  Object.assign(nuxtApp, { isHydrating: false, payload: { serverRendered: false } });
  useRequestEvent.mockReturnValue(undefined);
};
