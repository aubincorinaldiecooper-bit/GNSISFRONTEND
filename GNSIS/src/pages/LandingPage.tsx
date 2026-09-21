// GNSIS — the public front door.
//
// This is the whole public site for the perception MVP: say what GNSIS is, and
// get a phone into a live session. There is no sign-in here by design — during
// the pilot anyone with the address can try it.
//
// The page never opens a session itself. The session lives on the runtime: the
// phone loads `<runtime>/live`, which is served by the same GPU service the
// camera then talks to over its websockets. That page cannot be moved here —
// it has to be same-origin with those sockets, and a scanned QR has to land
// somewhere that simply works. So this page is a signpost, not a client.
//
// The QR image is drawn by the runtime at `/live/qr.svg` for its own address,
// rather than generated here. That keeps one source of truth for what the code
// points at, and the runtime already refuses to encode anything but a plain
// public URL — no credentials, no query, no fragment.
//
// Styling is a scoped stylesheet rather than the app's Tailwind, matching how
// the other standalone public page in this repo is built. The colours, type,
// radius and motion values are copied from the runtime's own live.css so the
// desktop door and the phone screen are visibly the same product. The two
// fonts are the same self-hosted files the runtime serves, vendored into
// public/brand with their OFL licences, because loading them across origins
// from the runtime would need CORS headers it does not set.

import { useEffect, useState } from "react";

import { isLiveRuntimeConfigured, liveRuntimeUrl } from "@/lib/env";

const STATEMENT = "Let it see what you see.";

const BRAND_CSS = `
.gnsis-door {
  /* Palette, type, radius and motion: runtime static/live.css. */
  --night: #111827;
  --mist: #F5F8FB;
  --peach: #FFD3B4;
  --coral: #FF6676;
  --orange: #FFAA3D;
  --glow: #FFE6B1;
  --warm: #FFF8F5;
  --ink-2: #4B5563;

  --display: "Roboto Condensed", "Roboto", "Helvetica Neue", Arial, sans-serif;
  --body: "Roboto", "Helvetica Neue", Arial, sans-serif;

  --r-lg: 16px;
  --r-xl: 20px;
  --r-pill: 999px;
  --shadow-panel: 0 4px 16px rgba(17, 24, 39, 0.12);
  --base: 250ms;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);

  position: relative;
  isolation: isolate;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  background: var(--warm);
  color: var(--night);
  font: 400 16px/24px var(--body);
  -webkit-font-smoothing: antialiased;
}

/* The signature gradient: soft blobs on the warm ground, never flat fills. */
.gnsis-door::before,
.gnsis-door::after {
  content: "";
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.55;
  pointer-events: none;
}
.gnsis-door::before {
  width: 520px;
  height: 520px;
  top: -180px;
  right: -140px;
  background: radial-gradient(circle at 30% 30%, var(--coral), var(--peach) 60%, transparent 72%);
}
.gnsis-door::after {
  width: 460px;
  height: 460px;
  bottom: -200px;
  left: -160px;
  background: radial-gradient(circle at 60% 40%, var(--orange), var(--glow) 58%, transparent 72%);
}

.gnsis-door__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 24px 0;
}
.gnsis-door__mark { width: 40px; height: 40px; display: block; }
.gnsis-door__wordmark {
  font: 800 20px/1 var(--display);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.gnsis-door__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 40px;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: 56px 24px 72px;
}

.gnsis-door__statement {
  font: 800 clamp(40px, 9vw, 56px)/1.04 var(--display);
  letter-spacing: -0.01em;
  text-transform: uppercase;
  max-width: 14ch;
}
.gnsis-door__lede {
  margin-top: 20px;
  max-width: 46ch;
  color: var(--ink-2);
  font-size: 18px;
  line-height: 28px;
}

.gnsis-door__panels {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 32px;
}

/* 18 — the utility surface. The QR sits on Night; the modules are white. */
.gnsis-door__qr-panel {
  background: var(--night);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-panel);
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.gnsis-door__qr {
  width: 224px;
  height: 224px;
  display: block;
  border-radius: var(--r-lg);
}
.gnsis-door__qr-caption {
  color: var(--mist);
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  max-width: 24ch;
}

.gnsis-door__start {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--night);
  color: var(--mist);
  border-radius: var(--r-pill);
  padding: 16px 28px;
  font: 700 17px/1 var(--body);
  text-decoration: none;
  white-space: nowrap;
  transition: transform var(--base) var(--ease), opacity var(--base) var(--ease);
}
.gnsis-door__start:hover { opacity: 0.92; }
.gnsis-door__start:active { transform: scale(0.98); }
.gnsis-door__start:focus-visible { outline: 3px solid var(--coral); outline-offset: 3px; }

.gnsis-door__aside { flex: 1 1 280px; min-width: 260px; }
.gnsis-door__note {
  margin-top: 16px;
  color: var(--ink-2);
  font-size: 14px;
  line-height: 22px;
  max-width: 40ch;
}
.gnsis-door__address {
  margin-top: 12px;
  font-size: 13px;
  line-height: 20px;
  color: var(--ink-2);
  word-break: break-all;
}
.gnsis-door__address a { color: var(--night); }

.gnsis-door__unset {
  background: #FFFFFF;
  border: 1px solid rgba(17, 24, 39, 0.12);
  border-radius: var(--r-xl);
  padding: 24px;
  max-width: 52ch;
}
.gnsis-door__unset h2 { font: 700 18px/26px var(--body); margin-bottom: 8px; }
.gnsis-door__unset p { color: var(--ink-2); font-size: 15px; line-height: 23px; }
.gnsis-door__unset code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  background: rgba(17, 24, 39, 0.06);
  border-radius: 6px;
  padding: 1px 5px;
}

.gnsis-door__footer {
  padding: 0 24px 28px;
  color: var(--ink-2);
  font-size: 13px;
  line-height: 20px;
}

/* A phone is handed the button; a desktop is handed the code to scan. Both
   stay in the markup so neither depends on sniffing the user agent. */
.gnsis-door__phone-only { display: none; }
@media (pointer: coarse) {
  .gnsis-door__phone-only { display: block; }
  .gnsis-door__desk-only { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .gnsis-door__start { transition: none; }
}
`;

