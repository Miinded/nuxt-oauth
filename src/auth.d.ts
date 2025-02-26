declare module '#auth-utils' {
  export interface User {
    id: string;
  }
  export interface UserSession {
    user?: User;
    jwt?: {
      accessToken: string;
      refreshToken: string;
    };
    oauth?: {
      provider: string; 
      datas: Record<string, any>;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface SecureSessionData {}

  export interface JWTToken {
    accessToken: string;
    refreshAccessToken: string;
  }

  export type UserLogin = JWTToken & {
    user: User;
  };
}
