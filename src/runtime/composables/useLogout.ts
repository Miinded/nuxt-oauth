import { navigateTo, useRuntimeConfig, useUserSession } from '#imports';

/** Déconnexion : révocation des jetons par le backend (/api/logout), session effacée, retour à la connexion */
export const useLogout = () => {
  const { clear } = useUserSession();
  const { loginPath } = useRuntimeConfig().public.miindedOauth;

  return async (): Promise<void> => {
    try {
      await $fetch('/api/logout', { method: 'POST' });
    } finally {
      await clear();
      await navigateTo(loginPath);
    }
  };
};
