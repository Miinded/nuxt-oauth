import { defineOAuthGoogleEventHandler, sendRedirect } from '#imports';
import { useBackendOauthLogin } from '../../services/useBackendOauthLogin';

export default defineOAuthGoogleEventHandler({
  async onSuccess(event: any, { user }: any) {
    await useBackendOauthLogin(event, {
      provider: 'google',
      identifier: user.sub,
      email: user.email,
      givenName: user.given_name,
      familyName: user.family_name,
    });

    return sendRedirect(event, '/overview');
  },
});
