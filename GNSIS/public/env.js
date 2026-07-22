// Runtime public configuration placeholder.
//
// In production the container entrypoint (docker-entrypoint.sh) OVERWRITES this
// file at startup with the real public config, derived from the Railway service
// environment. For local dev and any non-container build it stays an empty
// object, so `src/lib/env.ts` transparently falls back to the build-time
// (import.meta.env) values baked into the bundle.
//
// This file must only ever carry PUBLIC, browser-safe `VITE_` values. No server
// secret may appear here (see the security note in src/lib/env.ts).
window.__GNSIS_CONFIG__ = {};
