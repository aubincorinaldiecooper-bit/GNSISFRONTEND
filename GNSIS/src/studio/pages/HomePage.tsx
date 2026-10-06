import { useSyncExternalStore, type ComponentType } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, AudioLines, Blocks, BrainCircuit, Eye, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { LAB_META } from "@/panoptic/pageMeta";
import { usePageMeta } from "@/panoptic/usePageMeta";
import { STUDIO_PATHS } from "../config";
import { useEarlyAccess } from "../earlyAccess";
import { StudioFooter } from "../components/Footer";
import { ModelGlyph } from "../components/Glyphs";
import { ModelLink } from "../components/ModelLink";
import { StudioNav } from "../components/Nav";
import { Eyebrow, RevealSection, RiseLines } from "../components/Reveal";
import { LISTED_MODELS } from "../models";
import LanyardBadge from "../ui/LanyardBadge";
import { buttonArrow, studioButton } from "../ui/variants";

const EASE = [0.23, 1, 0.32, 1] as const;

/** A slow, breathing field of warm and cool light: presence, not product. */
function PresenceField() {
  const reduce = useReducedMotion();
  const breathe = (scale: number[], duration: number, delay = 0) =>
    reduce
      ? undefined
      : { animate: { scale, opacity: [0.55, 1, 0.55] }, transition: { duration, delay, repeat: Infinity, ease: "easeInOut" as const } };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[820px] overflow-hidden">
      <motion.div
        className="absolute -right-24 top-10 size-[640px] rounded-full bg-[radial-gradient(circle,rgba(255,176,120,0.40),rgba(255,214,160,0.16)_45%,transparent_70%)] blur-2xl"
        {...breathe([1, 1.08, 1], 12)}
      />
      <motion.div
        className="absolute right-40 top-56 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(120,165,255,0.34),rgba(170,200,255,0.12)_45%,transparent_70%)] blur-2xl"
        {...breathe([1.06, 1, 1.06], 14, 1.5)}
      />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-b from-transparent to-[var(--page)]" />
    </div>
  );
}

const BADGE_INK = "#8fb0ff";

function BadgeFront() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1220] font-studio text-white">
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_100%,rgba(255,160,100,0.45),transparent_70%),radial-gradient(90%_70%_at_90%_10%,rgba(59,130,246,0.5),transparent_70%)]" />
      <svg viewBox="-100 -100 200 200" className="absolute -right-16 top-24 w-[260px] text-white/15" fill="none" stroke="currentColor" strokeWidth={1}>
        {[96, 78, 60, 42, 24].map((r) => (
          <circle key={r} r={r} />
        ))}
        <circle r={7} fill="currentColor" />
      </svg>
      <div className="absolute inset-x-6 top-12">
        <p className="text-[26px] font-semibold tracking-[0.08em]">GNSIS</p>
        <p className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.22em] text-white/60">Research Lab</p>
      </div>
      <div className="absolute inset-x-6 bottom-7">
        <p className="font-display text-[22px] italic leading-[1.1] text-white/90">
          Intelligence that
          <br />
          stays present.
        </p>
        <div className="mt-5 flex items-center justify-between text-[8.5px] font-medium uppercase tracking-[0.2em] text-white/55">
          <span>Toronto, Canada</span>
          <span>gnsis.studio</span>
        </div>
      </div>
    </div>
  );
}

function BadgeBack() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f4f1ea] font-studio text-[#0b1220]">
      <div className="absolute inset-x-6 top-14">
        <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-[#0b1220]/55">Pass</p>
        <p className="mt-2 font-display text-[34px] leading-none">Early access</p>
        <div className="mt-5 h-[2px] w-5 bg-[#0b1220]" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[42%] rounded-tl-[40px] bg-[#0b1220] px-6 pt-7 text-white">
        <p className="text-[18px] font-semibold tracking-[0.08em]">GNSIS</p>
        <p className="mt-1 text-[8.5px] font-medium uppercase tracking-[0.2em] text-white/55">Perception · Voice · Memory</p>
        <span className="absolute bottom-6 right-6 size-2 rounded-full" style={{ background: BADGE_INK }} />
      </div>
    </div>
  );
}

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}

