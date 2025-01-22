export interface ModuleOptions {
  baseUrl: string;
  oauthApiKey?: string;
  providers: {
    google: boolean;
    discord: boolean;
  };
}
