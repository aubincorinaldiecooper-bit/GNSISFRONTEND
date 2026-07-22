FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_API_URL
ARG VITE_AUTH_URL
ARG VITE_ENABLE_INTEGRATION_LAB
ARG VITE_GITHUB_APP_SLUG

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_URL=$VITE_API_URL \
    VITE_AUTH_URL=$VITE_AUTH_URL \
    VITE_ENABLE_INTEGRATION_LAB=$VITE_ENABLE_INTEGRATION_LAB \
    VITE_GITHUB_APP_SLUG=$VITE_GITHUB_APP_SLUG

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM caddy:2-alpine AS runtime

ENV PORT=8080

# jq encodes the runtime config as real JSON in the entrypoint (no hand-rolled
# escaping, no eval), so arbitrary values can never break the generated /env.js.
RUN apk add --no-cache jq

COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
COPY --from=build /app/dist /usr/share/caddy

EXPOSE 8080

# The entrypoint writes /env.js from the runtime environment, then `exec`s Caddy
# so the server replaces the shell and receives signals directly.
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
