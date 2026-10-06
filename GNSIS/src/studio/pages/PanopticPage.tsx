import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, Bot, Eye, Globe, MousePointer2, ScanEye, ShieldCheck, Timer, Waves } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { PANOPTIC_MODEL_META } from "@/panoptic/pageMeta";
import { usePageMeta } from "@/panoptic/usePageMeta";
import { STUDIO_PATHS } from "../config";
import { useEarlyAccess } from "../earlyAccess";
import { StudioFooter } from "../components/Footer";
import { StudioNav } from "../components/Nav";
import { Eyebrow, RevealSection, RiseLines } from "../components/Reveal";
import { VisionOrb } from "../components/VisionOrb";
import { StatusPill } from "../ui/StatusPill";
import { StreamText } from "../ui/StreamText";
import { ThinkingState } from "../ui/ThinkingState";
import { buttonArrow, studioButton } from "../ui/variants";

const EASE = [0.23, 1, 0.32, 1] as const;

const SECTIONS = [
  { id: "intro", label: "Intro" },
  { id: "problem", label: "The problem" },
  { id: "cost", label: "The cost" },
  { id: "layer", label: "The missing layer" },
  { id: "run", label: "An agent run" },
  { id: "outcome", label: "The outcome" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** Which chapter is in the middle of the viewport. */
function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>("intro");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const match = SECTIONS.find((section) => section.id === entry.target.id);
          if (entry.isIntersecting && match) setActive(match.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const section of SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  return active;
}

function scrollToSection(id: SectionId, reduce: boolean) {
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

function SectionNav({ active }: { active: SectionId }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <aside className="hidden lg:block">
      <nav aria-label="On this page" className="sticky top-28 pt-24">
        <ol className="inline-flex flex-col gap-0.5 rounded-[14px] bg-hover p-1 shadow-[inset_0_0_0_1px_var(--line)]">
          {SECTIONS.map((section) => {
            const current = section.id === active;
            return (
              <li key={section.id} className="relative">
                {current && (
                  <motion.span
                    aria-hidden
                    layoutId="studio-section-tab"
                    className="absolute inset-0 rounded-[10px] bg-surface shadow-[0_0_0_1px_var(--line),0_1px_2px_oklch(0_0_0/0.06),0_2px_6px_-2px_oklch(0_0_0/0.08)]"
                    transition={{ type: "spring", stiffness: 520, damping: 42 }}
                  />
                )}
                <a
                  href={`#${section.id}`}
                  aria-current={current ? "location" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(section.id, reduce);
                  }}
                  className={cn(
                    "relative block whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[13px] font-medium transition-[color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_2px_var(--signal)]",
                    current ? "text-ink" : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  {section.label}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}

function Chapter({ id, eyebrow, title, children }: { id: SectionId; eyebrow: string; title: ReactNode; children: ReactNode }) {
  return (
    <RevealSection id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-line py-20 sm:py-28">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={`${id}-title`} className="mt-4 max-w-2xl font-display text-[36px] leading-[1.08] tracking-[-0.015em] text-ink sm:text-[48px]">
        {title}
      </h2>
      {children}
    </RevealSection>
  );
}

function Hero() {
  const { open } = useEarlyAccess();
  const reduce = useReducedMotion() ?? false;
  return (
    <section id="intro" aria-labelledby="intro-title" className="grid scroll-mt-20 items-center gap-10 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:pb-28">
      <div>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <StatusPill tone="signal" live>
            Panoptic · from GNSIS
          </StatusPill>
        </motion.div>
        <h1 id="intro-title" className="mt-6 font-display text-[56px] leading-[0.98] tracking-[-0.025em] text-ink sm:text-[84px]">
          <RiseLines lines={["Persistent vision", "for agents."]} delay={0.08} />
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
          className="mt-7 max-w-md text-[18px] leading-relaxed text-ink-2"
        >
          Panoptic watches the screen continuously and keeps visual context alive between actions, so your agent always
          knows what’s there.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => open("panoptic:hero")}
            className={studioButton({ variant: "accent", size: "lg" })}
          >
            Get early access
            <ArrowRight aria-hidden className={buttonArrow} />
          </motion.button>
          <a
            href="#layer"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("layer", reduce);
            }}
            className={studioButton({ variant: "quiet", size: "lg" })}
          >
            How it works
            <ArrowDown aria-hidden className="size-4 transition-transform duration-200 ease-out-strong group-hover/button:translate-y-0.5" />
          </a>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
      >
        <VisionOrb />
      </motion.div>
    </section>
  );
}

type FrameState = "loads" | "changes" | "lost";

function MiniBrowser({ state, play }: { state: FrameState; play: boolean }) {
  return (
    <div aria-hidden className="relative aspect-[16/10] overflow-hidden rounded-[12px] bg-surface shadow-card">
      <div className="flex items-center gap-1 border-b border-line px-2.5 py-2">
        <span className="size-1.5 rounded-full bg-line-strong" />
        <span className="size-1.5 rounded-full bg-line-strong" />
        <span className="size-1.5 rounded-full bg-line-strong" />
      </div>
      <div className="relative grid h-[calc(100%-25px)] grid-cols-[1fr_1.1fr] gap-2.5 p-3">
        <div className="space-y-1.5">
          <span className="block h-1.5 w-4/5 rounded-full bg-hover-2" />
          <span className="block h-1.5 w-3/5 rounded-full bg-hover-2" />
          <span className="block h-1.5 w-2/3 rounded-full bg-hover-2" />
        </div>
        {state === "loads" && (
          <motion.span
            className="block rounded-md border border-signal bg-signal-tint"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={play ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
          />
        )}
        {state === "changes" && (
          <span className="relative block rounded-md bg-inset">
            <motion.span
              className="absolute inset-x-1.5 top-1.5 space-y-1 rounded-md bg-surface p-1.5 shadow-raised"
              initial={{ opacity: 0, y: -6 }}
              animate={play ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.45, delay: 0.5, ease: EASE }}
            >
              <span className="block h-1.5 w-4/5 rounded-full bg-signal" />
              <span className="block h-1.5 w-3/5 rounded-full bg-hover-2" />
              <span className="block h-1.5 w-2/3 rounded-full bg-hover-2" />
            </motion.span>
            <motion.span
              className="absolute"
              initial={{ left: "15%", top: "85%" }}
              animate={play ? { left: "62%", top: "18%" } : undefined}
              transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            >
              <MousePointer2 className="size-3.5 fill-ink text-ink" />
            </motion.span>
          </span>
        )}
        {state === "lost" && (
          <motion.span
            className="flex items-center justify-center rounded-md border border-dashed border-line-strong text-[15px] text-ink-3"
            animate={play ? { opacity: [1, 0.35, 1] } : undefined}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            ?
          </motion.span>
        )}
      </div>
    </div>
  );
}

function Problem() {
  const ref = useRef<HTMLDivElement>(null);
  const play = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const frames: { state: FrameState; caption: string }[] = [
    { state: "loads", caption: "Page loads" },
    { state: "changes", caption: "The interface changes" },
    { state: "lost", caption: "Context is lost" },
  ];
  return (
    <Chapter id="problem" eyebrow="The problem" title="Agents act between snapshots.">
      <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2">
        Most agents take a screenshot, decide, act, and take another. Between those moments the page keeps moving: menus
        open, content loads, things shift. The agent is working from a picture that is already out of date.
      </p>
      <div ref={ref} className="mt-12 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {frames.map((frame, i) => (
          <FrameStep key={frame.state} last={i === frames.length - 1}>
            <figure>
              <MiniBrowser state={frame.state} play={play} />
              <figcaption className="mt-3 text-center text-[13.5px] text-ink-2">{frame.caption}</figcaption>
            </figure>
          </FrameStep>
        ))}
      </div>
      <p className="mt-10 font-display text-[20px] italic text-ink-2">The agent is left guessing.</p>
    </Chapter>
  );
}

function FrameStep({ children, last }: { children: ReactNode; last: boolean }) {
  return (
    <>
      {children}
      {!last && <ArrowRight aria-hidden className="mx-auto hidden size-4 -translate-y-3 text-ink-3 sm:block" />}
    </>
  );
}

const COSTS = [
  { title: "Wrong clicks", detail: "It acts on things that have moved or changed." },
  { title: "Missed changes", detail: "Updates happen between snapshots, unseen." },
  { title: "Silent failures", detail: "It doesn’t know when something went wrong." },
  { title: "Fragile flows", detail: "Small UI changes break the whole task." },
];

function Cost() {
  return (
    <Chapter id="cost" eyebrow="The cost" title="Small blind spots. Big consequences.">
      <ol className="mt-10 max-w-2xl">
        {COSTS.map((cost, i) => (
          <li key={cost.title} className="group -mx-4 grid grid-cols-[44px_1fr] items-baseline gap-2 rounded-card border-b border-line px-4 py-5 transition-colors duration-200 last:border-b-0 hover:bg-surface hover:shadow-card">
            <span className="font-display text-[22px] tabular-nums text-ink-3 transition-colors duration-200 group-hover:text-signal">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="transition-transform duration-300 ease-out-strong group-hover:translate-x-1">
              <span className="block text-[17px] font-medium text-ink">{cost.title}</span>
              <span className="mt-1 block text-[15px] text-ink-2">{cost.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </Chapter>
  );
}

function Flow() {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden className="relative mx-2 h-px flex-1 overflow-hidden bg-line sm:mx-4">
      {!reduce && (
        <motion.span
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--signal)] to-transparent"
          initial={{ left: "-35%" }}
          animate={{ left: "105%" }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
      )}
    </span>
  );
}

function Node({ icon, label, focus = false }: { icon: ReactNode; label: string; focus?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative flex flex-col items-center gap-3">
      <span
        className={cn(
          "relative flex size-20 items-center justify-center rounded-full sm:size-24",
          focus ? "bg-signal-tint text-signal-ink shadow-[0_0_0_1px_var(--signal),0_16px_40px_-14px_var(--signal)]" : "bg-surface text-ink-2 shadow-card",
        )}
      >
        {focus && !reduce && (
          <motion.span
            className="absolute inset-0 rounded-full border border-[var(--signal)]"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {icon}
      </span>
      <span className={cn("text-[12px] font-medium uppercase tracking-[0.14em]", focus ? "text-signal-ink" : "text-ink-3")}>{label}</span>
    </span>
  );
}

const FACTS = [
  { icon: Waves, text: "Watches at 4 frames a second" },
  { icon: Timer, text: "Keeps a rolling one-second window" },
  { icon: ScanEye, text: "Says when it isn’t sure" },
  { icon: ShieldCheck, text: "Never acts on its own" },
];

function Layer() {
  return (
    <Chapter id="layer" eyebrow="The missing layer" title="Panoptic keeps visual context alive.">
      <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2">
        Panoptic sits between your agent and the screen. It keeps watching, tracks what changed, and answers with what is
        on screen right now, and how fresh that answer is.
      </p>
      <div className="mt-14 max-w-2xl">
        <div className="flex items-start">
          <Node icon={<Bot className="size-7" strokeWidth={1.6} />} label="Agent" />
          <span className="flex flex-1 items-center pt-10 sm:pt-12"><Flow /></span>
          <Node icon={<Eye className="size-8" strokeWidth={1.6} />} label="Panoptic" focus />
          <span className="flex flex-1 items-center pt-10 sm:pt-12"><Flow /></span>
          <Node icon={<Globe className="size-7" strokeWidth={1.6} />} label="The web" />
        </div>
        <div className="relative mx-10 mt-4 h-10 rounded-b-[22px] border-x border-b border-dashed border-[var(--signal)] opacity-70 sm:mx-12">
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-page px-3 text-[12.5px] font-medium text-signal-ink">
            Persistent visual context
          </span>
        </div>
      </div>
      <ul className="mt-14 flex flex-wrap gap-2.5">
        {FACTS.map(({ icon: Icon, text }, i) => (
          <motion.li
            key={text}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: EASE }}
            whileHover={{ y: -2 }}
            className="flex items-center gap-2 rounded-full bg-surface px-3.5 py-2 text-[13.5px] text-ink shadow-card"
          >
            <Icon className="size-4 text-signal" />
            {text}
          </motion.li>
        ))}
      </ul>
    </Chapter>
  );
}

const STEPS: { lead: string; rest: string; live?: boolean }[] = [
  { lead: "You ask", rest: "“Find a hotel in Paris under $300 a night.”" },
  { lead: "The agent opens", rest: "a travel site." },
  { lead: "Panoptic sees", rest: "the search form and the date picker." },
  { lead: "The agent fills", rest: "the details and searches." },
  { lead: "Results load", rest: "and the page shifts." },
  { lead: "Panoptic is still looking", rest: "and knows what changed.", live: true },
  { lead: "The agent picks", rest: "the right options." },
];

const TRACE = [
  "Saw the search form",
  "Followed the date picker open",
  "Noticed the results finish loading",
  "Read three listings under $300",
];

function Run() {
  const ref = useRef<HTMLDivElement>(null);
  const play = useInView(ref, { once: true, margin: "0px 0px -25% 0px" });
  return (
    <Chapter id="run" eyebrow="An agent run" title="What happens when an agent can see.">
      <div ref={ref} className="mt-12 grid gap-10 lg:grid-cols-[1fr_minmax(0,320px)] lg:items-start">
        <ol className="space-y-1">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.lead}
              initial={{ opacity: 0, x: -8 }}
              animate={play ? { opacity: 1, x: 0 } : undefined}
              transition={{ duration: 0.5, delay: i * 0.09, ease: EASE }}
              className={cn(
                "flex items-baseline gap-4 rounded-card px-3 py-2.5 -mx-3",
                step.live && "bg-signal-tint",
              )}
            >
              <span className={cn("w-5 shrink-0 text-[13px] tabular-nums", step.live ? "text-signal-ink" : "text-ink-3")}>{i + 1}</span>
              <span className="text-[16.5px] leading-snug">
                <span className={cn("font-medium", step.live ? "text-signal-ink" : "text-ink")}>{step.lead}</span>{" "}
                <span className="text-ink-2">{step.rest}</span>
              </span>
              {step.live && (
                <span className="relative ml-auto flex size-2 shrink-0 self-center">
                  <span className="absolute inset-0 rounded-full bg-signal opacity-60" style={{ animation: "bui-ping 1.6s cubic-bezier(0,0,0.2,1) infinite" }} />
                  <span className="relative size-2 rounded-full bg-signal" />
                </span>
              )}
            </motion.li>
          ))}
        </ol>
        <div className="rounded-window bg-surface p-5 shadow-card">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">Panoptic, during the run</p>
          <div className="mt-3 min-h-[188px]">
            {play && (
              <ThinkingState
                steps={TRACE}
                active="Watching the page"
                done="Kept sight across 4 page changes"
                icon={<Eye className="size-4" />}
              />
            )}
          </div>
        </div>
      </div>
    </Chapter>
  );
}

