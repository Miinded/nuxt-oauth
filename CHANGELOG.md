# Changelog

## 2.0.0

### Major Changes

- Published on npm from [GitHub](https://github.com/Miinded/nuxt-oauth) instead of the GitLab registry; ESM only.
- Requires Nuxt 4 (`compatibility.nuxt >= 4.0.0`); `nuxt`, `vue` and `pinia` are peer dependencies.
- The session cookie only stores the tokens and the user id; the full user is reloaded from `GET /auth/me` each time
  the session is read (`hydrateUser`, enabled by default). Fixes sessions rejected by browsers above 4 KB.
- `POST /api/session-refresh` answers `401` (session cleared) or `503` (backend unavailable) instead of redirecting.
- The unused `baseUrl` option is removed.

### Minor Changes

- `useAuthHandler` and `useLogout` composables; `POST /api/logout` revokes the tokens on the backend.
- `GET /api/auth/providers` lists the enabled and configured OAuth providers.
- `protectedRoutes`, `loginPath`, `oauthFlow` (`redirect` or `popup`) and `redirectAfterLogin` options.
- `useQueryAuth` and `useMutationAuth` accept every option of `@miinded/nuxt-api` 2 (reactive keys, `retry`).
- `#miinded-oauth/server` alias for the server utilities.

### Patch Changes

- A failed token renewal no longer escapes from the request as an unhandled rejection.
- A backend outage during navigation no longer logs the user out.
- The renewed session cookie is forwarded once during server-side rendering (no duplicate `Set-Cookie`).
- `cookie-es` and `axios`, imported by the runtime, are declared as dependencies.



## v1.4.0

[compare changes](https://gitlab.com/miinded/nuxt-oauth/compare/v1.3.1...v1.4.0)

### 🚀 Enhancements

- Add oauth management ([0ab9c5f](https://gitlab.com/miinded/nuxt-oauth/commit/0ab9c5f))

### 🩹 Fixes

- Type ([65af906](https://gitlab.com/miinded/nuxt-oauth/commit/65af906))

### ❤️ Contributors

- Starker-xp <starker-xp@miinded.com>

## v1.3.1

[compare changes](https://gitlab.com/miinded/nuxt-oauth/compare/v1.3.0...v1.3.1)

## v1.3.0

[compare changes](https://gitlab.com/miinded/nuxt-oauth/compare/v1.2.1...v1.3.0)

### 🚀 Enhancements

- UseQueryAuth ([7bdf52b](https://gitlab.com/miinded/nuxt-oauth/commit/7bdf52b))

### 🩹 Fixes

- Typo inferece ([af4c9ec](https://gitlab.com/miinded/nuxt-oauth/commit/af4c9ec))

### ❤️ Contributors

- Starker-xp <starker-xp@miinded.com>

## v1.2.1

[compare changes](https://gitlab.com/miinded/nuxt-oauth/compare/v1.2.0...v1.2.1)

### 🏡 Chore

- Update package.json ([5124b75](https://gitlab.com/miinded/nuxt-oauth/commit/5124b75))

### ❤️ Contributors

- Starker-xp <starker-xp@miinded.com>

## v1.2.0

[compare changes](https://undefined/undefined/compare/v1.1.0...v1.2.0)

### 🚀 Enhancements

- Change le typage (17e01ec)

### ❤️ Contributors

- Starker-xp <starker-xp@miinded.com>

## v1.1.0


### 🚀 Enhancements

- Init project (4329799)

### ❤️ Contributors

- Starker-xp <starker-xp@miinded.com>

