// types/nuxt-auth-utils.d.ts

declare module '#auth-utils' {
  export interface User {
    id: string;
  }

  export interface JWTToken {
    accessToken: string;
    refreshAccessToken: string;
  }

  export type UserLogin = JWTToken & {
    user: User;
  };
}

export interface ModuleOptions {
  baseUrl: string;
  oauthApiKey?: string;
  providers: {
    google: boolean;
    discord: boolean;
  };
}
