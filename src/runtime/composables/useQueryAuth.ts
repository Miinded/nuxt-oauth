import type { ComputedRef, Ref } from 'vue';
import type { ApiCacheKey, UseQueryReturn } from '@miinded/nuxt-api';
import { useQuery } from '#imports';
import type { UseQueryAuthOptions } from '../../types/module.type';
import { useAuthHandler } from './useAuthHandler';

/** useQuery avec le jeton de la session et son renouvellement automatique sur 401 */
export const useQueryAuth = <T>(
  url: string | Ref<string> | ComputedRef<string>,
  key: ApiCacheKey[],
  initialValue?: T,
  options: UseQueryAuthOptions<T> = {},
): UseQueryReturn<T> => {
  const { authToken, onErrorCallback } = useAuthHandler();
  return useQuery<T>(url, key, initialValue, { ...options, authToken, onErrorCallback });
};