const FONT_CSS = `
@font-face {
  font-family: "Roboto";
  src: url("/brand/Roboto.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Roboto Condensed";
  src: url("/brand/RobotoCondensed-800.woff2") format("woff2");
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}
`;

/** The runtime is not configured yet — say so plainly instead of drawing a broken code. */
function RuntimeUnset() {
  return (
    <section className="gnsis-door__unset">
      <h2>No runtime address is configured</h2>
      <p>
        Set <code>VITE_LIVE_RUNTIME_URL</code> on this service to the address of the
        GNSIS realtime runtime. The code to scan and the start link are both built
        from it, so until it is set there is nothing to point a phone at.
      </p>
    </section>
  );
}

export default function LandingPage() {
  const runtime = liveRuntimeUrl();
  const configured = isLiveRuntimeConfigured();
  const liveUrl = configured ? `${runtime}/live` : "";
  const qrUrl = configured ? `${runtime}/live/qr.svg` : "";
  const [qrFailed, setQrFailed] = useState(false);

  useEffect(() => {
    document.title = "GNSIS — real-time perception";
  }, []);

  return (
    <div className="gnsis-door">
      <style>{FONT_CSS}</style>
      <style>{BRAND_CSS}</style>

      <header className="gnsis-door__header">
        <img className="gnsis-door__mark" src="/brand/gnsis-flat.svg" alt="" aria-hidden="true" />
        <span className="gnsis-door__wordmark">gnsis</span>
      </header>

      <main className="gnsis-door__main">
        <div>
          <h1 className="gnsis-door__statement">{STATEMENT}</h1>
          <p className="gnsis-door__lede">
            Point your phone at something and talk normally. GNSIS watches and
            listens as it happens, and answers while you are still looking.
          </p>
        </div>

        {!configured ? (
          <RuntimeUnset />
        ) : (
          <div className="gnsis-door__panels">
            {!qrFailed && (
              <section className="gnsis-door__qr-panel gnsis-door__desk-only">
                <img
                  className="gnsis-door__qr"
                  src={qrUrl}
                  width={224}
                  height={224}
                  alt={`QR code that opens ${liveUrl}`}
                  onError={() => setQrFailed(true)}
                />
                <p className="gnsis-door__qr-caption">Scan this with your phone to start a session</p>
              </section>
            )}

            <div className="gnsis-door__aside">
              <a
                className="gnsis-door__start gnsis-door__phone-only"
                href={liveUrl}
                data-testid="start-session"
              >
                Start
                <span aria-hidden="true">→</span>
              </a>

              <p className="gnsis-door__note">
                Camera and microphone, only while the session is open. One person
                at a time on each machine — if it is already in use you are told,
                and can try again in a moment.
              </p>

              <p className="gnsis-door__address">
                Or open it directly: <a href={liveUrl}>{liveUrl}</a>
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="gnsis-door__footer">Roboto and Roboto Condensed are used under the SIL Open Font License.</footer>
    </div>
  );
}
