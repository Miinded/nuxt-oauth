import type { AxiosError } from 'axios';
import type { ApiCacheKey, UseMutationReturn, UseRawQueryOnErrorAction } from '@miinded/nuxt-api';
import { computed, toValue } from 'vue';
import { useMutation, useUserSession } from '#imports';
import type { UseMutationAuthOptions } from '../../types/api-cache';

export type UseMutationReturnAuth = UseMutationReturn;

export const useMutationAuth = (key: ApiCacheKey[], options: UseMutationAuthOptions = {}): UseMutationReturnAuth => {
  const { session, fetch: fetchSession } = useUserSession();

  const authToken = computed(() => ({
    Authorization: 'Bearer ' + toValue(session).jwt.accessToken,
  }));

  const onErrorCallback = async (err: AxiosError): Promise<UseRawQueryOnErrorAction> => {
    if (err.response) {
      if (err.response.status === 401) {
        // on refresh le token et on refetch
        await $fetch('/api/session-refresh', {
          method: 'POST',
        });
        await fetchSession();
        // on lance le refresh de la query
        return 'REFRESH';
      }
    }
    return 'NOTHING';
  };

  const mutation: UseMutationReturn = useMutation(key, {
    ...options,
    authToken,
    onErrorCallback,
  });

  return {
    ...mutation,
  };
};
