# Deploying `eduplatform-admin`

Vite + React 19 SPA, built to static assets and served by nginx on port **8081**
(not 80 — see [TLS / reverse proxy](#tls--reverse-proxy) and the note in
`nginx/nginx.conf`).

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.example.com/api \
  -t eduplatform-admin:latest .
docker run -p 127.0.0.1:8081:8081 eduplatform-admin:latest
```

In production use the compose file instead — it pins host networking, logging
and the healthcheck:

```bash
docker compose -f docker-compose.prod.yml up -d --build
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

## Live notifications need `/ws` proxied too

The notification stream is STOMP over WebSocket. The SPA derives its URL from
`VITE_API_BASE_URL` by stripping the trailing `/api`, so with the same-origin
default it connects to `wss://dashboard-trainings.aztu.edu.az/ws` — **the server
root, not under `/api`**. `nginx/nginx.conf` has a dedicated `location /ws`
block for it.

Two things fail silently if this is misconfigured, because the STOMP client
swallows WebSocket errors and reconnects forever:

- **No `/ws` location** — the handshake hits the history fallback, gets
  `index.html` with a 200, and never upgrades.
- **This origin missing from the backend's `CORS_ALLOWED_ORIGINS`** — Spring
  origin-checks the WebSocket handshake against that same list even though REST
  needs no CORS entry here. Add `https://dashboard-trainings.aztu.edu.az` to
  `CORS_ALLOWED_ORIGINS` in the API's `.env`.

## Upload sizes: three numbers that must agree

Lesson videos are uploaded as **one** request — `PUT /api/videos/{id}/content`
with `xhr.send(file)`, there is no chunking — so every layer has to accept the
whole file:

| Where | Setting | Value |
| --- | --- | --- |
| nginx (`nginx/nginx.conf`, `location /api/`) | `client_max_body_size` | `550m` |
| backend `.env` | `UPLOAD_MAX_VIDEO_MB` | `512` |
| this repo's `.env.production` | `VITE_UPLOAD_MAX_VIDEO_MB` | `512` |

nginx must stay **above** the backend ceiling: it is the outermost limit, and a
request it rejects never reaches the backend's own validation, so the user gets
an opaque 413 instead of a typed error. The ~38 MB of headroom covers multipart
framing and headers. Images (`10`) and documents (`25`) are far below this and
need no separate nginx rule.

Two related settings in the same block, both about slow connections rather than
large ones:

- `client_body_timeout 300s` — the gap allowed *between* reads of the body, not
  a total budget. A 512 MB upload over a 2 Mbit/s link takes ~35 minutes and
  nothing here bounds that, as long as bytes keep arriving.
- `proxy_request_buffering off` — the body streams to the backend instead of
  being spooled to `client_temp` first. Without it nginx writes the full 512 MB
  to disk before the backend sees byte one, and an unauthenticated client could
  fill the container's writable layer with bodies the backend would have
  rejected with 401. If you ever need to revert it, provision at least ~1 GB of
  free space in the container.

A fourth limit sits outside this repo: whatever terminates TLS in front also caps
the request body, and defaults to far less than 550 MB. See
[TLS / reverse proxy](#tls--reverse-proxy).

Changing `VITE_UPLOAD_MAX_VIDEO_MB` requires a **rebuild** (`up -d --build`),
not a restart — see below.

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

## TLS / reverse proxy

**Nothing in this repo terminates TLS.** The container listens on plain HTTP on
`8081` under host networking. The host's nginx serves
`https://dashboard-trainings.aztu.edu.az` and proxies to `127.0.0.1:8081`. Its
config for all three hostnames lives in the API repo, as
`deploy/nginx/trainings.conf` (on the server:
`/opt/trainings/api-trainings.aztu.edu.az/deploy/nginx/trainings.conf`), and that
repo's `docs/operations/deployment.md` §6 installs it. Use it as it is. The
requirements below explain why its dashboard block looks the way it does, and
what any other terminator would have to match.

What the terminator must do for this portal. All three were missing on the live
server while its dashboard vhost was a bare `proxy_pass`:

- **Pass the WebSocket upgrade.** The notification socket is
  `wss://dashboard-trainings.aztu.edu.az/ws`, and it goes through the terminator
  before it reaches this container's `location /ws`. nginx proxies with HTTP/1.0
  and drops `Upgrade` and `Connection` by default, so the backend answered the
  handshake with `400 Can "Upgrade" only to "WebSocket"` and notifications never
  connected. It needs `proxy_http_version 1.1;`,
  `proxy_set_header Upgrade $http_upgrade;`,
  `proxy_set_header Connection <upgrade when Upgrade is present>;` (a `map`, as in
  `nginx/nginx.conf`), and a `proxy_read_timeout` longer than the 10s heartbeat
  gap (the host config uses 3600s). Setting any `proxy_set_header` in a location
  discards the inherited ones, so `Host`, `X-Real-IP`, `X-Forwarded-For` and
  `X-Forwarded-Proto` have to be repeated next to them.
- **Allow the same request body size.** This nginx allows `550m`, but the
  terminator is the *outer* limit, and stock nginx allows 1 MB. Every cover over
  1 MB, every document and every lesson video was rejected there with a 413 that
  never appears in this container's logs and never reaches the backend's typed
  error. Give it `client_max_body_size 550m; client_body_timeout 300s;` and
  `proxy_request_buffering off;` so it does not spool half a gigabyte to disk
  before this container sees byte one. See
  [Upload sizes](#upload-sizes-three-numbers-that-must-agree).
- **Serve HSTS** for this host. It is deliberately not set in this repo: whether
  a host can be pinned to HTTPS is decided where TLS is. The host config sends
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` on every
  response and hides the backend's copy on `/api/`, so each response has exactly
  one. On this host `includeSubDomains` covers only names under
  `dashboard-trainings.aztu.edu.az`. The case to avoid is the one that takes
  other services down: a terminator that also serves the apex `aztu.edu.az`, or
  one shared wildcard vhost, sending `includeSubDomains` there would pin every
  *sibling* subdomain too, and any `*.aztu.edu.az` service still on plain HTTP
  would become unreachable in every browser that saw it.

What this config needs **from** that terminator:

- `X-Forwarded-Proto` — `nginx/nginx.conf` prefers it over `$scheme` (which is
  always `http` here) and passes it on. The backend believes it from a loopback
  peer (Tomcat's `RemoteIpValve`, `server.forward-headers-strategy=native`), so
  without it Spring believes the request arrived over plain HTTP.
- `X-Forwarded-For`, **and its address added to `set_real_ip_from`** in
  `nginx/nginx.conf` if it is not on loopback. That list is the trust boundary:
  nginx rewrites `$remote_addr` from the forwarded header only for proxies in it,
  and then sends the backend a single, clean `X-Forwarded-For: $remote_addr`. The
  backend reads that header right to left and trusts only loopback and
  private-range peers (see "Client IP" in the API's `DEPLOY.md`), and its rate
  limiter, IP blocklist and audit log key on the result. If the terminator runs
  on another machine and you forget to list it, every request looks like it
  comes from the load balancer and one user's traffic rate-limits everyone.

While the portal is still plain HTTP the notification socket is `ws://`, not
`wss://`. The SPA CSP allows that — `connect-src 'self'` covers a same-host,
same-port `ws:` URL under CSP3 — so nothing needs loosening for the interim. Note
that the extra literal `wss://dashboard-trainings.aztu.edu.az` in
[nginx/security-headers.conf](nginx/security-headers.conf) carries no port and so
only ever matches 443; replace it if the portal is served from another hostname.

Until TLS is in place, restrict 8081 with UFW (`ufw allow from <proxy> to any
port 8081`). Host networking is used precisely so UFW governs this port — see
the header of `docker-compose.prod.yml`.

## Security posture

- `VITE_AUTH_BYPASS` (dev-only synthetic `SUPER_ADMIN`) is **hard-pinned to
  false in production builds** in `src/shared/config/env.ts`. Setting it true in
  a prod build environment has no effect.
- Security headers live in three snippets, because the SPA shell and the proxied
  API need different content policies:
  - [nginx/security-headers-common.conf](nginx/security-headers-common.conf) —
    `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`,
    `Cross-Origin-Opener-Policy`, `X-Robots-Tag: noindex, nofollow`. Both of the
    others include it.
  - [nginx/security-headers.conf](nginx/security-headers.conf) — the SPA CSP.
  - [nginx/api-headers.conf](nginx/api-headers.conf) — the `/api/` CSP.

  Every `location` that sets a header of its own `include`s one of them. This is
  required: nginx's `add_header` does **not** merge across levels — a `location`
  block containing any `add_header` discards all of the ones inherited from
  `server`. The flip side used to bite here too: `/api/` declared no header of
  its own and so was silently inheriting the *app shell's* CSP.
- **The SPA CSP is now restrictive.** `connect-src` was `'self' http: https: ws:
  wss:`, i.e. no restriction at all; it is now `'self'` (plus the literal `wss://`
  origin for browsers that never implemented the CSP3 rule that `'self'` covers a
  same-host, same-port WebSocket — including the `ws://` one this origin uses until
  TLS is in front). `img-src` is `'self' data: blob:`, `media-src` is
  `'self' blob:`, and `frame-src`/`object-src`/`frame-ancestors` are `'none'`.
  `script-src` is `'self'` plus one SHA-256 hash covering the inline theme script
  in `index.html`; if that script is edited the hash must be recomputed, or the
  only symptom is a white flash before dark mode applies.
- **`/api/` responses are served with `default-src 'none'; sandbox
  allow-downloads`.** The proxy makes the backend same-origin, so
  `https://dashboard-trainings.aztu.edu.az/api/media/{id}/content` is a portal URL.
  The backend validates upload types, sends `nosniff` and a
  `Content-Disposition`; this is the second layer, so that a script-bearing file
  served from that path can never act as a document on the portal's origin. CSP
  on a response fetched by XHR or by `<img>`/`<video>` is ignored by the browser,
  so the SPA is unaffected.
- **Duplicate headers are pruned only where duplication would fail open.** The
  backend sets security headers of its own and nginx's `add_header` appends rather
  than replaces, so anything set on both sides arrives twice. Two identical
  `X-Frame-Options`, `X-Content-Type-Options` or `Content-Security-Policy` headers
  are harmless or fail closed (browsers take the first `nosniff` value, deny on a
  conflicting frame policy, and enforce the intersection of every CSP present), so
  those are left alone. `Cross-Origin-Resource-Policy` and
  `Cross-Origin-Opener-Policy` are the exception: doubled, they parse as neither a
  known value nor an absent header and browsers then ignore them — so `/api/`
  hides the upstream's copy of exactly those two (`proxy_hide_header` in
  [nginx/api-headers.conf](nginx/api-headers.conf)). `Content-Disposition`,
  `Content-Type` and the backend's own `nosniff` are never touched: on
  `/api/media/{id}/content` they are the first line of defence and nginx is only
  the second.
- **Rate limiting belongs to the backend, not to this edge.** There is no
  `limit_req` here on purpose. The API owns it (`app.ratelimit.enabled`, on by
  default), where it can key on the authenticated principal as well as the client
  IP, answer with a typed error the SPA renders, and record the rejection — an
  nginx 503 does none of that, and a second limiter in front would make the
  effective budget two numbers living in two repos. What this config owes that
  limiter is a *truthful* client address, which is what `set_real_ip_from` and the
  single-valued `X-Forwarded-For` in `nginx/nginx.conf` are for: the backend gets
  one address this nginx has already checked, instead of a list the client
  started. The backend's own right-to-left reading of that list is safe for
  internet clients but walks past a client whose address is itself private (an
  on-campus machine), into whatever that client prepended; the single value
  closes that for everything coming through the portal.
- `nginx -t` runs during the image build, so a malformed config (or a missing
  snippet) fails the build rather than the container.
- Containers run with `no-new-privileges`. Dropping capabilities further
  (`cap_drop: [ALL]` plus `CHOWN`, `SETUID`, `SETGID`, `DAC_OVERRIDE`) works with
  this image but is left to the operator to verify on the target host.

## Health

`GET /healthz` → `200 ok`, used by the Dockerfile `HEALTHCHECK` and suitable for
a load balancer.

## Caching

- `/assets/*` (content-hashed by Vite) → `Cache-Control: public, immutable`, 1 year.
- `/index.html` → `no-cache, no-store, must-revalidate`, so a deploy is picked up
  on the next navigation.
