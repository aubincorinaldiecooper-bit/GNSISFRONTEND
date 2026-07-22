// Centralised, typed access to the public GNSIS frontend configuration.
//
// Two sources, in precedence order:
//   1. RUNTIME  — window.__GNSIS_CONFIG__, injected by the container entrypoint
//      into /env.js from the Railway service environment (see docker-entrypoint.sh).
//   2. BUILD-TIME — import.meta.env, baked into the bundle by Vite. Used for
//      local dev, non-container builds, and as the fallback when a variable is
//      not present in the runtime config.
//
// Runtime precedence rule (defined + tested in env.test.ts): a key that is
// PRESENT in the runtime config wins — even if it is an empty string, because
// the operator setting a variable (to anything, including "") is an intentional
// override. Only a key that is ABSENT from the runtime config falls through to
// the build-time value. The entrypoint emits exactly the variables that are set,
// so "present-but-empty" and "absent" stay distinguishable.
//
// SECURITY: only ever read `VITE_`-prefixed values here. Server secrets
// (GNSIS_API_KEY, OPENROUTER_API_KEY, BETTER_AUTH_SECRET, GNSIS_VIRTUAL_KEY_PEPPER,
// GNSIS_AUTH_INTERNAL_SECRET, the GitHub client secret, and any Stripe secret /
// webhook secret) must NEVER be exposed to the browser bundle or to /env.js.
// This module deliberately has no way to reach them.

type Env = ImportMetaEnv & Record<string, string | undefined>;

declare global {
  interface Window {
    /** Public runtime config injected by /env.js. Values are strings or absent. */
    __GNSIS_CONFIG__?: Record<string, string | undefined>;
  }
}

function readEnv(): Env {
  return import.meta.env as Env;
}

/**
 * Resolve one public variable, preferring the runtime config over the build-time
 * bundle. A key present in the runtime config (even as "") overrides; only an
 * absent key falls back to build-time.
 */
function readPublicConfig(name: string): string | undefined {
  const cfg = typeof window !== "undefined" ? window.__GNSIS_CONFIG__ : undefined;
  if (cfg && Object.prototype.hasOwnProperty.call(cfg, name)) {
    return cfg[name];
  }
  return readEnv()[name];
}

function trimTrailingSlash(value: string | undefined): string {
  return (value ?? "").replace(/\/+$/, "");
}

/**
 * Base URL of the GNSIS FastAPI backend (no trailing slash).
 *
 * Prefers `VITE_API_BASE_URL`; falls back to the DEPRECATED `VITE_API_URL`
 * only when the canonical var is unset, so an existing deployment that still
 * carries the old name keeps working. New deployments should set
 * `VITE_API_BASE_URL`.
 */
export function apiBaseUrl(): string {
  const canonical = trimTrailingSlash(readPublicConfig("VITE_API_BASE_URL"));
  if (canonical) return canonical;
  return trimTrailingSlash(readPublicConfig("VITE_API_URL")); // deprecated fallback
}

/** True when the deprecated `VITE_API_URL` is the only source configured. */
export function usingDeprecatedApiUrl(): boolean {
  return (
    !trimTrailingSlash(readPublicConfig("VITE_API_BASE_URL")) &&
    !!trimTrailingSlash(readPublicConfig("VITE_API_URL"))
  );
}

/** Base URL of the Better Auth service (no trailing slash). */
export function authBaseUrl(): string {
  return trimTrailingSlash(readPublicConfig("VITE_AUTH_URL"));
}

/** GitHub App slug — used only for display / "install the app" links. */
export function githubAppSlug(): string {
  return readPublicConfig("VITE_GITHUB_APP_SLUG") ?? "";
}

/**
 * Whether the Integration Lab (/integration-test) is exposed in the nav.
 * Defaults to ON so the browser-based integration test is reachable; set
 * `VITE_ENABLE_INTEGRATION_LAB=false` to hide it in a locked-down deployment.
 */
export function integrationLabEnabled(): boolean {
  const raw = (readPublicConfig("VITE_ENABLE_INTEGRATION_LAB") ?? "true").toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}

/** Default model id pre-filled in the gateway smoke test. */
export function smokeTestModel(): string {
  return readPublicConfig("VITE_SMOKE_TEST_MODEL") ?? "";
}

export function isApiConfigured(): boolean {
  return apiBaseUrl().length > 0;
}

export function isAuthConfigured(): boolean {
  return authBaseUrl().length > 0;
}