function HeroLanyard({ placement }: { placement: "desktop" | "mobile" }) {
  const desktop = useIsDesktop();
  if (desktop !== (placement === "desktop")) return null;
  return (
    <div
      className={
        desktop
          ? "absolute -right-36 -top-16 h-[760px] w-[760px]"
          : "relative -mx-5 mt-2 h-[600px] [mask-image:linear-gradient(to_bottom,transparent,black_18%)] sm:-mx-8"
      }
    >
      <LanyardBadge
        front={<BadgeFront />}
        back={<BadgeBack />}
        strapText="intelligence that stays present"
        strapLabel="GNSIS RESEARCH · TORONTO"
        strapColor="#0b1220"
        inkColor={BADGE_INK}
        flipButton={false}
        cardWidth={240}
        height="100%"
      />
    </div>
  );
}

function Hero() {
  const { open } = useEarlyAccess();
  return (
    <section aria-labelledby="lab-title" className="relative pb-6 pt-16 sm:pb-32 sm:pt-28 lg:min-h-[700px]">
      <HeroLanyard placement="desktop" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
        <Eyebrow>GNSIS Research · Toronto</Eyebrow>
      </motion.div>
      <h1 id="lab-title" className="mt-6 max-w-4xl font-display text-[44px] leading-[1.04] tracking-[-0.02em] text-ink sm:text-[88px]">
        <RiseLines lines={["Intelligence that", "stays present."]} delay={0.05} />
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
        className="mt-8 max-w-xl text-[18.5px] leading-relaxed text-ink-2"
      >
        GNSIS is a research lab building AI that sees, listens and remembers in real time, so it can work alongside
        people, not just answer them.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
        className="mt-10 flex flex-wrap items-center gap-3"
      >
        <Link to={STUDIO_PATHS.models} className={studioButton({ variant: "primary", size: "lg" })}>
          See our releases
          <ArrowRight aria-hidden className={buttonArrow} />
        </Link>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => open("lab:hero")}
          className={studioButton({ variant: "quiet", size: "lg" })}
        >
          Work with us
        </motion.button>
      </motion.div>
      <HeroLanyard placement="mobile" />
    </section>
  );
}

function Mission() {
  return (
    <RevealSection aria-labelledby="mission-title" className="border-t border-line py-24 sm:py-32">
      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">
        <Eyebrow>Our mission</Eyebrow>
        <div>
          <h2 id="mission-title" className="max-w-3xl font-display text-[32px] leading-[1.2] tracking-[-0.01em] text-ink sm:text-[44px]">
            Most AI waits for a prompt, answers, and forgets.{" "}
            <span className="text-ink-3">
              We are building intelligence that is continuously present: perceiving the world as it changes, holding
              context across time, and acting only when people say so.
            </span>
          </h2>
        </div>
      </div>
    </RevealSection>
  );
}

