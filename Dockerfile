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

# SPA-aware nginx config (history fallback, gzip, security headers).
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Static assets from the build stage.
COPY --from=build /app/dist /usr/share/nginx/html

# Run as the unprivileged nginx user.
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
