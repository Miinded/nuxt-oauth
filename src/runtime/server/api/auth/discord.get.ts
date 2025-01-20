import { defineOAuthDiscordEventHandler, sendRedirect } from '#imports';
import { useBackendOauthLogin } from '../../services/useBackendOauthLogin';

export default defineOAuthDiscordEventHandler({
  config: {
    scope: ['identify', 'guilds'],
  },
  async onSuccess(event: any, { user }: any) {
    await useBackendOauthLogin(event, {
      provider: 'discord',
      identifier: user.id,
      email: '',
      givenName: '',
      familyName: '',
    });

    return sendRedirect(event, '/overview');
  },
});
