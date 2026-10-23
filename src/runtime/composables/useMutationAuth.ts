import type { ApiCacheKey, UseMutationReturn } from '@miinded/nuxt-api';
import { useMutation } from '#imports';
import type { UseMutationAuthOptions } from '../../types/module.type';
import { useAuthHandler } from './useAuthHandler';

export type UseMutationReturnAuth = UseMutationReturn;

/** useMutation avec le jeton de la session et son renouvellement automatique sur 401 */
export const useMutationAuth = (key: ApiCacheKey[], options: UseMutationAuthOptions = {}): UseMutationReturnAuth => {
  const { authToken, onErrorCallback } = useAuthHandler();
  return useMutation(key, { ...options, authToken, onErrorCallback });
};
