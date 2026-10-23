import { defineOAuthDiscordEventHandler } from '#imports';
import { completeOauthLogin, failOauthLogin } from '../../services/useBackendOauthLogin';

export default defineOAuthDiscordEventHandler({
  config: {
    scope: ['identify', 'guilds'],
  },
  onSuccess: (event, { user }) =>
    completeOauthLogin(event, {
      provider: 'discord',
      identifier: user.id,
      email: '',
      givenName: '',
      familyName: '',
    }),
  onError: failOauthLogin,
});
