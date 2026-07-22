#!/bin/sh
set -eu

escape_js_string() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

write_public_var() {
  name="$1"
  value="$(eval "printf '%s' \"\${$name:-}\"")"
  escaped="$(escape_js_string "$value")"
  printf '  %s: "%s",\n' "$name" "$escaped" >> /usr/share/caddy/env.js
}

cat > /usr/share/caddy/env.js <<'HEADER'
// Generated at container startup from public Railway runtime variables.
window.__GNSIS_CONFIG__ = {
HEADER

write_public_var VITE_API_BASE_URL
write_public_var VITE_API_URL
write_public_var VITE_AUTH_URL
write_public_var VITE_ENABLE_INTEGRATION_LAB
write_public_var VITE_GITHUB_APP_SLUG

cat >> /usr/share/caddy/env.js <<'FOOTER'
};
FOOTER

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
