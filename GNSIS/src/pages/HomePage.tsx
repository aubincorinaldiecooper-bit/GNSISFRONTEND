// GNSIS — public marketing landing page.
//
// A standalone, monochrome page for logged-out visitors. Its single conversion
// action, "Connect GitHub", routes into the app's REAL GitHub entry point —
// /login, which runs "Continue with GitHub" (GitHub OAuth) via better-auth.
// Repository access is granted separately, after sign-in, through the GNSIS
// GitHub App (see LoginPage's footnote), so the front-door CTA is the OAuth
// connect, not an invented /connect/github route.
//
// The visual system is self-contained (Astryx-style tokens injected as a scoped
// <style>) rather than the app's Tailwind, because there is no @astryxdesign
// package installed and the marketing surface is intentionally distinct while
// staying in the GNSIS monochrome/minimal language. No framer-motion (the app
// has no motion library): the gentle reveal uses IntersectionObserver and is
// disabled under prefers-reduced-motion. Analytics uses only the existing
// window.analytics / window.gnsis surface and never blocks navigation.

import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { useNavigate } from "react-router";

// The real GitHub connect flow: /login -> "Continue with GitHub" (OAuth), then
// land in the New Run workspace (/new). `next` is a same-app relative path that
// LoginPage re-validates before honoring.
const SIGN_IN_URL = "/login?next=%2Fnew";
const CONNECT_GITHUB_URL = "/login?next=%2Fnew";
// The public homepage now lives at "/"; the brand mark returns there.
const HOME_URL = "/";

