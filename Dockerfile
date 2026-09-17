# ─────────────────────────── Stage 1: build ───────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install deps with a clean, reproducible lockfile install.
COPY package.json package-lock.json ./
RUN npm ci

# Build the app. VITE_* build-time vars can be injected via --build-arg.
COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ─────────────────────────── Stage 2: serve ───────────────────────────
FROM nginx:1.27-alpine AS runtime

# SPA-aware nginx config (history fallback, gzip, /api + /ws proxy, security
# headers).
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
# Snippets go OUTSIDE conf.d — the stock nginx.conf globs `conf.d/*.conf` into the
# http context, which would load the header lists a second time at the wrong
# level. All three are needed: nginx.conf includes security-headers.conf (SPA)
# and api-headers.conf (the /api/ proxy), and each of those includes
# security-headers-common.conf.
COPY nginx/security-headers-common.conf \
     nginx/security-headers.conf \
     nginx/api-headers.conf \
     /etc/nginx/snippets/

# Fail the build on a malformed config rather than at container start. This also
# catches a missing snippet, since `include` resolves at parse time.
RUN nginx -t

# Static assets from the build stage.
COPY --from=build /app/dist /usr/share/nginx/html

# The nginx master runs as root and drops workers to the `nginx` user (stock
# behaviour of this image). Nothing app-specific runs privileged.
# Port is 8081 to match nginx/nginx.conf — see the note there on host networking.
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8081/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
