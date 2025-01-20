// import { getUserSession, replaceUserSession, useRuntimeConfig } from '#imports';
import { getUserSession, replaceUserSession, useRuntimeConfig } from '#imports';
import { eventHandler, createError } from 'h3';
import type { UserLogin } from '#auth-utils';

export default eventHandler(async (event) => {
  const session = await getUserSession(event);
  if (!session.jwt?.accessToken && !session.jwt?.refreshToken) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }
  const config = useRuntimeConfig(event);
  const token = session.jwt.refreshToken;

  try {
    const response = await $fetch<UserLogin>(`${config.backendUri}/auth/oauth/login`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const { accessToken, refreshAccessToken: refreshToken } = response;

    await replaceUserSession(event, {
      jwt: {
        accessToken,
        refreshToken,
      },
      user: session.user,
    });

    return accessToken;
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
});
