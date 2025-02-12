import { defineNuxtModule, createResolver, installModule, addImportsDir, addRouteMiddleware, addServerHandler, addServerImportsDir, addTypeTemplate } from '@nuxt/kit';
import type { ModuleOptions } from './types/module.type';
export * from './types/api-cache';
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

    await installModule('nuxt-auth-utils', {}, nuxt);

    await installModule('@miinded/nuxt-api', {}, nuxt);

    addImportsDir(resolver.resolve('./runtime/composables'));

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

    addTypeTemplate({
      filename: 'types/miinded-oauth.d.ts',
      getContents: () => `
      declare module '#miinded-oauth/server' {
        const useBackendOauthLogin: typeof import('${resolver.resolve('./runtime/server/services')}').useBackendOauthLogin; 
        export * from '${resolver.resolve('./runtime/composables')}';
      }
      export {};
      `,
    });

    addTypeTemplate({
      filename: 'types/miinded-auth-utils.d.ts',
      getContents: () => /* ts */ `
declare module '#auth-utils' {
  interface User {
    id: string;
  }

  interface UserSession {
    user?: User;
    jwt?: {
      accessToken: string;
      refreshToken: string;
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SecureSessionData {}

  interface JWTToken {
    accessToken: string;
    refreshAccessToken: string;
  }

  type UserLogin = JWTToken & {
    user: User;
  };
}

`,
    });
  },
});
