import { computed, toValue, type ComputedRef, type Ref } from 'vue';
import type { AxiosError } from 'axios';
import { useQuery, useUserSession } from '#imports';
import type { UseQueryAuthOptions } from '../../types/api-cache';
import type { UseRawQueryOnErrorAction } from '@miinded/nuxt-api';

export const useQueryAuth = <T>(_url: string | Ref<string> | ComputedRef<string>, key: string[], initialValue?: T, _options?: UseQueryAuthOptions<T>) => {
  const options: UseQueryAuthOptions<T> = { fetchOnMount: true, minDelay: 0, headers: {}, cacheDuration: undefined, ..._options };

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
        return 'REFRESH' as UseRawQueryOnErrorAction;
      }
    }
    return 'NOTHING' as UseRawQueryOnErrorAction;
  };

  const query = useQuery(_url, key, initialValue, {
    ...options,
    authToken,
    onErrorCallback,
  });

  return {
    ...query,
  };
};
