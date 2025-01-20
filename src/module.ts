import { defineNuxtModule, createResolver, installModule, addImportsDir, addRouteMiddleware, addServerHandler, addTemplate, addServerImportsDir } from '@nuxt/kit';
import type { ModuleOptions } from './types/nuxt-auth-utils';
export * from 'nuxt-auth-utils';

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'miinded-oauth',
    configKey: 'miindedOauth',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    baseUrl: '',
    providers: {
      google: false,
      discord: false,
    },
  },

  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    addImportsDir(resolver.resolve('./runtime/composables'));

    await installModule('nuxt-auth-utils', {}, nuxt);

    // Middleware
    addRouteMiddleware({
      name: 'jwt.global',
      path: resolver.resolve('./runtime/middleware/jwt.global'),
      global: true,
    });

    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/session-refresh.post'),
      route: '/api/session-refresh',
      method: 'post',
    });

    if (options.providers.discord) {
      addServerHandler({
        handler: resolver.resolve('./runtime/server/api/auth/discord.get'),
        route: '/api/auth/discord',
        method: 'get',
      });
    }

    if (options.providers.google) {
      addServerHandler({
        handler: resolver.resolve('./runtime/server/api/auth/google.get'),
        route: '/api/auth/google',
        method: 'get',
      });
    }
    addServerImportsDir(resolver.resolve('./runtime/server/services'));

    addTemplate({
      filename: 'types/miinded-oauth.d.ts',
      getContents: () => ["declare module '#miinded-oauth/server' {", `  const useBackendOauthLogin: typeof import('${resolver.resolve('./runtime/server/services')}').useBackendOauthLogin`, '}'].join('\n'),
    });
  },
});
