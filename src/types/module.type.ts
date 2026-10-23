import type { UseMutationOptions, UseQueryOptions } from '@miinded/nuxt-api';

export type OauthProvider = 'google' | 'discord';

export interface ModuleOptions {
  /** Fournisseurs OAuth exposés sur /api/auth/<provider> */
  providers: Record<OauthProvider, boolean>;
  /** Page de connexion, cible des redirections quand la session est absente ou expirée */
  loginPath: string;
  /** Préfixes de routes réservées aux utilisateurs connectés (ex. ['/admin']) ; [] = aucune redirection */
  protectedRoutes: string[];
  /** Après une connexion OAuth : redirection de la page, ou fenêtre popup qui prévient sa fenêtre parente */
  oauthFlow: 'redirect' | 'popup';
  /** Destination après une connexion OAuth réussie */
  redirectAfterLogin: string;
  /**
   * Recharge l'utilisateur depuis le backend (GET /auth/me) à chaque lecture de session au lieu de le stocker
   * dans le cookie, que les navigateurs refusent au-delà de 4 Ko.
   */
  hydrateUser: boolean;
}

/** Options exposées au runtime (runtimeConfig.public.miindedOauth) */
export type PublicModuleOptions = Pick<
  ModuleOptions,
  'providers' | 'loginPath' | 'protectedRoutes' | 'oauthFlow' | 'redirectAfterLogin' | 'hydrateUser'
>;

/** Options de useQueryAuth : celles de useQuery, sans authToken ni onErrorCallback (gérés par le module) */
export type UseQueryAuthOptions<T> = Omit<UseQueryOptions<T>, 'authToken' | 'onErrorCallback'>;

/** Options de useMutationAuth : celles de useMutation, sans authToken ni onErrorCallback (gérés par le module) */
export type UseMutationAuthOptions = Omit<UseMutationOptions, 'authToken' | 'onErrorCallback'>;
