import {
  addImportsDir,
  addRouteMiddleware,
  addServerHandler,
  addServerImportsDir,
  addServerPlugin,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  installModule,
} from '@nuxt/kit';
import type { ModuleOptions, OauthProvider, PublicModuleOptions } from './types/module.type';

export type * from './types/module.type';

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'miinded-oauth',
    configKey: 'miindedOauth',
    compatibility: {
      nuxt: '>=4.0.0',
    },
  },
  defaults: {
    providers: {
      google: false,
      discord: false,
    },
    loginPath: '/login',
    protectedRoutes: [],
    oauthFlow: 'redirect',
    redirectAfterLogin: '/overview',
    hydrateUser: true,
  },

  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    const publicOptions: PublicModuleOptions = {
      providers: options.providers,
      loginPath: options.loginPath,
      protectedRoutes: options.protectedRoutes,
      oauthFlow: options.oauthFlow,
      redirectAfterLogin: options.redirectAfterLogin,
      hydrateUser: options.hydrateUser,
    };
    nuxt.options.runtimeConfig.public.miindedOauth = publicOptions;

    await installModule('nuxt-auth-utils', {}, nuxt);
    await installModule('@miinded/nuxt-api', {}, nuxt);

    addImportsDir(resolver.resolve('./runtime/composables'));
    addRouteMiddleware({
      name: 'jwt.global',
      path: resolver.resolve('./runtime/middleware/jwt.global'),
      global: true,
    });

    addServerPlugin(resolver.resolve('./runtime/server/plugins/session'));
    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/session-refresh.post'),
      route: '/api/session-refresh',
      method: 'post',
    });
    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/logout.post'),
      route: '/api/logout',
      method: 'post',
    });
    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/auth/providers.get'),
      route: '/api/auth/providers',
      method: 'get',
    });
    for (const provider of Object.keys(options.providers) as OauthProvider[]) {
      if (options.providers[provider]) {
        addServerHandler({
          handler: resolver.resolve(`./runtime/server/api/auth/${provider}.get`),
          route: `/api/auth/${provider}`,
          method: 'get',
        });
      }
    }
    addServerImportsDir(resolver.resolve('./runtime/server/services'));

    // Services serveur, aussi importables explicitement depuis le code Nitro de l'application
    const servicesPath = resolver.resolve('./runtime/server/services/useBackendOauthLogin');
    nuxt.options.alias['#miinded-oauth/server'] = servicesPath;
    addTypeTemplate(
      {
        filename: 'types/miinded-oauth-server.d.ts',
        getContents: () => `
declare module '#miinded-oauth/server' {
  export * from '${servicesPath}';
}

export {};
`,
      },
      { nitro: true, nuxt: false },
    );

    addTypeTemplate(
      {
        filename: 'types/miinded-oauth.d.ts',
        getContents: () => `
declare module 'nuxt/schema' {
  interface RuntimeConfig {
    /** URI du backend utilisée par le serveur Nitro (défaut : public.BACKEND_URI) */
    backendUri?: string;
    /** Clé d'API du backend pour POST /auth/oauth/login */
    oauthApiKey?: string;
  }
  interface PublicRuntimeConfig {
    BACKEND_URI?: string;
    miindedOauth: import('${resolver.resolve('./types/module.type')}').PublicModuleOptions;
  }
}

export {};
`,
      },
      { nitro: true, nuxt: true },
    );

    addTypeTemplate(
      {
        filename: 'types/miinded-auth-utils.d.ts',
        getContents: () => `
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
    /** Profil OAuth d'un utilisateur sans compte, en attente d'inscription */
    oauth?: {
      provider: string;
      datas: Record<string, unknown>;
    };
  }

  interface JWTToken {
    accessToken: string;
    refreshAccessToken: string;
  }

  type UserLogin = JWTToken & {
    user: User | null;
  };
}

export {};
`,
      },
      { nitro: true, nuxt: true },
    );
  },
});