function Outcome() {
  const ref = useRef<HTMLDivElement>(null);
  const play = useInView(ref, { once: true, margin: "0px 0px -25% 0px" });
  const [answered, setAnswered] = useState(false);
  useEffect(() => {
    if (!play) return;
    const id = window.setTimeout(() => setAnswered(true), 1100);
    return () => window.clearTimeout(id);
  }, [play]);
  return (
    <Chapter id="outcome" eyebrow="The outcome" title="You ask. Your agent finishes.">
      <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2">
        With persistent vision, agents stop guessing and start completing what you asked.
      </p>
      <div ref={ref} className="mt-10 max-w-xl overflow-hidden rounded-window bg-surface shadow-card">
        <div className="flex gap-4 border-b border-line px-5 py-4">
          <span className="w-12 shrink-0 text-[12px] font-medium uppercase tracking-[0.12em] text-ink-3">You</span>
          <span className="text-[15.5px] text-ink">Find a hotel in Paris under $300 a night.</span>
        </div>
        <div className="flex min-h-[60px] items-center gap-4 px-5 py-4">
          <span className="w-12 shrink-0 text-[12px] font-medium uppercase tracking-[0.12em] text-ink-3">Agent</span>
          <span className="flex flex-1 items-center justify-between gap-3 text-[15.5px] text-ink">
            {answered ? (
              <>
                <StreamText text="Done. Three options are ready for you." />
                <span style={{ animation: "bui-pop-in 360ms cubic-bezier(0.23,1,0.32,1) 900ms both" }}>
                  <StatusPill tone="ok">Complete</StatusPill>
                </span>
              </>
            ) : (
              <span aria-label="Agent is working" className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-1.5 rounded-full bg-ink-3"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </span>
            )}
          </span>
        </div>
      </div>
    </Chapter>
  );
}

