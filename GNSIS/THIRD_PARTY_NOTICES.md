# Beautiful UI source and adaptations

Beautiful UI by Shane Levine is MIT licensed. The complete upstream license is
in `BEAUTIFUL_UI_LICENSE`. This frontend vendors actual copy-paste sources at
commit `44a274e598395ab61e7c96c26fda2758780253b7`, not a published React package
or another design system made to look similar. React, Vite and router remain.

## Pinned sources

- [README](https://github.com/slev12397/beautiful-ui/blob/44a274e598395ab61e7c96c26fda2758780253b7/README.md)
- [Button](https://github.com/slev12397/beautiful-ui/blob/44a274e598395ab61e7c96c26fda2758780253b7/components/atoms/Button.tsx) → `src/components/ui/button.tsx`
- [ChatComposer](https://github.com/slev12397/beautiful-ui/blob/44a274e598395ab61e7c96c26fda2758780253b7/components/primitives/ChatComposer.tsx) → `src/components/ui/chat.tsx`, `src/components/ui/chat-composer.tsx`
- [CodeBlock](https://github.com/slev12397/beautiful-ui/blob/44a274e598395ab61e7c96c26fda2758780253b7/components/primitives/CodeBlock.tsx) → `src/components/ui/code-block.tsx`
- [PromptBar](https://github.com/slev12397/beautiful-ui/blob/44a274e598395ab61e7c96c26fda2758780253b7/components/primitives/PromptBar.tsx) → the `pill` variant of `src/components/ui/chat-composer.tsx`
- [StatusPill](https://github.com/slev12397/beautiful-ui/blob/44a274e598395ab61e7c96c26fda2758780253b7/components/atoms/StatusPill.tsx) → `src/components/ui/status-pill.tsx`
- [LoadingState](https://github.com/slev12397/beautiful-ui/blob/44a274e598395ab61e7c96c26fda2758780253b7/components/primitives/LoadingState.tsx) → `src/components/ui/loading-state.tsx`
- [Registry foundation](https://github.com/slev12397/beautiful-ui/blob/44a274e598395ab61e7c96c26fda2758780253b7/public/r/foundation.json) → `src/styles/beautiful-foundation.css`
- [Registry builder](https://github.com/slev12397/beautiful-ui/blob/44a274e598395ab61e7c96c26fda2758780253b7/scripts/build-registry.mjs)
- [LICENSE](https://github.com/slev12397/beautiful-ui/blob/44a274e598395ab61e7c96c26fda2758780253b7/LICENSE)

## Honest adaptation notes

The upstream installer uses shadcn's registry *format*, not the shadcn component
style as a replacement. `components.json` registers `@beautiful-ui` at
`https://www.beautifului.dev/r/{name}.json` and leaves the Tailwind v4 config
path empty. Its required `style` field is installer metadata only. All React
controls share the Beautiful foundation, including video and console surfaces.

- **Foundation:** we vendor the official `foundation.json` CSS content exactly,
  including tokens, @theme, tight radii, semantic layered shadows, spacing
  utilities, keyframes and reduced motion. The large gallery RecordsTable and
  SidebarNav stylesheet blocks are NOT copied; small component/hygiene rules
  included by the official registry foundation are retained. The README's
  manual setup describes copying `globals.css` in full; the installer instead
  splits foundation from the large SidebarNav/RecordsTable component CSS
  (see `scripts/build-registry.mjs`, lines 11–16). We consume the checked-in
  registry foundation, not the gallery stylesheet or regenerated numeric slices.
  `src/index.css` imports it once, loads self-hosted Inter/JetBrains Mono,
  disables the gallery body's decorative stripes, and
  maps old utility names directly to upstream colors/radii (no old palette).
  Upstream colors are full oklch values; never wrap them in `hsl(...)`.
- **Button:** canonical classes, primary/secondary/ghost/accent/success/quiet
  variants and xs/sm/md sizes are upstream. Added ref, Radix Slot `asChild`,
  safe default `type="button"`, explicit keyboard focus and Lucide sizing.
  Migration aliases: default → primary, outline → secondary, link → quiet
  with underline, plain → quiet; destructive uses upstream red. Size default
  and plain → md, icon adds a square control, lg adds a larger action pill.
  Prefer the canonical API in new callers; compatibility never bypasses theme.
- **Chat:** extracted the real upstream header/conversation/composer hierarchy
  and Section metadata/body into composable named exports. Right-aligned user
  bubbles keep soft field fill; assistant replies stay unboxed. Removed all
  flavor data, suggested flavor tabs, initial prompts, scripted phase/reply
  timers and action buttons without handlers. No fake replies are generated.
  A controlled multiline textarea replaces the demo input, with semantic log,
  label, disabled/loading, model/footer slots, IME-safe Enter/Shift+Enter and
  Lucide ArrowUp. Caller owns answers, errors and success-only draft clearing.
  Legacy plain/tone names are compatibility geometry, not a new aesthetic.
- **PromptBar pill:** `ChatComposer variant="pill"` is PromptBar's Pill geometry
  (one row, full radius, surface fill, card shadow, round send) with an
  optional `leading` slot for a Lucide icon. The @-source, /-command, model
  and dictation menus and the glimm shader are not vendored.
- **StatusPill:** upstream classes and five tones unchanged; `dot` may be
  switched off for a plain label such as a result rank.
- **LoadingState:** Drive/Dots/Orbit loader grids, shimmer label and elapsed
  timer are upstream. The gallery's Surfer meme-video variant, Vercel Blob URL
  and default "Churning" label are not vendored; `label` is required and the
  timer can be hidden.
- **CodeBlock:** preserves upstream keyword/function/string/number highlighting,
  diff row/piece rendering, gutters, word add/del tint, hatching, filename header
  and wrap behavior. Removed all default churn/flavor source/diff/filename data.
  Raw code derives displayed lines if lines are not provided. Added optional
  maxHeight, wrapping toggle, legacy collapse, keyboard-scroll region, accessible
  copy/error status, clipboard failure handling and timer/unmount cleanup.
  Copy uses exact raw code; `onCopy(text: string)` fires only after successful
  clipboard write and replaces, rather than intersects, the native figure
  clipboard-event prop.
  No code evaluation, backend connection, AI or new demo contract is introduced.
- **Headless gaps:** Input/Textarea and Radix Dialog, menu, Select, Tooltip and
  Avatar wrappers use Beautiful field/surface/ink/line tokens, chip/control/
  card/window radii and semantic shadows. Radix supplies interaction, not a
  second visual system. `UIThemeProvider` carries dark scope into portals.
  Stable `react-resizable-panels@2.1.9` retains accessible resizing.
- **Icons:** all utility SVGs in adapted upstream components are Lucide.
  No paid Central icons, iconoir, glimm, analytics, email capture or upstream
  Next.js dependencies are added. Supplied branding artwork is not redrawn.

## Shared component contracts

- `Button`, `buttonVariants`, `ButtonProps`, `ButtonVariant`: canonical and
  migration variants/sizes above; native button props, forwarded ref, `asChild`.
- `ChatPanel({ header?, children, ...sectionProps })`: upstream window shell
  with optional real header actions. `ChatMessageList({ spacing?, ...sectionProps })`
  is a polite live conversation log (compact default; comfortable optional).
- `ChatMessage({ speaker: "user" | "assistant", avatar?, children, ...articleProps })`;
  `ChatMessageBubble({ tone?: "filled" | "subtle" | "plain", metadata?, children })`:
  filled/subtle share upstream field styling; plain is unboxed reply content.
- `ChatReply({ label?, sub?, time?, body?: ReactNode, resolving?, children?, ...divProps })`
  is upstream Section with real data only. `ChatSystemMessage` takes paragraph
  props and has status semantics. Panel/list/message/bubble/reply `*Props` types
  are exported.
- `ChatComposer({ value, onValueChange, onSubmit(value), label, placeholder?,
  submitLabel?, disabled?, loading?, submitDisabled?, footer?, modelPicker?,
  footerClassName?, submitClassName?, textareaProps?, variant?, ...formProps })`.
  Callback receives trimmed nonempty text. It NEVER clears drafts. Return value
  is not interpreted: caller manages submission result and pending state.
  `textareaProps` supports rows, id, className, aria-describedby and event
  handlers, excluding controlled value/change/disabled/label overrides.
- `CodeBlock` (named and default), `CodeBlockProps`, `CodePiece`, `DiffRow`,
  `CodeBlockLabels`: `code?`, `lines?`, `filename?`, `language?`, `variant?:
  "Code" | "Diff"`, `diff?`, `labels?`, `onCopy?`, `wrap?` (true default),
  `maxHeight?` (320 default), `collapsible?`, `defaultExpanded?`, `copyLabel?`,
  native figure props. No input data means empty code, not a demo fixture.
- `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`: v2 direction,
  percentage panel sizes, `withHandle?`, descriptive `aria-label`, imperative
  panel/group handle types. Library owns keyboard, pointer and touch behavior.
- Existing Input/Textarea/Radix exports remain compatible. Use real labels and
  actual action callbacks in both consuming surfaces, not inert demo controls.
