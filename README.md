# gnsisfrontend

The GNSIS front end. This repository holds **two deployable services**:

| Path | Service | Stack | Purpose |
|---|---|---|---|
| [`GNSIS/`](./GNSIS) | Workspace web app | Vite + React + TypeScript (SPA) | The user-facing UI: sign in, connect a repo, run a coding model, review the receipt, approve the PR. |
| [`auth-service/`](./auth-service) | Auth service | Node + Better Auth | GitHub OAuth sign-in; mints the JWT session the app and backend trust. |

They are separated because they have different trust boundaries: the **web app**
is public and holds no secrets, while the **auth service** holds the GitHub
OAuth client secret and the session-signing key and runs server-side.

## How they fit together

```
Browser ──> GNSIS web app (GNSIS/)
                │  "Continue with GitHub"
                ▼
          auth-service/ ──> GitHub OAuth ──> signed JWT session
                │
                ▼
          GNSIS FastAPI backend (separate repo)  ──> runs, billing, gateway
                                                     (GitHub App = repo access)
```

- **Identity** (who you are) comes from `auth-service` via GitHub OAuth.
- **Repository access** (what the agent may touch) is granted separately by the
  GNSIS GitHub App, which lives on the backend — not here.
- The web app calls the backend with the JWT from the auth service; it never
  sees any server secret.

## Getting started

Each service has its own `README.md`, dependencies, and `.env`:

```bash
# Web app
cd GNSIS && npm install && npm run dev          # http://localhost:5173

# Auth service (separate terminal)
cd auth-service && npm install && npm run dev    # http://localhost:3001
```

Point the app's `VITE_AUTH_URL` at the auth service and its `VITE_API_BASE_URL`
at the backend. See each service's README for the full environment-variable
list and commands.

## Repository layout

```
GNSIS/          Vite + React web app        (see GNSIS/README.md)
auth-service/   Better Auth service         (see auth-service/README.md)
```

## Related repositories

- **Backend** (`gnsisbackend`) — FastAPI + Celery service: runs, billing, model
  gateway, GitHub App, memory.
- **Executor** (`Gnsis-studio-`) — the hardened, sandboxed workflow that
  actually runs coding jobs.
