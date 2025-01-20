declare module '#auth-utils' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface User {}

  interface UserSession {
    user?: User;
    jwt?: {
      accessToken: string;
      refreshToken: string;
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SecureSessionData {}
}
