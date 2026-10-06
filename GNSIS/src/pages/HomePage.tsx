// Public repository-intelligence marketing. The only conversion routes to the
// existing GitHub OAuth flow; repository grants remain a separate GitHub App step.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Github } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { UIThemeProvider } from "@/components/ui/theme";

const SIGN_IN_URL = "/login?next=%2Fnew";
const CONNECT_GITHUB_URL = SIGN_IN_URL;
const HOME_URL = "/";
const CONTAINER = "mx-auto max-w-7xl px-4 md:px-6 lg:px-10";
const EYEBROW = "text-xs font-medium uppercase tracking-widest text-ink-3";
const HEADING = "text-3xl font-semibold tracking-tight leading-tight text-ink";
const LEDE = "text-lg leading-relaxed text-ink-2";
const PANEL = "rounded-window bg-surface shadow-card";

type Tracker = { track?: (event: string, properties: Record<string, unknown>) => void };
function trackConnectGitHub(source: "nav" | "hero" | "final_cta"): void {
  try {
    const w = window as unknown as { analytics?: Tracker; gnsis?: Tracker };
    const tracker = typeof w.analytics?.track === "function" ? w.analytics : w.gnsis;
    tracker?.track?.("landing_connect_github_clicked", { source });
  } catch { /* analytics must never block navigation */ }
}
function ConnectGitHubButton({ source }: { source: "nav" | "hero" | "final_cta" }) {
  const navigate = useNavigate();
  return <Button variant="primary" onClick={() => { trackConnectGitHub(source); navigate(CONNECT_GITHUB_URL); }}>
    <Github aria-hidden="true" /><span>Connect GitHub</span>
  </Button>;
}
function shouldRevealImmediately(): boolean {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return true;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(shouldRevealImmediately);
  useEffect(() => {
    if (shown || !ref.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [shown]);
  return <div ref={ref} className={`transition-[opacity,transform] duration-500 motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:transition-none ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2.5"}`}>{children}</div>;
}

function LandingNav() {
  const navigate = useNavigate();
  return <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
    <div className={`${CONTAINER} flex h-16 items-center justify-between gap-2`}>
      <Button variant="quiet" className="px-0 text-lg font-semibold" aria-label="GNSIS home" onClick={() => navigate(HOME_URL)}>
        <span className="relative size-[22px] shrink-0 rounded-chip bg-ink after:absolute after:inset-[5px] after:rounded-sm after:bg-canvas" aria-hidden="true" /><span>GNSIS</span>
      </Button>
      <nav className="flex items-center gap-2" aria-label="Primary">
        <Button variant="quiet" onClick={() => navigate(SIGN_IN_URL)}>Sign in</Button>
        <ConnectGitHubButton source="nav" />
      </nav>
    </div>
  </header>;
}
function RunStage({ tone, label, children }: { tone?: "active" | "approved"; label: string; children: ReactNode }) {
  return <div className="grid grid-cols-[auto_1fr] gap-4">
    <div className="relative flex flex-col items-center" aria-hidden="true">
      <span className={`z-10 size-3 shrink-0 rounded-full border-2 ${tone === "active" ? "border-green bg-green" : tone === "approved" ? "border-accent bg-accent" : "border-line-strong bg-surface"}`} />
      <span className="mt-2 w-px flex-1 bg-line" />
    </div>
    <div className="min-w-0 rounded-control bg-inset p-4 shadow-hairline">
      <div className={`${EYEBROW} mb-2`}>{label}</div>{children}
    </div>
  </div>;
}
function HeroVisual() {
  return <Reveal><figure className={`${PANEL} p-5 md:p-6`} aria-label="Product loop: a run produces a receipt, an approved intelligence item, and a later run with a different model that reuses it.">
    <div className="mb-5 flex items-center justify-between gap-3">
      <span className={EYEBROW}>Repository loop</span><span className="font-mono text-xs text-ink-3">acme/api · main</span>
    </div>
    <div className="space-y-5">
      <RunStage tone="active" label="Run A">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-ink-3">Model</dt><dd className="text-right font-medium">Claude Sonnet</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-3">Task</dt><dd className="text-right font-medium">Fix authentication regression</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-3">Status</dt><dd className="text-green">Complete</dd></div>
        </dl>
      </RunStage>
      <RunStage label="Receipt"><dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 text-xs">
        {[["Files changed", "2"], ["Tests passed", "8"], ["Tokens", "42,180"], ["Policy", "Passed"]].map(([label, value]) => <div key={label} className="flex justify-between gap-2"><dt className="text-ink-3">{label}</dt><dd className="font-mono font-medium">{value}</dd></div>)}
      </dl></RunStage>
      <RunStage tone="approved" label="Approved intelligence"><blockquote className="rounded-chip border-l-2 border-accent bg-surface px-4 py-3 text-sm italic leading-snug">“Authentication changes must use the shared session helper and include regression coverage.”</blockquote></RunStage>
      <RunStage tone="active" label="Run B">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-ink-3">Model</dt><dd className="font-medium">GPT-4o</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-3">Task</dt><dd className="text-right font-medium">Refactor session middleware</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-3">Status</dt><dd className="text-green">Complete</dd></div>
        </dl><p className="mt-3 text-xs font-medium text-green">Approved intelligence attached</p>
      </RunStage>
    </div>
  </figure></Reveal>;
}
function Hero() {
  return <section className="pb-20 pt-16 max-md:pb-12 max-md:pt-10" aria-labelledby="hero-title">
    <div className={CONTAINER}><div className="grid items-center gap-12 lg:grid-cols-[46fr_54fr]">
      <div className="max-w-xl">
        <p className={EYEBROW}>Model-agnostic repository intelligence</p>
        <h1 id="hero-title" className="mb-6 mt-5 text-4xl font-semibold leading-tight lg:text-5xl tracking-tight">Own the intelligence your coding agents create.</h1>
        <p className={`${LEDE} mb-8 max-w-[52ch]`}>Connect your repository and run the coding models you choose through GNSIS. Review what changed, approve what is trustworthy, and carry that intelligence into future runs—even when you switch models.</p>
        <div className="mb-5 flex flex-wrap gap-3"><ConnectGitHubButton source="hero" /><Button variant="secondary" asChild><a href="#sample-receipt">View a sample receipt</a></Button></div>
        <p className="text-sm text-ink-3">Your model can change. Your repository intelligence stays.</p>
      </div><HeroVisual />
    </div></div>
  </section>;
}
const LOOP_STEPS = [
  { title: "Connect your repository", desc: "Select the GitHub repositories GNSIS may work with." },
  { title: "Run the model you choose", desc: "Submit a coding task using any supported model in the GNSIS catalogue." },
  { title: "Review the evidence", desc: "Inspect the patch, files changed, tests, model usage, policy checks, and run receipt." },
  { title: "Keep what was approved", desc: "Turn reviewed repository evidence into reusable intelligence for later runs and different models." },
];
function ProductLoop() {
  return <section className="border-t border-line py-20 max-md:py-12" aria-labelledby="loop-title"><div className={CONTAINER}>
    <div className="mb-12 max-w-2xl"><p className={EYEBROW}>The loop</p><h2 id="loop-title" className={`${HEADING} my-4`}>Four steps. One durable record.</h2><p className={LEDE}>Each run produces evidence. Approval turns evidence into intelligence. Intelligence outlives the model.</p></div>
    <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4" aria-label="Product loop steps">
      {LOOP_STEPS.map((step, idx) => <li key={step.title}><span className="mb-4 inline-flex size-6 items-center justify-center rounded-full bg-surface font-mono text-xs shadow-hairline" aria-hidden="true">{idx + 1}</span><h3 className="mb-2 font-semibold tracking-tight">{step.title}</h3><p className="text-sm leading-relaxed text-ink-2">{step.desc}</p></li>)}
    </ol>
  </div></section>;
}
const RECEIPT_META = [
  { key: "Run ID", value: "run-2847", mono: true }, { key: "Task", value: "Fix authentication regression" },
  { key: "Harness", value: "OpenHands" }, { key: "Primary model", value: "Claude Sonnet" },
  { key: "Status", value: "Complete" }, { key: "Duration", value: "43s", mono: true },
];
const RECEIPT_METRICS = [
  { key: "Tokens", value: "42,180" }, { key: "Model calls", value: "6" }, { key: "Tool calls", value: "7" },
  { key: "Files read", value: "14" }, { key: "Files changed", value: "2" }, { key: "Tests", value: "8 passed" },
];
const RECEIPT_EVIDENCE = [
  { label: "Patch captured", status: "Passed", tone: "text-green" }, { label: "Tests passed", status: "Passed", tone: "text-green" },
  { label: "Policy checks passed", status: "Passed", tone: "text-green" }, { label: "Human approval required", status: "Review required", tone: "text-orange" },
];
function SampleReceipt() {
  return <section id="sample-receipt" className="scroll-mt-24 border-t border-line py-20 max-md:py-12" aria-labelledby="receipt-title"><div className={CONTAINER}>
    <div className="mb-12 max-w-2xl"><p className={EYEBROW}>Sample receipt</p><h2 id="receipt-title" className={`${HEADING} my-4`}>Every run leaves evidence.</h2><p className={LEDE}>GNSIS connects the model’s activity to the repository changes, tests, policy result, usage, and intelligence consumed during the run.</p></div>
    <Reveal><section className={`${PANEL} overflow-hidden`} aria-label="Sample run receipt">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-inset px-6 py-5"><div className="flex items-center gap-3"><span className={EYEBROW}>Run receipt</span><span className="font-mono text-xs text-ink-3">run-2847</span></div><span className="text-xs font-medium text-green">Complete</span></header>
      <div className="p-5 md:p-6">
        <dl className="grid gap-x-6 gap-y-4 border-b border-line pb-6 sm:grid-cols-3">{RECEIPT_META.map((item) => <div key={item.key}><dt className={`${EYEBROW} mb-1`}>{item.key}</dt><dd className={`text-sm font-medium ${item.mono ? "font-mono" : ""}`}>{item.value}</dd></div>)}</dl>
        <section className="pt-6"><h3 className={`${EYEBROW} mb-4`}>Metrics</h3><dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{RECEIPT_METRICS.map((metric) => <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-line py-1.5" key={metric.key}><dt className="text-sm text-ink-2">{metric.key}</dt><dd className="font-mono text-sm font-medium">{metric.value}</dd></div>)}</dl></section>
        <section className="mt-6 border-t border-line pt-6"><h3 className={`${EYEBROW} mb-4`}>Evidence</h3><ul className="space-y-2">{RECEIPT_EVIDENCE.map((row) => <li className="flex items-center justify-between gap-3 rounded-chip bg-inset px-3 py-2 text-sm" key={row.label}><span>{row.label}</span><span className={`text-xs font-medium ${row.tone}`}>{row.status}</span></li>)}</ul></section>
        <section className="mt-6 border-t border-line pt-6"><h3 className={`${EYEBROW} mb-4`}>Intelligence</h3><div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-control bg-inset p-4 shadow-hairline"><p className={`${EYEBROW} mb-2`}>Consumed</p><p className="font-medium">2 approved repository memories</p><p className="text-xs text-ink-2">Attached to this run before execution.</p></div>
          <div className="rounded-control bg-inset p-4 shadow-hairline"><p className={`${EYEBROW} mb-2`}>Candidate</p><p className="font-medium">1 evidence-backed lesson</p><p className="text-xs text-ink-2">Ready for review.</p></div>
        </div></section>
      </div>
    </section></Reveal>
  </div></section>;
}
function FinalCta() {
  return <section className="border-t border-line pb-20 pt-24 text-center max-md:py-12" aria-labelledby="final-title"><div className={CONTAINER}><div className="mx-auto max-w-2xl">
    <h2 id="final-title" className="mb-5 text-3xl lg:text-4xl font-semibold leading-tight tracking-tight">Connect a repository. Keep the intelligence it creates.</h2>
    <p className={`${LEDE} mb-8`}>Run your first coding task through GNSIS and receive a complete, reviewable receipt.</p>
    <div className="mb-6 flex justify-center"><ConnectGitHubButton source="final_cta" /></div><p className="mx-auto max-w-[46ch] text-sm text-ink-3">Human approval remains required before intelligence is reused or code is published.</p>
  </div></div></section>;
}
function LandingFooter() {
  return <footer className="border-t border-line py-8"><div className={`${CONTAINER} flex items-center justify-between gap-2 text-xs text-ink-3 max-md:flex-col max-md:text-center`}><span>© GNSIS</span><span>Model-agnostic repository intelligence.</span></div></footer>;
}
export default function HomePage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "GNSIS — Model-agnostic repository intelligence";
    return () => { document.title = previous; };
  }, []);
  return <UIThemeProvider theme="light"><div className="gnsis-landing light flex min-h-screen flex-col bg-canvas font-sans text-ink antialiased"><LandingNav /><main id="main"><Hero /><ProductLoop /><SampleReceipt /><FinalCta /></main><LandingFooter /></div></UIThemeProvider>;
}
