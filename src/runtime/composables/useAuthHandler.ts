import { computed, toValue, type ComputedRef } from 'vue';
import type { AxiosError } from 'axios';
import type { UseRawQueryHeaders, UseRawQueryOnErrorActionType } from '@miinded/nuxt-api';
import { UseRawQueryOnErrorAction, navigateTo, useRuntimeConfig, useUserSession } from '#imports';

export type UseAuthHandlerReturn = {
  /** En-tête Authorization du jeton d'accès de la session ({} sans session) */
  authToken: ComputedRef<UseRawQueryHeaders>;
  /** Sur un 401 : renouvelle les jetons puis rejoue la requête ; jetons refusés : retour à la connexion */
  onErrorCallback: (error: AxiosError) => Promise<UseRawQueryOnErrorActionType>;
};

const statusOf = (error: unknown): number | undefined =>
  (error as { statusCode?: number; status?: number })?.statusCode ?? (error as { status?: number })?.status;

/** Authentification JWT partagée par useQueryAuth et useMutationAuth */
export const useAuthHandler = (): UseAuthHandlerReturn => {
  const { session, fetch: fetchSession, clear } = useUserSession();
  const { loginPath } = useRuntimeConfig().public.miindedOauth;

  const authToken = computed((): UseRawQueryHeaders => {
    const accessToken = toValue(session)?.jwt?.accessToken;
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  });

  const onErrorCallback = async (error: AxiosError): Promise<UseRawQueryOnErrorActionType> => {
    if (error.response?.status !== 401) {
      return UseRawQueryOnErrorAction.NOTHING;
    }
    try {
      await $fetch('/api/session-refresh', { method: 'POST' });
      await fetchSession();
      return UseRawQueryOnErrorAction.REFRESH;
    } catch (refreshError) {
      if (statusOf(refreshError) === 401) {
        await clear();
        await navigateTo(loginPath);
        return UseRawQueryOnErrorAction.CANCEL;
      }
      // Backend indisponible : l'erreur d'origine est exposée normalement
      return UseRawQueryOnErrorAction.NOTHING;
    }
  };

  return { authToken, onErrorCallback };
};
