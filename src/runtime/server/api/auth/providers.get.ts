import { eventHandler } from 'h3';
import { useRuntimeConfig } from '#imports';
import type { OauthProvider } from '../../../../types/module.type';

/** Fournisseurs OAuth utilisables : activés dans le module et configurés (runtimeConfig.oauth.<provider>.clientId) */
export default eventHandler((event): OauthProvider[] => {
  const config = useRuntimeConfig(event);
  const enabled = config.public.miindedOauth?.providers ?? {};
  const oauth = (config.oauth ?? {}) as Record<string, { clientId?: string } | undefined>;

  return (Object.keys(enabled) as OauthProvider[]).filter(
    (provider) => enabled[provider] && !!oauth[provider]?.clientId,
  );
});
