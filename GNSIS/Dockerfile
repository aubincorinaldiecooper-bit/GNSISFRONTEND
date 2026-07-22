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

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /usr/share/caddy

EXPOSE 8080

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
