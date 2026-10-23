# @miinded/nuxt-oauth

[![npm version](https://img.shields.io/npm/v/@miinded/nuxt-oauth.svg)](https://www.npmjs.com/package/@miinded/nuxt-oauth)
[![license](https://img.shields.io/npm/l/@miinded/nuxt-oauth.svg)](./LICENSE)
[![Quality](https://github.com/Miinded/nuxt-oauth/actions/workflows/quality.yml/badge.svg)](https://github.com/Miinded/nuxt-oauth/actions/workflows/quality.yml)
[![codecov](https://codecov.io/gh/Miinded/nuxt-oauth/graph/badge.svg)](https://codecov.io/gh/Miinded/nuxt-oauth)
[![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js)](https://nuxt.com)

A [Nuxt](https://nuxt.com) module that manages **JWT sessions issued by a Miinded backend**: token renewal,
authenticated API composables, logout with token revocation, route protection and Google / Discord OAuth login.

It builds on [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) (sealed session cookie) and
[@miinded/nuxt-api](https://github.com/Miinded/nuxt-api) (cached API composables), both installed with it.

## Features

- `useQueryAuth` / `useMutationAuth` — API composables that send the access token and, on a `401`, renew the tokens
  and replay the request.
- Global route middleware that renews an expired access token (also during server-side rendering) and redirects to the
  login page on protected routes.
- **Small session cookie**: only the tokens and the user id are stored; the full user is reloaded from the backend
  each time the session is read, so the cookie never exceeds the 4 KB browsers accept.
- `useLogout` and `POST /api/logout`: the backend revokes the tokens before the session is cleared.
- Google and Discord OAuth, with a full-page redirect or a popup flow.
- A backend outage never logs the user out: requests fail, the session stays.

## Requirements

| Package | Version |
| ------- | ------- |
| Node.js | `>= 24` |
| Nuxt    | `4`     |
| Vue     | `3.5`   |
| Pinia   | `3`     |

The backend must expose the following routes (the Miinded backend does):

| Route                    | Used for                                                    |
| ------------------------ | ----------------------------------------------------------- |
| `GET /auth/refreshtoken` | Renew the tokens (`Authorization: Bearer <refresh token>`)  |
| `GET /auth/me`           | Current user (`Authorization: Bearer <access token>`)       |
| `POST /auth/logout`      | Revoke the refresh token and the issued access tokens       |
| `POST /auth/oauth/login` | OAuth login (`apiKey` header); `user: null` when no account |

## Installation

```bash
pnpm add @miinded/nuxt-oauth pinia
# or
npm install @miinded/nuxt-oauth pinia
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@miinded/nuxt-oauth'],
  miindedOauth: {
    loginPath: '/login',
    protectedRoutes: ['/admin'],
    providers: { google: true, discord: false },
  },
  runtimeConfig: {
    backendUri: '', // NUXT_BACKEND_URI — backend URL for the Nitro server (defaults to public.BACKEND_URI)
    oauthApiKey: '', // NUXT_OAUTH_API_KEY — API key of POST /auth/oauth/login
    session: { password: '' }, // NUXT_SESSION_PASSWORD — 32+ characters, seals the session cookie
    oauth: {
      google: { clientId: '', clientSecret: '' }, // NUXT_OAUTH_GOOGLE_CLIENT_ID / _SECRET
    },
    public: {
      BACKEND_URI: '', // NUXT_PUBLIC_BACKEND_URI — backend URL for the browser
    },
  },
});
```

### Module options

| Option               | Type                                    | Default       | Description                                                             |
| -------------------- | --------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| `providers`          | `{ google: boolean; discord: boolean }` | both `false`  | Exposes `/api/auth/google` and `/api/auth/discord`                      |
| `loginPath`          | `string`                                | `'/login'`    | Target of the redirects when the session is missing or expired          |
| `protectedRoutes`    | `string[]`                              | `[]`          | Route prefixes that require a session (`[]`: no redirect)               |
| `oauthFlow`          | `'redirect' \| 'popup'`                 | `'redirect'`  | After an OAuth login: redirect the page, or message the opener window   |
| `redirectAfterLogin` | `string`                                | `'/overview'` | Destination after a successful OAuth login                              |
| `hydrateUser`        | `boolean`                               | `true`        | Reload the user from `GET /auth/me` instead of storing it in the cookie |

## Usage

### Authenticated requests

```ts
// same signatures as useQuery / useMutation of @miinded/nuxt-api
const { data: collections } = useQueryAuth<Collection[]>('/collections', ['collections']);

const { put, isError, error } = useMutationAuth(['collection', id]);
await put(`/collection/${id}`, { name: 'New name' });
```

On a `401`, the tokens are renewed through `POST /api/session-refresh` and the request is replayed. If the refresh
token is refused, the session is cleared and the user is sent to `loginPath`; if the backend is unavailable, the
original error is exposed and the session is kept.

`useAuthHandler()` returns the `authToken` header and the `onErrorCallback` used by these composables, to build other
authenticated calls.

### Session and route protection

The global `jwt` middleware runs on every navigation:

- no session on a route matching `protectedRoutes` → redirect to `loginPath`;
- expired access token → renewal (the new cookie is forwarded during server-side rendering);
- both tokens expired, or refresh refused → session cleared, redirect to `loginPath` on protected routes;
- backend unavailable → the page is rendered, requests handle their own errors.

The user is read with `useUserSession()` from nuxt-auth-utils. With `hydrateUser`, the cookie only holds
`{ jwt, user: { id } }` and the full user returned by `GET /auth/me` is added each time the session is read.

### Logout

```ts
const logout = useLogout();
await logout(); // POST /api/logout (revokes the tokens), clears the session, navigates to loginPath
```

### OAuth login

With `oauthFlow: 'redirect'`, link to `/api/auth/google` (or `/api/auth/discord`); the provider redirects back,
the module logs the user in and redirects to `redirectAfterLogin`. A provider error redirects to
`loginPath?error=<message>`.

With `oauthFlow: 'popup'`, open the route in a popup and listen for its message:

```ts
const { data: providers } = await useFetch('/api/auth/providers'); // ['google'] — enabled and configured

const loginWith = (provider: string) => {
  window.open(`/api/auth/${provider}`, 'oauth', 'width=500,height=700');
  window.addEventListener(
    'message',
    async (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.success) {
        await useUserSession().fetch();
        await navigateTo(event.data.redirect);
      } else {
        showError(event.data.error);
      }
    },
    { once: true },
  );
};
```

When the backend has no account for the OAuth identity (`user: null`), the profile is kept in
`session.oauth = { provider, datas }` to complete the sign-up.

### Server utilities

`useBackendOauthLogin(event, profile)`, `completeOauthLogin`, `failOauthLogin` and `popupResponse` are auto-imported in
the Nitro server, and importable from `#miinded-oauth/server`, to write other OAuth handlers.

## Migrating from 1.x

- Nuxt 4 is required; `nuxt`, `vue` and `pinia` are peer dependencies. The package is ESM only.
- The session cookie only holds the user id (`hydrateUser: true`); the full user comes from `GET /auth/me`. Set
  `hydrateUser: false` to keep the previous behaviour.
- `POST /api/session-refresh` answers `401` (session cleared) or `503` (backend unavailable) instead of redirecting
  to `/`.
- The unused `baseUrl` option is removed; `oauthApiKey` and `backendUri` are read from `runtimeConfig`, as before.
- The OAuth redirect target is configurable (`redirectAfterLogin`, still `/overview` by default).
- `useQueryAuth` accepts reactive and numeric cache keys and the `retry` option of `@miinded/nuxt-api`.
- `#miinded-oauth/server` is now a real alias (it was only declared in the types).
- New: `useAuthHandler`, `useLogout`, `POST /api/logout`, `GET /api/auth/providers`, `protectedRoutes`, `oauthFlow`.
- Published on npm: remove the GitLab registry lines (`@miinded:registry=…`) from your `.npmrc`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
