# GNSIS — workspace web app

The browser front end for GNSIS: sign in with GitHub, connect a repository, and
run a coding model against it. Each run produces a reviewable **receipt** (diff,
tests, model usage, policy result); the user approves it before a pull request
is opened.

This is a Vite + React single-page app. It talks to two backends — the GNSIS
FastAPI service (runs, billing, keys, gateway config) and a small Better Auth
service (GitHub sign-in) — and holds **no** server secrets itself.

> Part of the `gnsisfrontend` monorepo. See the repo-root `README.md` for how
> this app and the `auth-service/` fit together.

## What it does

- **New Run composer** — pick a repository, base branch, and model (with an
  optional second "Advisor" model), describe the task, and start a run.
- **Run thread** — streams the run's phases and shows the proposed patch, test
  results, and receipt; the user approves or rejects before anything is
  published.
- **Settings** — GitHub identity/connection state and GNSIS API key
  (`gns_…`) management.
- **Billing** — pay-as-you-go balance and usage.
- **Integration Lab** (`/integration-test`, flag-gated) — a browser harness for
  smoke-testing the public model gateway.
- **Login** (`/login`) — "Continue with GitHub" via the auth service.

## Architecture

```
Browser (this SPA)
  ├── Better Auth service  ── GitHub OAuth (identity/login) → JWT session
  └── GNSIS FastAPI backend ── runs, repos, models, billing, keys, gateway
                               (GitHub App grants repository access)
```

- **Config** is resolved at runtime first, build-time second (`src/lib/env.ts`):
  a container entrypoint writes the public `VITE_*` values to `/env.js`
  (`window.__GNSIS_CONFIG__`); Vite's `import.meta.env` is the local-dev
  fallback. Only `VITE_`-prefixed (public) values are ever read in the browser.
- **API boundary** lives in `src/lib/`: `api.ts` (typed backend client),
  `gateway.ts` (public OpenAI-compatible gateway), `session.tsx` +
  `authClient.ts` (Better Auth session). Screens never call `fetch` directly.
- **Routing**: `/login` is public; everything else is behind `ProtectedRoute`,
  which redirects unauthenticated visitors to `/login`.

## Main technologies

React 19 · TypeScript · Vite 7 · Tailwind CSS · React Router 7 · Better Auth ·
shadcn/ui primitives on Radix · Vitest + Testing Library · ESLint.

## Folder structure

```
src/
  App.tsx            App shell, sidebar, New-Run composer, run-thread state machine
  main.tsx           Entry point + route table
  pages/             Route screens: Login, Billing, Settings, GitHubOnboarding,
                     IntegrationTest, Home
  components/        Shared components: Combobox, RepositoryPicker, ApiKeysSection,
                     SecretReveal, ProtectedRoute
  components/ui/     The shadcn primitives actually in use (button, input, textarea,
                     select, dialog, dropdown-menu, tooltip)
  lib/               API clients, auth/session, env config, hooks, utils
  index.css          Tailwind entry + design tokens
```

## Local setup

```bash
npm install
cp .env.example .env   # if present; otherwise create .env with the vars below
npm run dev            # http://localhost:5173
```

Runs against a local or deployed backend + auth service — point the two URLs
below at whichever you're using.

## Environment variables

All are **public** (`VITE_`-prefixed) and safe for the browser bundle. Set them
via `.env` (local) or the container's `/env.js` (deployed).

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | **yes** | Base URL of the GNSIS FastAPI backend (no trailing slash). |
| `VITE_AUTH_URL` | **yes** | Base URL of the Better Auth service. |
| `VITE_GITHUB_APP_SLUG` | no | GitHub App slug, for "install the app" links. |
| `VITE_ENABLE_INTEGRATION_LAB` | no | `false` hides the Integration Lab (default on). |
| `VITE_SMOKE_TEST_MODEL` | no | Default model id pre-filled in the gateway smoke test. |
| `VITE_API_URL` | deprecated | Old name for `VITE_API_BASE_URL`; used only as a fallback. |

Server secrets (`GNSIS_API_KEY`, `OPENROUTER_API_KEY`, `BETTER_AUTH_SECRET`,
`GNSIS_VIRTUAL_KEY_PEPPER`, `GNSIS_AUTH_INTERNAL_SECRET`, GitHub client secret,
Stripe secrets) **must never** be exposed here — `env.ts` has no path to them.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Type-check (`tsc -b`) and produce a production build. |
| `npm run lint` | ESLint over the project. |
| `npm test` / `npx vitest run` | Run the test suite once. |
| `npm run test:watch` | Watch mode. |
| `npm run preview` | Serve the production build locally. |

## Deployment

Containerized (`Dockerfile`). The entrypoint injects the public runtime config
into `/env.js` from the service environment, then serves the built assets, so
one image is promoted across environments without a rebuild.

## Known limitations / unfinished areas

- **`src/App.tsx` is large (~2.7k lines)** — it holds the shell, sidebar,
  composer, and run-thread state machine. Splitting it into feature modules
  (behind the same routes/props) is the recommended next refactor.
- The **Integration Lab** is a developer/QA surface; keep
  `VITE_ENABLE_INTEGRATION_LAB=false` in locked-down deployments.
