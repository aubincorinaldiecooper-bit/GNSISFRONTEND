# The live surface, served from here

`live.html`, `assets/live.css`, `assets/live.js`, `assets/mic-worklet.js` and
everything under `assets/live/` are **copies of the GNSIS runtime's own live
page**, taken verbatim from GNSISBACKEND at
`runtime/minicpm_ft/mcpmft/infer/static/`. They are not a reimplementation and
must not be edited here.

## Why they are copied

The runtime serves this same page, but it loads MiniCPM-o and the Thinker
checkpoint onto a GPU inside `build_app()` and only *then* binds its port. So
nothing it serves — not even a static HTML file — is reachable until a
multi-gigabyte model is in GPU memory. Forwarding the page to the runtime meant
a visitor waited out a full cold start just to see a QR code; in production that
showed up as requests held 125 seconds before the browser gave up.

Serving the page from this container makes the front door instant. Only
`/ws/duplex` and `/ws/screen` are forwarded to the runtime (see `Caddyfile`), so
the GPU starts when somebody starts a session rather than when they look at the
page. The page still talks to those sockets on its own origin, which is what it
requires.

## Refreshing them

When the runtime's live page changes, re-copy all of them together — the HTML,
the script and the stylesheet are versioned as one surface:

```bash
# from a GNSISBACKEND checkout
S=runtime/minicpm_ft/mcpmft/infer/static
D=/path/to/GNSISFRONTEND/GNSIS/public
cp "$S/live.html"                 "$D/live.html"
cp "$S/live.css" "$S/live.js" "$S/mic-worklet.js"  "$D/assets/"
cp -r "$S/live/."                 "$D/assets/live/"
```

The container smoke test in `.github/workflows/ci.yml` asserts every path the
page requests is served locally and returns the real file, so a half-finished
copy fails CI rather than production.

## `live/qr.svg`

Drawn by the runtime's own tool, not by hand and not by a third party:

```bash
# from a GNSISBACKEND checkout, with segno installed
python runtime/gnsis_runtime/gnsis_runtime/live_qr.py \
  --url https://gnsis.studio/live \
  --out /path/to/GNSISFRONTEND/GNSIS/public/live/qr.svg \
  --size 1024
```

It encodes exactly `https://gnsis.studio/live` — the tool refuses any URL
carrying credentials, a query string or a fragment, because a QR code is a thing
people photograph and pass around. **Regenerate it if the public domain ever
changes**, or the printed code will keep pointing at the old one.

## `env.js`

Unrelated to the above: a local-development placeholder. In production the
container entrypoint writes the real `/env.js` from the service's environment.
