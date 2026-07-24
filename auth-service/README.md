# GNSIS auth service

A small [Better Auth](https://www.better-auth.com/) service that handles
**GitHub sign-in** for GNSIS and mints the JWT session that the web app and the
GNSIS backend trust. It is the only place the GitHub **OAuth** client secret and
the session-signing key live.

> Identity only. Repository access for the coding agent is granted separately by
> the GNSIS **GitHub App** on the backend — not here.

## What it does

- Serves Better Auth under **`/api/auth/*`** (sign-in, callback, session, JWKS).
- Signs in users via **GitHub OAuth** and issues a JWT whose `aud` matches the
  backend (`GNSIS_API_AUDIENCE`), so the backend can verify sessions from its
  JWKS.
- Exposes a server-to-server **`verify-installation`** endpoint the backend
  calls (authenticated with a shared secret) to confirm a user's GitHub App
  installation.
- Enforces a single trusted browser origin (`GNSIS_FRONTEND_URL`) for
  sessions/CORS; secrets are redacted from logs (`src/redact.ts`).

## Architecture

```
Browser ──> /api/auth/*  ──> GitHub OAuth ──> signed JWT (aud = GNSIS_API_AUDIENCE)
Backend ──> /verify-installation  (shared-secret, server-to-server)
Postgres <── Better Auth tables (user / account / session / jwks)
```

## Main technologies

Node · TypeScript · Better Auth · Postgres · Vitest.

## Folder structure

```
src/
  server.ts               HTTP server: mounts /api/auth and verify-installation, CORS
  auth.ts                 Better Auth configuration (GitHub provider, JWT, DB)
  verify-installation.ts  Server-to-server GitHub App installation check
  env.ts                  Validated environment configuration
  redact.ts               Secret redaction for logs
```

## Local setup

```bash
npm install
cp .env.example .env       # fill in the values below
npm run auth:migrate       # create Better Auth tables in AUTH_DATABASE_URL
npm run dev                # http://localhost:3001
```

## Environment variables

See [`.env.example`](./.env.example) for the annotated list. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_DATABASE_URL` | **yes** | Postgres for Better Auth's own tables. |
| `BETTER_AUTH_SECRET` | **yes** | Signs session tokens (`openssl rand -base64 32`). |
| `BETTER_AUTH_URL` | **yes** | This service's public URL (JWT issuer + OAuth callback base). |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | **yes** | GitHub OAuth App credentials (identity only). |
| `GNSIS_FRONTEND_URL` | **yes** | The only trusted browser origin (sessions/CORS). |
| `GNSIS_API_AUDIENCE` | **yes** | JWT `aud`; must match the backend's expected audience. |
| `GNSIS_AUTH_INTERNAL_SECRET` | **yes** | Shared secret for the backend's `verify-installation` calls. |
| `NODE_ENV` / `PORT` | no | Standard Node config (`PORT` defaults to 3001). |

**URL alignment (production):** `BETTER_AUTH_URL`, `GNSIS_FRONTEND_URL`, the web
app's `VITE_AUTH_URL`, and the backend's issuer/JWKS settings must all reference
the same origins over HTTPS, with no mismatched trailing path segments.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the service with hot reload (`tsx watch`). |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm start` | Run the compiled service. |
| `npm run typecheck` | Type-check without emitting. |
| `npm test` | Run the test suite (`vitest run`). |
| `npm run auth:generate` | Regenerate the Better Auth schema. |
| `npm run auth:migrate` | Apply the Better Auth schema to the database. |

## Integrations

- **GitHub OAuth** — user identity/login.
- **Postgres** — Better Auth's user/account/session/JWKS tables (may share the
  backend's instance, separate database).
- **GNSIS backend** — verifies these JWTs from the service's JWKS and calls
  `verify-installation`.
