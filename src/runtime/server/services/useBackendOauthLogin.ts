import { type H3Event, createError } from 'h3';
import { setUserSession, useRuntimeConfig } from '#imports';
import type { UserLogin } from '#auth-utils';

/**
 * @param {H3Event} event - The event object passed to the Nuxt event handler
 * @return {Promise<UserLogin>} - A Promise that resolves to the Stripe server instance for the event context
 */
export const useBackendOauthLogin = async (event: H3Event, datas: RequestInit['body'] | Record<string, any>): Promise<UserLogin> => {
  const config = useRuntimeConfig(event);

  try {
    // @todo config.miindedOauth.loginUri
    const result = await $fetch<UserLogin>(`${config.backendUri}/auth/oauth/login`, {
      method: 'POST',
      headers: {
        apiKey: config.oauthApiKey, // Utilisation de l'en-tête 'x-api-key'
        'Content-Type': 'application/json',
      },
      body: datas,
    });

    if(result.user === null){
      const body = datas as Record<string, any>; 
      await setUserSession(event, {
        oauth:  {
          provider: body.provider,
          datas: body,
        }
      });
      return result;
    }

    await setUserSession(event, {
      jwt: {
        accessToken: result.accessToken,
        refreshToken: result.refreshAccessToken,
      },
      user: result.user,
    });

    return result;
  } catch (error: any) {
    if (error.response) {
      throw createError({
        statusCode: error.response?.status || 500,
        statusMessage: error.response?._data?.message || 'Une erreur est survenue',
      });
    }

    throw createError({
      statusCode: 503,
      statusMessage: 'Service unavailable',
    });
  }
};