interface Principle {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

const PRINCIPLES: readonly Principle[] = [
  {
    icon: Eye,
    title: "Perception first",
    body: "Understanding starts with seeing. Our systems watch continuously and say what is true now, not what was true a moment ago.",
  },
  {
    icon: AudioLines,
    title: "Real time by default",
    body: "Conversation is not turn-based. Our systems listen while they speak, and stop when you interrupt.",
  },
  {
    icon: BrainCircuit,
    title: "Memory across time",
    body: "Context should outlive a single request. What matters is remembered, and what is stale is let go.",
  },
  {
    icon: ShieldCheck,
    title: "People stay in control",
    body: "Our models perceive and propose. Acting on the world is always the person’s call, and it is always recorded.",
  },
  {
    icon: Blocks,
    title: "Modular by design",
    body: "Perception, speech, memory and reasoning are separate parts, so each can be studied, measured and replaced.",
  },
];

function Principles() {
  return (
    <RevealSection aria-labelledby="principles-title" className="pb-24 sm:pb-32">
      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">
        <Eyebrow>How we work</Eyebrow>
        <div>
          <h2 id="principles-title" className="sr-only">
            How we work
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            {PRINCIPLES.map(({ icon: Icon, title, body }, i) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: EASE }}
                className="group grid grid-cols-[40px_minmax(0,1fr)] gap-x-5 gap-y-2 py-7 sm:grid-cols-[40px_220px_minmax(0,1fr)] sm:items-start sm:gap-x-8"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-signal-tint text-signal-ink transition-transform duration-300 ease-out-strong group-hover:scale-110">
                  <Icon className="size-[18px]" />
                </span>
                <h3 className="self-center text-[18px] font-medium tracking-[-0.01em] text-ink sm:self-auto sm:pt-2">{title}</h3>
                <p className="col-start-2 max-w-lg text-[15.5px] leading-relaxed text-ink-2 sm:col-start-3 sm:pt-2">{body}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </RevealSection>
  );
}

function Releases() {
  return (
    <RevealSection aria-labelledby="releases-title" className="border-t border-line py-24 sm:py-32">
      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">
        <Eyebrow>Our work</Eyebrow>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <h2 id="releases-title" className="max-w-xl font-display text-[32px] leading-[1.15] tracking-[-0.01em] text-ink sm:text-[40px]">
              Our research ships as models.
            </h2>
            <Link to={STUDIO_PATHS.models} className={studioButton({ variant: "secondary", size: "sm" })}>
              All releases
              <ArrowRight aria-hidden className={buttonArrow} />
            </Link>
          </div>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {LISTED_MODELS.map((model) => (
              <li key={model.id}>
                <ModelLink
                  model={model}
                  className="group -mx-3 flex items-center gap-5 rounded-card px-3 py-6 transition-colors duration-150 hover:bg-hover focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_2px_var(--signal)]"
                >
                  <ModelGlyph id={model.id} className="size-11 shrink-0 rounded-[12px] text-[13px] transition-transform duration-300 ease-out-strong group-hover:scale-105" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[18px] font-medium tracking-[-0.01em] text-ink">{model.name}</span>
                    <span className="mt-0.5 block text-[15px] text-ink-2">{model.tagline}</span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-5 shrink-0 text-ink-3 transition-[transform,color] duration-200 ease-out-strong group-hover:translate-x-1 group-hover:text-ink"
                  />
                </ModelLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </RevealSection>
  );
}

function Closing() {
  const { open } = useEarlyAccess();
  return (
    <RevealSection aria-labelledby="lab-closing-title" className="relative mb-24 overflow-hidden rounded-[28px] bg-[#0b1220] px-6 py-16 text-center sm:px-12 sm:py-20">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_90%_at_30%_0%,rgba(255,170,110,0.26),transparent_70%),radial-gradient(60%_90%_at_75%_0%,rgba(59,130,246,0.34),transparent_70%)]" />
      <div className="relative">
        <h2 id="lab-closing-title" className="font-display text-[36px] leading-[1.05] tracking-[-0.015em] text-white sm:text-[52px]">
          Built in Toronto, Canada.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[16.5px] leading-relaxed text-white/65">
          We are opening GNSIS to teams a few at a time. If you are building with perception, voice or agents, we would
          like to hear from you.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => open("lab:closing")}
            className={cn(studioButton({ size: "lg" }), "bg-white text-[#0b1220] shadow-none hover:bg-white/90")}
          >
            Get in touch
            <ArrowRight aria-hidden className={buttonArrow} />
          </motion.button>
          <Link to={STUDIO_PATHS.models} className={cn(studioButton({ variant: "quiet", size: "lg" }), "text-white/75 hover:bg-white/10 hover:text-white")}>
            See our releases
          </Link>
        </div>
      </div>
    </RevealSection>
  );
}

export default function HomePage() {
  usePageMeta(LAB_META.title, LAB_META.description);
  return (
    <div className="relative overflow-x-clip">
      <PresenceField />
      <StudioNav />
      <main className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Hero />
        <Mission />
        <Principles />
        <Releases />
        <Closing />
      </main>
      <StudioFooter />
    </div>
  );
}