function Closing() {
  const { open } = useEarlyAccess();
  return (
    <RevealSection aria-labelledby="closing-title" className="relative mb-24 overflow-hidden rounded-[28px] bg-[#0b1220] px-6 py-16 text-center sm:px-12 sm:py-20">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(59,130,246,0.38),transparent_70%)]" />
      <div className="relative">
        <h2 id="closing-title" className="font-display text-[36px] leading-[1.05] tracking-[-0.015em] text-white sm:text-[52px]">
          Give your agent persistent sight.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[16.5px] leading-relaxed text-white/65">
          Panoptic plugs into your agent through an API, Python and TypeScript SDKs, and MCP.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => open("panoptic:closing")}
            className={cn(studioButton({ size: "lg" }), "bg-white text-[#0b1220] shadow-none hover:bg-white/90")}
          >
            Get early access
            <ArrowRight aria-hidden className={buttonArrow} />
          </motion.button>
          <Link to={STUDIO_PATHS.models} className={cn(studioButton({ variant: "quiet", size: "lg" }), "text-white/75 hover:bg-white/10 hover:text-white")}>
            See all models
          </Link>
        </div>
      </div>
    </RevealSection>
  );
}

export default function PanopticPage() {
  usePageMeta(PANOPTIC_MODEL_META.title, PANOPTIC_MODEL_META.description);
  const active = useActiveSection();
  return (
    <div className="relative overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(60%_60%_at_80%_10%,rgba(96,165,250,0.16),transparent_70%)]" />
      <StudioNav />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 lg:grid lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-16">
        <SectionNav active={active} />
        <main className="min-w-0">
          <Hero />
          <Problem />
          <Cost />
          <Layer />
          <Run />
          <Outcome />
          <Closing />
        </main>
      </div>
      <StudioFooter />
    </div>
  );
}