/* ---------------------------------------------------------------------------
   Astryx-style design tokens + primitive styles (scoped to this page)
--------------------------------------------------------------------------- */
const ASTRYX_CSS = `
.gnsis-landing {
  --ax-color-bg-page:        #FAF9F6;
  --ax-color-bg-surface:     #FFFFFF;
  --ax-color-bg-surface-alt: #F6F5F1;
  --ax-color-bg-muted:       #F1F0EC;

  --ax-color-text-primary:   #141824;
  --ax-color-text-secondary: #55607A;
  --ax-color-text-tertiary:  #66708A;

  --ax-color-border:         #E6E4DF;
  --ax-color-border-strong:  #CFCDC6;

  --ax-color-primary:        #141824;
  --ax-color-primary-hover:  #242A3A;
  --ax-color-primary-text:   #FFFFFF;

  --ax-color-accent:         #2E4BC7;
  --ax-color-accent-soft:    #E7ECFB;

  --ax-color-success:        #1F7A45;
  --ax-color-success-bg:     #E6F2EA;
  --ax-color-warning:        #9A6A0A;
  --ax-color-warning-bg:     #FBF3DE;
  --ax-color-neutral-soft:   #ECEAE4;

  --ax-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --ax-font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --ax-text-xs:   0.75rem;
  --ax-text-sm:   0.875rem;
  --ax-text-base: 1rem;
  --ax-text-lg:   1.125rem;
  --ax-text-xl:   1.25rem;
  --ax-text-3xl:  1.875rem;
  --ax-text-4xl:  2.375rem;
  --ax-text-5xl:  3rem;

  --ax-leading-tight:   1.12;
  --ax-leading-snug:    1.28;
  --ax-leading-normal:  1.5;
  --ax-leading-relaxed: 1.62;

  --ax-tracking-tight: -0.022em;
  --ax-tracking-wide:  0.09em;

  --ax-space-1: 4px;   --ax-space-2: 8px;   --ax-space-3: 12px;
  --ax-space-4: 16px;  --ax-space-5: 20px;  --ax-space-6: 24px;
  --ax-space-8: 32px;  --ax-space-10: 40px; --ax-space-12: 48px;
  --ax-space-14: 56px; --ax-space-16: 64px; --ax-space-20: 80px;
  --ax-space-24: 96px;

  --ax-radius-sm: 6px;
  --ax-radius-md: 10px;
  --ax-radius-lg: 14px;
  --ax-radius-xl: 20px;
  --ax-radius-full: 999px;

  --ax-border-width: 1px;

  --ax-shadow-md: 0 6px 18px rgba(20,24,36,0.07), 0 0 0 1px rgba(20,24,36,0.03);
  --ax-shadow-lg: 0 22px 48px -18px rgba(20,24,36,0.22), 0 0 0 1px rgba(20,24,36,0.04);

  --ax-size-btn-lg: 44px;

  --ax-page-max: 1240px;
  --ax-page-px-desktop: 40px;
  --ax-page-px-tablet:  24px;
  --ax-page-px-mobile:  18px;

  font-family: var(--ax-font-sans);
  font-size: var(--ax-text-base);
  line-height: var(--ax-leading-normal);
  color: var(--ax-color-text-primary);
  background: var(--ax-color-bg-page);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
.gnsis-landing *, .gnsis-landing *::before, .gnsis-landing *::after { box-sizing: border-box; }
.gnsis-landing img, .gnsis-landing svg { display: block; max-width: 100%; }
.gnsis-landing a { color: inherit; text-decoration: none; }

.ax-container {
  max-width: var(--ax-page-max);
  margin-inline: auto;
  padding-inline: var(--ax-page-px-desktop);
}
@media (max-width: 1024px) { .gnsis-landing .ax-container { padding-inline: var(--ax-page-px-tablet); } }
@media (max-width: 768px)  { .gnsis-landing .ax-container { padding-inline: var(--ax-page-px-mobile); } }

.ax-heading {
  font-weight: 600;
  letter-spacing: var(--ax-tracking-tight);
  color: var(--ax-color-text-primary);
  line-height: var(--ax-leading-tight);
  margin: 0;
}
.ax-heading--h2 { font-size: var(--ax-text-3xl); }
.ax-heading--h3 { font-size: var(--ax-text-xl); }
.ax-eyebrow {
  font-size: var(--ax-text-xs);
  font-weight: 500;
  letter-spacing: var(--ax-tracking-wide);
  text-transform: uppercase;
  color: var(--ax-color-text-secondary);
  line-height: var(--ax-leading-normal);
  margin: 0;
}

.ax-text { color: var(--ax-color-text-primary); line-height: var(--ax-leading-relaxed); margin: 0; }
.ax-text--secondary { color: var(--ax-color-text-secondary); }
.ax-text--tertiary  { color: var(--ax-color-text-tertiary); }
.ax-text--sm { font-size: var(--ax-text-sm); }
.ax-text--lg { font-size: var(--ax-text-lg); }

.ax-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ax-space-2);
  height: var(--ax-size-btn-lg);
  padding: 0 var(--ax-space-5);
  border-radius: var(--ax-radius-md);
  font-size: var(--ax-text-sm);
  font-weight: 500;
  border: var(--ax-border-width) solid transparent;
  white-space: nowrap;
  transition: background-color 160ms ease, border-color 160ms ease,
              color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  user-select: none;
  cursor: pointer;
  font-family: inherit;
}
.ax-btn:focus-visible { outline: 2px solid var(--ax-color-accent); outline-offset: 2px; }
.ax-btn--primary { background: var(--ax-color-primary); color: var(--ax-color-primary-text); }
.ax-btn--primary:hover { background: var(--ax-color-primary-hover); }
.ax-btn--primary:active { transform: translateY(1px); }
.ax-btn--default {
  background: var(--ax-color-bg-surface);
  color: var(--ax-color-text-primary);
  border-color: var(--ax-color-border-strong);
}
.ax-btn--default:hover { background: var(--ax-color-bg-muted); }
.ax-btn--flat { background: transparent; color: var(--ax-color-text-secondary); }
.ax-btn--flat:hover { background: var(--ax-color-bg-muted); color: var(--ax-color-text-primary); }

.ax-card {
  background: var(--ax-color-bg-surface);
  border: var(--ax-border-width) solid var(--ax-color-border);
  border-radius: var(--ax-radius-lg);
}

.ax-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--ax-text-xs);
  font-weight: 500;
  padding: 3px 8px;
  border-radius: var(--ax-radius-full);
  line-height: 1;
  white-space: nowrap;
}
.ax-status--success { background: var(--ax-color-success-bg); color: var(--ax-color-success); }
.ax-status--warning { background: var(--ax-color-warning-bg); color: var(--ax-color-warning); }
.ax-status--neutral { background: var(--ax-color-neutral-soft); color: var(--ax-color-text-secondary); }
.ax-status__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

/* Gentle viewport reveal (IntersectionObserver-driven; no motion library) */
.ax-reveal { opacity: 0; transform: translateY(10px); transition: opacity 500ms ease, transform 500ms ease; }
.ax-reveal--in { opacity: 1; transform: none; }

.page { display: flex; flex-direction: column; min-height: 100vh; }

.nav {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(250, 249, 246, 0.85);
  backdrop-filter: saturate(160%) blur(10px);
  -webkit-backdrop-filter: saturate(160%) blur(10px);
  border-bottom: var(--ax-border-width) solid var(--ax-color-border);
}
.nav__inner { display: flex; align-items: center; justify-content: space-between; height: 64px; }
.nav__brand {
  display: inline-flex; align-items: center; gap: var(--ax-space-2);
  font-weight: 600; font-size: var(--ax-text-lg); letter-spacing: var(--ax-tracking-tight);
  background: none; border: 0; cursor: pointer; color: inherit; font-family: inherit;
}
.nav__brand:focus-visible { outline: 2px solid var(--ax-color-accent); outline-offset: 2px; border-radius: var(--ax-radius-sm); }
.brand-mark { width: 22px; height: 22px; border-radius: 6px; background: var(--ax-color-primary); position: relative; flex-shrink: 0; }
.brand-mark::after { content: ""; position: absolute; inset: 5px; border-radius: 2px; background: var(--ax-color-bg-page); opacity: 0.9; }
.nav__actions { display: flex; align-items: center; gap: var(--ax-space-2); }

.hero { padding-block: var(--ax-space-16) var(--ax-space-20); }
.hero__grid { display: grid; grid-template-columns: 46fr 54fr; gap: var(--ax-space-12); align-items: center; }
.hero__copy { max-width: 560px; }
.hero__title {
  font-size: clamp(2.125rem, 4.4vw, var(--ax-text-5xl));
  font-weight: 600;
  line-height: 1.06;
  letter-spacing: -0.028em;
  margin: var(--ax-space-5) 0 var(--ax-space-6);
}
.hero__lede {
  font-size: var(--ax-text-lg);
  color: var(--ax-color-text-secondary);
  line-height: var(--ax-leading-relaxed);
  margin-bottom: var(--ax-space-8);
  max-width: 52ch;
}
.hero__actions { display: flex; gap: var(--ax-space-3); flex-wrap: wrap; margin-bottom: var(--ax-space-5); }
.hero__reassurance {
  font-size: var(--ax-text-sm);
  color: var(--ax-color-text-tertiary);
  display: inline-flex; align-items: center; gap: var(--ax-space-2);
  margin: 0;
}
.hero__reassurance::before { content: ""; width: 14px; height: 1px; background: var(--ax-color-border-strong); }

.runflow {
  background: var(--ax-color-bg-surface);
  border: var(--ax-border-width) solid var(--ax-color-border);
  border-radius: var(--ax-radius-xl);
  padding: var(--ax-space-6);
  box-shadow: var(--ax-shadow-lg);
}
.runflow__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--ax-space-5); }
.runflow__title {
  font-size: var(--ax-text-xs); font-weight: 600;
  letter-spacing: var(--ax-tracking-wide); text-transform: uppercase;
  color: var(--ax-color-text-tertiary);
}
.runflow__id { font-family: var(--ax-font-mono); font-size: var(--ax-text-xs); color: var(--ax-color-text-tertiary); }

.runstage { display: grid; grid-template-columns: 18px 1fr; gap: var(--ax-space-4); }
.runstage + .runstage { margin-top: var(--ax-space-5); }
.runstage__rail { position: relative; display: flex; flex-direction: column; align-items: center; }
.runstage__dot {
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--ax-color-bg-surface);
  border: 2px solid var(--ax-color-border-strong);
  flex-shrink: 0; z-index: 1;
}
.runstage--active .runstage__dot   { border-color: var(--ax-color-success); background: var(--ax-color-success); }
.runstage--approved .runstage__dot { border-color: var(--ax-color-accent);  background: var(--ax-color-accent); }
.runstage__line { flex: 1; width: 1px; background: var(--ax-color-border); margin-top: var(--ax-space-2); }
.runstage:last-child .runstage__line { display: none; }

.runstage__body {
  background: var(--ax-color-bg-surface-alt);
  border: var(--ax-border-width) solid var(--ax-color-border);
  border-radius: var(--ax-radius-md);
  padding: var(--ax-space-4);
  min-width: 0;
}
.runstage__label {
  font-size: var(--ax-text-xs); font-weight: 500;
  letter-spacing: var(--ax-tracking-wide); text-transform: uppercase;
  color: var(--ax-color-text-tertiary);
  margin-bottom: var(--ax-space-2);
}
.runstage__row { display: flex; align-items: center; justify-content: space-between; gap: var(--ax-space-3); font-size: var(--ax-text-sm); }
.runstage__row + .runstage__row { margin-top: 4px; }
.runstage__key { color: var(--ax-color-text-tertiary); }
.runstage__value { font-weight: 500; text-align: right; }

.runstage__metrics {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px var(--ax-space-4);
  margin-top: var(--ax-space-3); padding-top: var(--ax-space-3);
  border-top: var(--ax-border-width) solid var(--ax-color-border);
}
.runstage__metric { display: flex; justify-content: space-between; font-size: var(--ax-text-xs); padding: 3px 0; }
.runstage__metric-key { color: var(--ax-color-text-tertiary); }
.runstage__metric-val { font-family: var(--ax-font-mono); font-weight: 500; }

.runstage__quote {
  margin: var(--ax-space-3) 0 0;
  padding: var(--ax-space-3) var(--ax-space-4);
  background: var(--ax-color-bg-surface);
  border-left: 2px solid var(--ax-color-accent);
  border-radius: 2px;
  font-size: var(--ax-text-sm);
  line-height: var(--ax-leading-snug);
  font-style: italic;
}
.runstage__quote-mark { font-family: var(--ax-font-mono); color: var(--ax-color-accent); font-style: normal; }

.runstage__attached {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: var(--ax-space-3);
  font-size: var(--ax-text-xs); font-weight: 500;
  color: var(--ax-color-success);
}
.runstage__attached-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ax-color-success); }

.loop { padding-block: var(--ax-space-20); border-top: var(--ax-border-width) solid var(--ax-color-border); }
.loop__intro { max-width: 640px; margin-bottom: var(--ax-space-12); }
.loop__title { margin: var(--ax-space-4) 0; }
.loop__lede { color: var(--ax-color-text-secondary); font-size: var(--ax-text-lg); }

.loop__steps {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--ax-space-8);
  list-style: none; padding: 0; margin: 0;
}
.loop__step { position: relative; padding-top: var(--ax-space-6); }
.loop__step::before {
  content: "";
  position: absolute; top: 11px; left: 0;
  right: calc(var(--ax-space-8) * -1);
  height: 1px; background: var(--ax-color-border);
}
.loop__step:last-child::before { right: 0; }
.loop__marker {
  position: absolute; top: 0; left: 0;
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--ax-color-bg-surface);
  border: 1px solid var(--ax-color-border-strong);
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--ax-font-mono); font-size: var(--ax-text-xs); font-weight: 500;
  z-index: 1;
}
.loop__step-title { font-size: var(--ax-text-base); font-weight: 600; letter-spacing: var(--ax-tracking-tight); margin: 0 0 var(--ax-space-2); }
.loop__step-desc { font-size: var(--ax-text-sm); color: var(--ax-color-text-secondary); line-height: var(--ax-leading-relaxed); margin: 0; }

.receipt {
  padding-block: var(--ax-space-20);
  border-top: var(--ax-border-width) solid var(--ax-color-border);
  scroll-margin-top: 88px;
}
.receipt__intro { max-width: 640px; margin-bottom: var(--ax-space-12); }
.receipt__title { margin: var(--ax-space-4) 0; }
.receipt__lede { color: var(--ax-color-text-secondary); font-size: var(--ax-text-lg); }

.receipt-card {
  background: var(--ax-color-bg-surface);
  border: var(--ax-border-width) solid var(--ax-color-border);
  border-radius: var(--ax-radius-xl);
  overflow: hidden;
  box-shadow: var(--ax-shadow-md);
  transition: box-shadow 220ms ease;
}
.receipt-card:hover { box-shadow: var(--ax-shadow-lg); }
.receipt-card__header {
  display: flex; align-items: center; justify-content: space-between; gap: var(--ax-space-3);
  padding: var(--ax-space-5) var(--ax-space-6);
  border-bottom: var(--ax-border-width) solid var(--ax-color-border);
  background: var(--ax-color-bg-surface-alt);
}
.receipt-card__header-left { display: flex; align-items: center; gap: var(--ax-space-3); }
.receipt-card__title {
  font-size: var(--ax-text-sm); font-weight: 600;
  letter-spacing: var(--ax-tracking-wide); text-transform: uppercase;
  color: var(--ax-color-text-secondary);
}
.receipt-card__runid { font-family: var(--ax-font-mono); font-size: var(--ax-text-xs); color: var(--ax-color-text-tertiary); }
.receipt-card__body { padding: var(--ax-space-6); }

.receipt-meta {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--ax-space-4) var(--ax-space-6);
  padding-bottom: var(--ax-space-6);
  border-bottom: var(--ax-border-width) solid var(--ax-color-border);
  margin: 0;
}
.receipt-meta__key {
  font-size: var(--ax-text-xs); letter-spacing: var(--ax-tracking-wide);
  text-transform: uppercase; color: var(--ax-color-text-tertiary); margin-bottom: 4px;
}
.receipt-meta__value { font-size: var(--ax-text-sm); font-weight: 500; margin: 0; }
.receipt-meta__value--mono { font-family: var(--ax-font-mono); }

.receipt-section { padding-top: var(--ax-space-6); }
.receipt-section + .receipt-section { margin-top: var(--ax-space-6); border-top: var(--ax-border-width) solid var(--ax-color-border); }
.receipt-section__title {
  font-size: var(--ax-text-xs); font-weight: 600;
  letter-spacing: var(--ax-tracking-wide); text-transform: uppercase;
  color: var(--ax-color-text-tertiary); margin: 0 0 var(--ax-space-4);
}

.receipt-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--ax-space-3) var(--ax-space-6); }
.receipt-metric {
  display: flex; justify-content: space-between; align-items: baseline; gap: var(--ax-space-2);
  padding: 6px 0; border-bottom: 1px dashed var(--ax-color-border);
}
.receipt-metric__key { font-size: var(--ax-text-sm); color: var(--ax-color-text-secondary); }
.receipt-metric__value { font-family: var(--ax-font-mono); font-size: var(--ax-text-sm); font-weight: 500; }

.receipt-evidence { display: flex; flex-direction: column; gap: var(--ax-space-2); }
.receipt-evidence__row {
  display: flex; align-items: center; justify-content: space-between; gap: var(--ax-space-3);
  padding: 8px var(--ax-space-3);
  background: var(--ax-color-bg-surface-alt);
  border-radius: var(--ax-radius-sm);
  font-size: var(--ax-text-sm);
}

.receipt-intel { display: grid; grid-template-columns: 1fr 1fr; gap: var(--ax-space-4); }
.receipt-intel__block {
  padding: var(--ax-space-4);
  background: var(--ax-color-bg-surface-alt);
  border: var(--ax-border-width) solid var(--ax-color-border);
  border-radius: var(--ax-radius-md);
}
.receipt-intel__label {
  font-size: var(--ax-text-xs); letter-spacing: var(--ax-tracking-wide);
  text-transform: uppercase; color: var(--ax-color-text-tertiary); margin-bottom: var(--ax-space-2);
}
.receipt-intel__value { font-size: var(--ax-text-base); font-weight: 500; margin-bottom: 2px; }
.receipt-intel__note { font-size: var(--ax-text-xs); color: var(--ax-color-text-secondary); }

.final {
  padding-block: var(--ax-space-24) var(--ax-space-20);
  border-top: var(--ax-border-width) solid var(--ax-color-border);
  text-align: center;
}
.final__inner { max-width: 680px; margin-inline: auto; }
.final__title {
  font-size: clamp(2rem, 4vw, var(--ax-text-4xl));
  font-weight: 600;
  line-height: 1.1; letter-spacing: -0.026em;
  margin: 0 0 var(--ax-space-5);
}
.final__lede { font-size: var(--ax-text-lg); color: var(--ax-color-text-secondary); margin-bottom: var(--ax-space-8); }
.final__actions { margin-bottom: var(--ax-space-6); display: flex; justify-content: center; }
.final__reassurance { font-size: var(--ax-text-sm); color: var(--ax-color-text-tertiary); max-width: 46ch; margin-inline: auto; }

.foot { padding-block: var(--ax-space-8); border-top: var(--ax-border-width) solid var(--ax-color-border); }
.foot__inner {
  display: flex; align-items: center; justify-content: space-between; gap: var(--ax-space-2);
  font-size: var(--ax-text-xs); color: var(--ax-color-text-tertiary);
}
.foot__mark { display: inline-flex; align-items: center; gap: var(--ax-space-2); }

@media (max-width: 1024px) {
  .gnsis-landing .hero__grid { gap: var(--ax-space-10); }
  .gnsis-landing .hero { padding-block: var(--ax-space-12) var(--ax-space-16); }
  .gnsis-landing .loop__steps { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--ax-space-6); row-gap: var(--ax-space-10); }
  .gnsis-landing .loop__step::before { right: calc(var(--ax-space-6) * -1); }
  .gnsis-landing .loop__step:nth-child(2)::before, .gnsis-landing .loop__step:last-child::before { right: 0; display: none; }
  .gnsis-landing .receipt-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 899px) {
  .gnsis-landing .hero__grid { grid-template-columns: 1fr; }
  .gnsis-landing .hero__copy { max-width: 620px; }
}
@media (max-width: 768px) {
  .gnsis-landing .hero { padding-block: var(--ax-space-10) var(--ax-space-12); }
  .gnsis-landing .hero__lede { font-size: var(--ax-text-base); }
  .gnsis-landing .hero__actions { flex-direction: column; align-items: stretch; }
  .gnsis-landing .hero__actions .ax-btn { width: 100%; }
  .gnsis-landing .loop, .gnsis-landing .receipt { padding-block: var(--ax-space-14); }
  .gnsis-landing .loop__steps { grid-template-columns: 1fr; gap: var(--ax-space-6); }
  .gnsis-landing .loop__step::before { display: none; }
  .gnsis-landing .receipt-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gnsis-landing .receipt-intel { grid-template-columns: 1fr; }
  .gnsis-landing .receipt-card__body { padding: var(--ax-space-5); }
  .gnsis-landing .receipt-card__header { padding: var(--ax-space-4) var(--ax-space-5); }
  .gnsis-landing .final { padding-block: var(--ax-space-16) var(--ax-space-12); }
  .gnsis-landing .final__actions .ax-btn { width: 100%; }
  .gnsis-landing .foot__inner { flex-direction: column; text-align: center; }
}
@media (max-width: 420px) {
  .gnsis-landing .receipt-meta { grid-template-columns: 1fr; }
  .gnsis-landing .receipt-metrics { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .gnsis-landing .ax-btn, .gnsis-landing .receipt-card { transition: none; }
  .gnsis-landing .ax-reveal { opacity: 1; transform: none; transition: none; }
}
`;

