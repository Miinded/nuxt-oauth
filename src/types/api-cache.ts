import type { UseRawQueryOptions } from '@miinded/nuxt-api';

export type UseQueryAuthOptions<T> = Pick<UseRawQueryOptions<T>, 'fetchOnMount' | 'minDelay' | 'cacheDuration' | 'headers'>;

export type UseMutationAuthOptions = {
  minDelay?: number;
  cacheDuration?: number;
};
