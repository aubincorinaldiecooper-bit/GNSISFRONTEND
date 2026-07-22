// Centralised, typed access to the public Vite build-time configuration.
//
// SECURITY: only ever read `VITE_`-prefixed values here. Server secrets
// (GNSIS_API_KEY, OPENROUTER_API_KEY, BETTER_AUTH_SECRET, GNSIS_VIRTUAL_KEY_PEPPER,
// GNSIS_AUTH_INTERNAL_SECRET, the GitHub client secret, and any Stripe secret /
// webhook secret) must NEVER be exposed to the browser bundle. This module
// deliberately has no way to reach them.

type Env = ImportMetaEnv & Record<string, string | undefined>;

declare global {
  interface Window {
    __GNSIS_CONFIG__?: Record<string, string | undefined>;
  }
}

function readEnv(): Env {
  return import.meta.env as Env;
}

function readPublicConfig(name: string): string | undefined {
  const runtimeValue = window.__GNSIS_CONFIG__?.[name];
  if (runtimeValue) return runtimeValue;
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
  return readEnv().VITE_SMOKE_TEST_MODEL ?? "";
}

export function isApiConfigured(): boolean {
  return apiBaseUrl().length > 0;
}

export function isAuthConfigured(): boolean {
  return authBaseUrl().length > 0;
}
