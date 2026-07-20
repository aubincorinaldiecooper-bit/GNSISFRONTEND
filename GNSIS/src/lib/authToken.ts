// Short-lived backend JWT management.
//
// Better Auth (the auth-service) issues a 15-minute JWT the FastAPI backend
// verifies against its JWKS. The browser holds a session COOKIE with the
// auth-service; we exchange that cookie for a JWT at `${AUTH_URL}/api/auth/token`
// and send the JWT as `Authorization: Bearer` to the backend.
//
// The JWT lives ONLY in module memory — never localStorage, never a URL, never
// logged. It is refreshed on demand and dropped on sign-out.

import { authBaseUrl } from "./env";

interface CachedToken {
  value: string;
  /** epoch ms at which the JWT expires */
  expiresAt: number;
}

let cached: CachedToken | null = null;
let inflight: Promise<string | null> | null = null;
// Bumped on every invalidation (sign-out, or a confirmed-invalid session). An
// in-flight exchange captures the generation it started in and refuses to write
// its result back into `cached` once the generation has moved on — so a token
// minted for a previous user can never survive a sign-out that raced with the
// fetch, and can't be reused by the next user in the same tab.
let generation = 0;
let inflightController: AbortController | null = null;

/** Decode a JWT's `exp` (seconds) without verifying — for local expiry only. */
function decodeExpMs(jwt: string): number {
  try {
    const [, payload] = jwt.split(".");
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    if (typeof json.exp === "number") return json.exp * 1000;
  } catch {
    // Unparseable — treat as short-lived so we refetch soon.
  }
  return Date.now() + 60_000;
}

async function fetchFreshToken(gen: number): Promise<string | null> {
  const base = authBaseUrl();
  if (!base) return null;
  const controller = new AbortController();
  inflightController = controller;
  let res: Response;
  try {
    res = await fetch(`${base}/api/auth/token`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch {
    // Network / CORS failure, or aborted by an invalidation — no token.
    return null;
  }
  // Invalidated (sign-out) while the request was in flight → discard the result
  // rather than writing another user's JWT into the cache.
  if (gen !== generation) return null;
  if (!res.ok) {
    cached = null;
    return null;
  }
  let token: string | undefined;
  try {
    const body = (await res.json()) as { token?: string };
    token = body.token;
  } catch {
    token = undefined;
  }
  // Re-check after the async body read, which is another suspension point.
  if (gen !== generation) return null;
  if (!token) {
    cached = null;
    return null;
  }
  cached = { value: token, expiresAt: decodeExpMs(token) };
  return token;
}

/**
 * Return a valid backend JWT, exchanging the session cookie when needed.
 * Pass `force` to bypass the cache (used once after a 401 to refresh).
 * Returns null when there is no active session (caller should redirect to login).
 */
export async function getBackendToken(force = false): Promise<string | null> {
  if (!force && cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.value;
  }
  if (!inflight) {
    const gen = generation;
    inflight = fetchFreshToken(gen).finally(() => {
      // Only release the shared handle if a later invalidation hasn't already
      // replaced it — otherwise we'd null out a fresh, still-valid promise.
      if (gen === generation) inflight = null;
    });
  }
  return inflight;
}

/**
 * Drop the cached JWT and cancel any in-flight exchange (sign-out, or
 * a confirmed-invalid session). Bumping the generation makes a still-running
 * `fetchFreshToken()` discard its result instead of repopulating the cache.
 */
export function clearBackendToken(): void {
  generation += 1;
  cached = null;
  inflight = null;
  if (inflightController) {
    inflightController.abort();
    inflightController = null;
  }
}

// -- unauthorized signal ------------------------------------------------------
// The API client emits this after a retried request still returns 401, so the
// app can route the user back to /login without every caller wiring it up.

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function emitUnauthorized(): void {
  clearBackendToken();
  for (const listener of unauthorizedListeners) {
    try {
      listener();
    } catch {
      // a listener throwing must not stop the others
    }
  }
}
