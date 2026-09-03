# Deploying `eduplatform-admin`

Vite + React 19 SPA, built to static assets and served by nginx on port 80.

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.example.com/api \
  -t eduplatform-admin:latest .
docker run -p 8081:80 eduplatform-admin:latest
```

## The SPA needs `/api` proxied — or login returns 405

`VITE_API_BASE_URL` defaults to `/api`, so the app calls the backend
**same-origin**. `nginx/nginx.conf` therefore proxies `/api/` to the backend on
loopback (`127.0.0.1:8080`, reachable because both containers use
`network_mode: host`).

Without that proxy block the request falls through to the SPA history fallback,
nginx tries to answer a `POST /api/auth/login` with `index.html`, and static
files do not accept POST — so **login fails with 405 Method Not Allowed**, which
is easy to misread as a routing bug in the app.

If the backend's `SERVER_PORT` is not 8080, change the `proxy_pass` line in
`nginx/nginx.conf`. If instead you point `VITE_API_BASE_URL` at an absolute
backend origin, the proxy is unused and the backend's `CORS_ALLOWED_ORIGINS`
must then include this app's origin.

## Build-time env only

This is a static SPA: **every** `VITE_*` value is inlined at build time. There is
no runtime configuration — a new API URL means a new image.

`VITE_API_BASE_URL` is the one you must decide on:

- `/api` (the default, from `.env.production`) — correct when an upstream
  ingress proxies `/api` to the backend on the same origin. No CORS involved.
- `https://api.example.com/api` — correct when the API lives on its own origin.
  The backend's `CORS_ALLOWED_ORIGINS` must then include this app's origin.

Shell/`--build-arg` values take precedence over `.env.production`, so the
`--build-arg` above overrides the committed default.

Remaining knobs live in [.env.production](.env.production) — upload size limits,
token storage, feature flags. See [.env.example](.env.example) for the full list.

## Security posture

- `VITE_AUTH_BYPASS` (dev-only synthetic `SUPER_ADMIN`) is **hard-pinned to
  false in production builds** in `src/shared/config/env.ts`. Setting it true in
  a prod build environment has no effect.
- Security headers (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy)
  live in [nginx/security-headers.conf](nginx/security-headers.conf) and are
  `include`d by every `location` that sets a header of its own. This is required:
  nginx's `add_header` does **not** merge across levels — a `location` block
  containing any `add_header` discards all of the ones inherited from `server`,
  which previously left `/assets/` and `/index.html` with no security headers at
  all.
- `nginx -t` runs during the build, so a malformed config fails the build rather
  than the container.
- Tighten `connect-src` in the CSP to your real API origin before go-live; it is
  currently permissive (`http: https: ws: wss:`).

## Health

`GET /healthz` → `200 ok`, used by the Dockerfile `HEALTHCHECK` and suitable for
a load balancer.

## Caching

- `/assets/*` (content-hashed by Vite) → `Cache-Control: public, immutable`, 1 year.
- `/index.html` → `no-cache, no-store, must-revalidate`, so a deploy is picked up
  on the next navigation.
