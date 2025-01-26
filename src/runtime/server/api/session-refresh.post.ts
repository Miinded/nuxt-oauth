import { clearUserSession, getUserSession, replaceUserSession, useRuntimeConfig } from '#imports';
import { eventHandler, createError, sendRedirect } from 'h3';
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
    const response = await $fetch<UserLogin>(`${config.backendUri}/auth/refreshtoken`, {
      method: 'GET',
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
    console.error(error);
    await clearUserSession(event);
    await sendRedirect(event, '/');
  }
});
