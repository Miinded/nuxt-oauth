import { defineOAuthGoogleEventHandler } from '#imports';
import { completeOauthLogin, failOauthLogin } from '../../services/useBackendOauthLogin';

export default defineOAuthGoogleEventHandler({
  onSuccess: (event, { user }) =>
    completeOauthLogin(event, {
      provider: 'google',
      identifier: user.sub,
      email: user.email,
      givenName: user.given_name,
      familyName: user.family_name,
    }),
  onError: failOauthLogin,
});