/* ---------------------------------------------------------------------------
   Analytics — existing surface only, no new dependency
--------------------------------------------------------------------------- */
type Tracker = { track?: (event: string, properties: Record<string, unknown>) => void };

function trackConnectGitHub(source: "nav" | "hero" | "final_cta"): void {
  const eventName = "landing_connect_github_clicked";
  const properties = { source };
  try {
    if (typeof window !== "undefined") {
      const w = window as unknown as { analytics?: Tracker; gnsis?: Tracker };
      if (w.analytics && typeof w.analytics.track === "function") {
        w.analytics.track(eventName, properties);
        return;
      }
      if (w.gnsis && typeof w.gnsis.track === "function") {
        w.gnsis.track(eventName, properties);
        return;
      }
    }
  } catch {
    /* never block navigation on analytics */
  }
}

/* ---------------------------------------------------------------------------
   Astryx-style primitives
--------------------------------------------------------------------------- */
type ButtonVariant = "primary" | "default" | "flat";

function AxButton({
  variant = "default",
  href,
  onClick,
  children,
  className = "",
}: {
  variant?: ButtonVariant;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const cls = `ax-btn ax-btn--${variant} ${className}`.trim();
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

function AxEyebrow({ className = "", children }: { className?: string; children: ReactNode }) {
  return <p className={`ax-eyebrow ${className}`.trim()}>{children}</p>;
}

function AxText({ className = "", children }: { className?: string; children: ReactNode }) {
  return <p className={`ax-text ${className}`.trim()}>{children}</p>;
}

function AxHeading({
  level = 2,
  className = "",
  children,
  id,
}: {
  level?: 2 | 3;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  const Tag = (`h${level}`) as "h2" | "h3";
  return (
    <Tag id={id} className={`ax-heading ax-heading--h${level} ${className}`.trim()}>
      {children}
    </Tag>
  );
}

function AxCard({
  className = "",
  children,
  ...rest
}: {
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`ax-card ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

type StatusTone = "success" | "warning" | "neutral";

function AxStatus({ tone = "neutral", children }: { tone?: StatusTone; children: ReactNode }) {
  return (
    <span className={`ax-status ax-status--${tone}`}>
      <span className="ax-status__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/* The single primary conversion action, reused on every surface. Routes into
   the app's real GitHub OAuth entry (/login) via the SPA router, after firing
   the analytics event. */
function ConnectGitHubButton({ source, className = "" }: { source: "nav" | "hero" | "final_cta"; className?: string }) {
  const navigate = useNavigate();
  return (
    <AxButton
      variant="primary"
      className={className}
      onClick={() => {
        trackConnectGitHub(source);
        navigate(CONNECT_GITHUB_URL);
      }}
    >
      <GitHubIcon />
      <span>Connect GitHub</span>
    </AxButton>
  );
}

/* Gentle viewport reveal; disabled under prefers-reduced-motion. When the
   browser can't observe intersections (or the visitor prefers reduced motion),
   the content is shown immediately via the lazy initial state, so no state is
   set synchronously inside the effect. */
function shouldRevealImmediately(): boolean {
  if (typeof window === "undefined") return true;
  if (typeof IntersectionObserver === "undefined") return true;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<boolean>(shouldRevealImmediately);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div ref={ref} className={`ax-reveal${shown ? " ax-reveal--in" : ""}${className ? " " + className : ""}`}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Sections
--------------------------------------------------------------------------- */
function LandingNav() {
  const navigate = useNavigate();
  return (
    <header className="nav">
      <div className="ax-container nav__inner">
        <button type="button" className="nav__brand" aria-label="GNSIS home" onClick={() => navigate(HOME_URL)}>
          <span className="brand-mark" aria-hidden="true" />
          <span>GNSIS</span>
        </button>
        <nav className="nav__actions" aria-label="Primary">
          <AxButton variant="flat" onClick={() => navigate(SIGN_IN_URL)}>
            Sign in
          </AxButton>
          <ConnectGitHubButton source="nav" />
        </nav>
      </div>
    </header>
  );
}

function RunStage({ tone, label, children }: { tone?: "active" | "approved"; label: string; children: ReactNode }) {
  const toneClass = tone ? ` runstage--${tone}` : "";
  return (
    <div className={`runstage${toneClass}`}>
      <div className="runstage__rail" aria-hidden="true">
        <span className="runstage__dot" />
        <span className="runstage__line" />
      </div>
      <div className="runstage__body">
        <div className="runstage__label">{label}</div>
        {children}
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <Reveal>
      <AxCard
        className="runflow"
        role="figure"
        aria-label="Product loop: a run produces a receipt, an approved intelligence item, and a later run with a different model that reuses it."
      >
        <div className="runflow__header">
          <span className="runflow__title">Repository loop</span>
          <span className="runflow__id">acme/api · main</span>
        </div>

        <RunStage tone="active" label="Run A">
          <div className="runstage__row">
            <span className="runstage__key">Model</span>
            <span className="runstage__value">Claude Sonnet</span>
          </div>
          <div className="runstage__row">
            <span className="runstage__key">Task</span>
            <span className="runstage__value">Fix authentication regression</span>
          </div>
          <div className="runstage__row">
            <span className="runstage__key">Status</span>
            <AxStatus tone="success">Complete</AxStatus>
          </div>
        </RunStage>

        <RunStage label="Receipt">
          <div className="runstage__metrics">
            <div className="runstage__metric">
              <span className="runstage__metric-key">Files changed</span>
              <span className="runstage__metric-val">2</span>
            </div>
            <div className="runstage__metric">
              <span className="runstage__metric-key">Tests passed</span>
              <span className="runstage__metric-val">8</span>
            </div>
            <div className="runstage__metric">
              <span className="runstage__metric-key">Tokens</span>
              <span className="runstage__metric-val">42,180</span>
            </div>
            <div className="runstage__metric">
              <span className="runstage__metric-key">Policy</span>
              <span className="runstage__metric-val">Passed</span>
            </div>
          </div>
        </RunStage>

        <RunStage tone="approved" label="Approved intelligence">
          <p className="runstage__quote">
            <span className="runstage__quote-mark">“</span>
            Authentication changes must use the shared session helper and include regression coverage.
            <span className="runstage__quote-mark">”</span>
          </p>
        </RunStage>

        <RunStage tone="active" label="Run B">
          <div className="runstage__row">
            <span className="runstage__key">Model</span>
            <span className="runstage__value">GPT-4o</span>
          </div>
          <div className="runstage__row">
            <span className="runstage__key">Task</span>
            <span className="runstage__value">Refactor session middleware</span>
          </div>
          <div className="runstage__row">
            <span className="runstage__key">Status</span>
            <AxStatus tone="success">Complete</AxStatus>
          </div>
          <span className="runstage__attached">
            <span className="runstage__attached-dot" aria-hidden="true" />
            Approved intelligence attached
          </span>
        </RunStage>
      </AxCard>
    </Reveal>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="ax-container">
        <div className="hero__grid">
          <div className="hero__copy">
            <AxEyebrow>Model-agnostic repository intelligence</AxEyebrow>
            <h1 id="hero-title" className="hero__title">
              Own the intelligence your coding agents create.
            </h1>
            <AxText className="hero__lede">
              Connect your repository and run the coding models you choose through GNSIS. Review what
              changed, approve what is trustworthy, and carry that intelligence into future runs—even
              when you switch models.
            </AxText>
            <div className="hero__actions">
              <ConnectGitHubButton source="hero" />
              <AxButton variant="default" href="#sample-receipt">
                View a sample receipt
              </AxButton>
            </div>
            <p className="hero__reassurance">Your model can change. Your repository intelligence stays.</p>
          </div>
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

const LOOP_STEPS = [
  { title: "Connect your repository", desc: "Select the GitHub repositories GNSIS may work with." },
  { title: "Run the model you choose", desc: "Submit a coding task using any supported model in the GNSIS catalogue." },
  { title: "Review the evidence", desc: "Inspect the patch, files changed, tests, model usage, policy checks, and run receipt." },
  { title: "Keep what was approved", desc: "Turn reviewed repository evidence into reusable intelligence for later runs and different models." },
];

function ProductLoop() {
  return (
    <section className="loop" aria-labelledby="loop-title">
      <div className="ax-container">
        <div className="loop__intro">
          <AxEyebrow>The loop</AxEyebrow>
          <AxHeading level={2} id="loop-title" className="loop__title">
            Four steps. One durable record.
          </AxHeading>
          <AxText className="loop__lede">
            Each run produces evidence. Approval turns evidence into intelligence. Intelligence outlives
            the model.
          </AxText>
        </div>

        <ol className="loop__steps" aria-label="Product loop steps">
          {LOOP_STEPS.map((step, idx) => (
            <li className="loop__step" key={step.title}>
              <span className="loop__marker" aria-hidden="true">
                {idx + 1}
              </span>
              <h3 className="loop__step-title">{step.title}</h3>
              <p className="loop__step-desc">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const RECEIPT_META: { key: string; value: string; mono?: boolean }[] = [
  { key: "Run ID", value: "run-2847", mono: true },
  { key: "Task", value: "Fix authentication regression" },
  { key: "Harness", value: "OpenHands" },
  { key: "Primary model", value: "Claude Sonnet" },
  { key: "Status", value: "Complete" },
  { key: "Duration", value: "43s", mono: true },
];

const RECEIPT_METRICS = [
  { key: "Tokens", value: "42,180" },
  { key: "Model calls", value: "6" },
  { key: "Tool calls", value: "7" },
  { key: "Files read", value: "14" },
  { key: "Files changed", value: "2" },
  { key: "Tests", value: "8 passed" },
];

const RECEIPT_EVIDENCE: { label: string; status: string; tone: StatusTone }[] = [
  { label: "Patch captured", status: "Passed", tone: "success" },
  { label: "Tests passed", status: "Passed", tone: "success" },
  { label: "Policy checks passed", status: "Passed", tone: "success" },
  { label: "Human approval required", status: "Review required", tone: "warning" },
];

function SampleReceipt() {
  return (
    <section id="sample-receipt" className="receipt" aria-labelledby="receipt-title">
      <div className="ax-container">
        <div className="receipt__intro">
          <AxEyebrow>Sample receipt</AxEyebrow>
          <AxHeading level={2} id="receipt-title" className="receipt__title">
            Every run leaves evidence.
          </AxHeading>
          <AxText className="receipt__lede">
            GNSIS connects the model’s activity to the repository changes, tests, policy result, usage,
            and intelligence consumed during the run.
          </AxText>
        </div>

        <Reveal>
          <AxCard className="receipt-card" aria-label="Sample run receipt">
            <header className="receipt-card__header">
              <div className="receipt-card__header-left">
                <span className="receipt-card__title">Run receipt</span>
                <span className="receipt-card__runid">run-2847</span>
              </div>
              <AxStatus tone="success">Complete</AxStatus>
            </header>

            <div className="receipt-card__body">
              <dl className="receipt-meta">
                {RECEIPT_META.map((item) => (
                  <div key={item.key}>
                    <dt className="receipt-meta__key">{item.key}</dt>
                    <dd className={`receipt-meta__value${item.mono ? " receipt-meta__value--mono" : ""}`}>
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="receipt-section">
                <h3 className="receipt-section__title">Metrics</h3>
                <div className="receipt-metrics">
                  {RECEIPT_METRICS.map((metric) => (
                    <div className="receipt-metric" key={metric.key}>
                      <span className="receipt-metric__key">{metric.key}</span>
                      <span className="receipt-metric__value">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="receipt-section">
                <h3 className="receipt-section__title">Evidence</h3>
                <div className="receipt-evidence">
                  {RECEIPT_EVIDENCE.map((row) => (
                    <div className="receipt-evidence__row" key={row.label}>
                      <span>{row.label}</span>
                      <AxStatus tone={row.tone}>{row.status}</AxStatus>
                    </div>
                  ))}
                </div>
              </div>

              <div className="receipt-section">
                <h3 className="receipt-section__title">Intelligence</h3>
                <div className="receipt-intel">
                  <div className="receipt-intel__block">
                    <div className="receipt-intel__label">Consumed</div>
                    <div className="receipt-intel__value">2 approved repository memories</div>
                    <div className="receipt-intel__note">Attached to this run before execution.</div>
                  </div>
                  <div className="receipt-intel__block">
                    <div className="receipt-intel__label">Candidate</div>
                    <div className="receipt-intel__value">1 evidence-backed lesson</div>
                    <div className="receipt-intel__note">Ready for review.</div>
                  </div>
                </div>
              </div>
            </div>
          </AxCard>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="final" aria-labelledby="final-title">
      <div className="ax-container">
        <div className="final__inner">
          <AxHeading level={2} id="final-title" className="final__title">
            Connect a repository. Keep the intelligence it creates.
          </AxHeading>
          <AxText className="final__lede">
            Run your first coding task through GNSIS and receive a complete, reviewable receipt.
          </AxText>
          <div className="final__actions">
            <ConnectGitHubButton source="final_cta" />
          </div>
          <p className="final__reassurance">
            Human approval remains required before intelligence is reused or code is published.
          </p>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="foot">
      <div className="ax-container foot__inner">
        <span className="foot__mark">
          <span className="brand-mark" aria-hidden="true" />
          <span>© GNSIS</span>
        </span>
        <span>Model-agnostic repository intelligence.</span>
      </div>
    </footer>
  );
}

/* ---------------------------------------------------------------------------
   Page root
--------------------------------------------------------------------------- */
export default function HomePage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "GNSIS — Model-agnostic repository intelligence";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="gnsis-landing">
      <style>{ASTRYX_CSS}</style>
      <div className="page">
        <LandingNav />
        <main id="main">
          <Hero />
          <ProductLoop />
          <SampleReceipt />
          <FinalCta />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
