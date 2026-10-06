# AGENTS.md

Project-specific guidance for AI coding agents.

## One shared React UI system

All repository-owned React surfaces use Beautiful UI (MIT, pinned upstream
44a274e598395ab61e7c96c26fda2758780253b7) + Lucide + Tailwind v4 and the
source-derived shared primitives in `src/components/ui/`. This
includes `/login`, the authenticated control plane under `/admin`, every
page in `src/panoptic/`, and new interfaces. There are no page-specific
control-library exemptions.

- Inspect the existing shared primitives before adding a control. Buttons,
  inputs, textareas, dialogs, menus, selects, tooltips, avatars, chat and code
  views belong in `src/components/ui/`; reuse them across surfaces.
- Use Radix for established interaction patterns such as dialog focus traps,
  dismissal, menus and selection. Do not reimplement those behaviors or copy
  another design system's components/APIs.
- Use accessible semantic HTML for layout: headers, navigation, sections,
  lists, forms and meaningful labels. Ordinary `div`/`span` containers are
  fine where no semantic element fits; do not wrap every layout element in
  an unnecessary component.
- Read upstream README, registry and source, not a gallery screenshot. Beautiful
  UI is a copy-paste library; its registry happens to use the shadcn installer
  format, but that is not permission to substitute generic shadcn styling.
  Do not install Astryx, Central/commercial icons, iconoir or demo analytics.
- Use the official foundation in `src/styles/beautiful-foundation.css`, imported
  once in `src/index.css`. Tailwind is CSS-first v4; do not restore v3 directives,
  @config or plugin loaders. Migration utility names alias Beautiful tokens;
  they are not a second palette. Colors are full oklch: never hsl(var(--accent)).
- The console uses `.dark` and `UIThemeProvider theme="dark"`; Radix portals
  carry that same scope. Public decorative `--pn-*` brand tokens may remain,
  but every React control uses Beautiful tokens, tight radii and shadows.
- Prefer canonical Button variants primary/secondary/ghost/accent/success/quiet
  and sizes xs/sm/md. Legacy default/outline/destructive/link/plain and
  default/icon/lg/plain sizes are migration compatibility in one implementation,
  not a second unthemed control system. Input/Textarea `plain` is geometry-only.
- Use `lucide-react` for all UI glyphs and utility icons. Give icon-only
  buttons an accessible name; hide decorative icons from assistive tech.
  Brand logos and supplied artwork remain unchanged, not redrawn as icons.
  Replace utility hand SVGs and simple-icons with Lucide. TikTok has no Lucide
  logo: use generic Video plus the readable platform name, not a fake official mark.
- Use the controlled shared `ChatComposer` for multiline message entry:
  Enter sends, Shift+Enter inserts a newline, and IME composition cannot
  submit. Submission/loading/error state and success-only clearing remain
  the caller's responsibility. Never silently discard a failed draft.
- Console resizing uses `react-resizable-panels` pinned to stable `2.1.9`
  through `src/components/ui/resizable.tsx`, not a custom drag/resize hook.
- Preserve reduced-motion behavior, keyboard operation, form labels,
  readable/copyable code and existing behavior tests. Do not weaken tests to
  conceal a migration regression. No real backend/AI integration should be
  invented for demo-only experiences.

## Protected vendored live surface

Do not edit `public/live.html`, `public/assets/live.css`,
`public/assets/live.js`, `public/assets/mic-worklet.js` or anything under
`public/assets/live/` here. They are a byte-for-byte copy of the GNSIS
runtime's live page from GNSISBACKEND
`runtime/minicpm_ft/mcpmft/infer/static/`, not repository-owned React UI.

The same non-React files must run both in the unbundled FastAPI runtime and
on this domain. The owner's instruction is to use the existing page, not
reimplement it; its colours, typography, radii and motion follow GNSIS Brand
Guidelines v2, cited in `live.css`. Changes belong upstream in the runtime.
Refresh this copy wholesale using the command in `public/README.md`; local
edits would silently diverge it from the page the runtime serves.

## Public surfaces, routing, privacy and branding

`src/panoptic/` contains the Video Search landing (`/video-search`, or `/`
when `GNSIS_HOME_EXPERIENCE=video-search`), agentic web steering
(`/use-cases/agentic-web-steering`), `/privacy` and `/terms`. These public
pages render outside the console's session and dark scope (see `main.tsx`),
but use the same shared React primitives. They are dormant, unlinked and
noindex until Video Search is the home experience. With the default `live`
home experience, Caddy serves the runtime live page at `/`; this React
bundle does not serve that home page.

Preserve Panoptic content, footage/copy/CC/scrub behavior, decorative geometry,
warm backgrounds and supplied branding. React controls are not exempt from the
shared Beautiful UI system. Panoptic's decorative typography remains Helvetica
Neue falling back to self-hosted Inter Tight. Its named `--pn-*` brand tokens are in
`src/panoptic/tokens.css`; public styles remain scoped, not leaked into the
console. Public motion comes from `motion` (Motion for React), remains small,
and is switched off under reduced motion.

Public forms post to the auth service (`auth-service/src/intake.ts`), which
stores early-access sign-ups and contact messages in separate tables.
`/privacy` describes exactly what those forms and pages collect: update it
alongside any change to collection. Keep the public surface separate from
operator sign-in and the authenticated control plane.

Each public page's title and link preview are defined once in
`src/panoptic/pageMeta.ts`. Preview clients read served HTML without running
the bundle, so `panopticPageHtml` in `vite.config.ts` writes each page its own
`index.html` with the metadata block swapped in, and the Caddyfile serves
that copy at the page's address. The console's title and preview stay in
`index.html`.

`public/og/genesis-preview.png` is the owner's horizontal genesis lockup
placed unaltered on Paper (#F7F6F2), as the genesis logo guidelines require.
If the logo changes, re-export it from the master SVG; never redraw it.
The live page's title and preview (`/`, `/live`) belong to GNSISBACKEND, like
the rest of that page. Existing brand artwork assets must remain unchanged.
