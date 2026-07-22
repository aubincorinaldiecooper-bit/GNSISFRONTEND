#!/bin/sh
# Generate /env.js from the PUBLIC runtime configuration, then hand off to Caddy.
#
# Why this exists: the same immutable image is deployed to every environment and
# configured at *runtime* through Railway service variables, instead of baking
# URLs into the bundle at build time. The browser reads window.__GNSIS_CONFIG__
# (see src/lib/env.ts), which this script writes before Caddy starts serving.
#
# Safety:
#   * Values are encoded with `jq` as real JSON, so quotes, backslashes, tabs,
#     newlines, carriage returns and Unicode are escaped correctly and can never
#     break the generated JavaScript. There is NO hand-rolled string escaping and
#     NO `eval`.
#   * Only the browser-safe VITE_ variables in the allowlist below are emitted.
#     A server secret set in the environment is never read here.
#
# Absent vs. empty semantics: jq's $ENV contains exactly the variables that are
# SET in the process environment — an unset variable is ABSENT from the object,
# a variable set to "" is PRESENT as "". env.ts treats an absent key as
# "fall back to the build-time value" and a present key (even empty) as an
# intentional runtime override. This script preserves that distinction.
set -eu

ENV_JS="/usr/share/caddy/env.js"

CONFIG="$(
  jq -cn '
    $ENV
    | with_entries(
        select(.key | IN(
          "VITE_API_BASE_URL",
          "VITE_API_URL",
          "VITE_AUTH_URL",
          "VITE_ENABLE_INTEGRATION_LAB",
          "VITE_GITHUB_APP_SLUG"
        ))
      )
  '
)"

printf 'window.__GNSIS_CONFIG__ = %s;\n' "$CONFIG" > "$ENV_JS"

# Replace this process with Caddy so it receives signals directly (clean
# shutdown, correct exit codes) — no lingering shell wrapper.
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
