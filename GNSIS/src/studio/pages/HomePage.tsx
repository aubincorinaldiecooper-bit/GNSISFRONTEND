import type { ComponentType, ReactNode } from "react";
import { motion } from "motion/react";
import { ChevronDown, Eye, Hand, KeyRound, Mic, MousePointerClick, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Link } from "react-router";
import { LAB_META } from "@/panoptic/pageMeta";
import { usePageMeta } from "@/panoptic/usePageMeta";
import { STUDIO_PATHS } from "../config";
import { TryButton } from "../components/TryButton";
import { StudioNav } from "../components/Nav";
import { Eyebrow, RevealSection, RiseLines } from "../components/Reveal";

const EASE = [0.23, 1, 0.32, 1] as const;

/** A Cluely-style sky: deep blue at the top fading into the page. */
function Sky() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[1100px] bg-[linear-gradient(180deg,#1f4fb8_0%,#4f86e0_28%,#9cc0f2_55%,#dde9fa_75%,var(--page)_100%)]"
    />
  );
}

function Hero() {
  return (
    <section aria-labelledby="home-title" className="relative pb-20 pt-16 text-center sm:pt-24">
      <h1
        id="home-title"
        className="mx-auto mt-6 max-w-4xl text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-[68px]"
      >
        <RiseLines lines={["GNSIS"]} delay={0.05} />
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
        className="mx-auto mt-6 max-w-2xl text-[20px] font-medium leading-snug tracking-[-0.01em] text-white sm:text-[24px]"
      >
        Agents keep getting better at reasoning. We just added an awareness layer.
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.36, ease: EASE }}
        className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-white/80"
      >
        Every computer in history has asked us to adjust to its medium. The command line, the query box, the prompt. Even the one that
        took our voice continued the ritual: “Say its name, wait for the chime, one question at a time, repeat.” The communication bridge
        has always been the bottleneck.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.48, ease: EASE }}
        className="mt-9 flex justify-center"
      >
        <TryButton source="home:hero" size="lg" tone="light" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1, delay: 0.5, ease: EASE }}
        className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-[18px] shadow-[0_40px_120px_-30px_rgba(11,18,32,0.55)] ring-1 ring-black/10 sm:rounded-[22px]"
      >
        <img
          src="/images/gnsis/desktop-hero.webp"
          width={1440}
          height={900}
          alt="GNSIS on a Mac desktop, above the Dock, after finding a recipe: the chat lists each step it took and the browser agent's screen shows the result."
          className="block h-auto w-full"
        />
      </motion.div>
    </section>
  );
}

type Item = { icon: ComponentType<{ className?: string }>; title: string; body: string };

const STEPS: readonly Item[] = [
  { icon: Mic, title: "You ask", body: "Speak or type, wherever you are on your Mac." },
  { icon: Eye, title: "It sees your screen", body: "When you share it, GNSIS knows what you’re looking at." },
  { icon: MousePointerClick, title: "It does the task", body: "It works in your apps and the web, step by step." },
  { icon: Sparkles, title: "It shows its work", body: "Every step it took is there to check, and it remembers for next time." },
];

function HowItWorks() {
  return (
    <RevealSection id="how" aria-labelledby="how-title" className="py-20 sm:py-28">
      <Eyebrow>How it works</Eyebrow>
      <h2 id="how-title" className="mt-4 max-w-2xl text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[44px]">
        Ask once. GNSIS takes it from there.
      </h2>
      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="rounded-[18px] bg-surface p-6 shadow-btn">
            <span className="flex size-10 items-center justify-center rounded-full bg-signal-tint text-signal-ink">
              <Icon className="size-[18px]" />
            </span>
            <p className="mt-6 text-[12px] font-medium text-ink-3">0{i + 1}</p>
            <h3 className="mt-1 text-[18px] font-medium tracking-[-0.01em] text-ink">{title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{body}</p>
          </li>
        ))}
      </ol>
    </RevealSection>
  );
}

const CONTROLS: readonly Item[] = [
  {
    icon: KeyRound,
    title: "Your key stays on your Mac",
    body: "Each device generates its own private key, and it never leaves your computer. GNSIS signs you in with that key instead of a password, so there’s nothing to phish or leak.",
  },
  { icon: ShieldCheck, title: "It sees only what you share", body: "Screen and camera are off until you turn them on. No screenshots, and nothing is saved to disk." },
  { icon: Hand, title: "It asks first", body: "Anything that sends, buys, posts or deletes waits for your OK." },
  { icon: UserRound, title: "Your memory is yours", body: "What GNSIS remembers belongs to you, not to one device." },
];

function Control() {
  return (
    <RevealSection aria-labelledby="control-title" className="border-t border-line py-20 sm:py-28">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
        <div>
          <Eyebrow>Privacy</Eyebrow>
          <h2 id="control-title" className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[44px]">
            Privacy first, by design.
          </h2>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {CONTROLS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-5 py-6">
              <span className="flex size-10 items-center justify-center rounded-full bg-signal-tint text-signal-ink">
                <Icon className="size-[18px]" />
              </span>
              <div>
                <h3 className="text-[17px] font-medium text-ink">{title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </RevealSection>
  );
}

const FAQS: readonly { q: string; a: ReactNode }[] = [
  {
    q: "What is GNSIS?",
    a: "An app that floats over your Mac’s desktop. You ask by voice or by typing, and it carries out the task in your apps and on the web, showing each step as it goes.",
  },
  {
    q: "Does GNSIS see my screen all the time?",
    a: "No. GNSIS only sees your screen or camera while you share it, and you can stop sharing with one click. It never takes screenshots, and nothing it sees is saved to your disk.",
  },
  {
    q: "Will it do things without asking me?",
    a: "It handles simple things you ask for directly, like opening an app or a page. Anything that sends, buys, posts, deletes or changes an account waits for your OK first.",
  },
  {
    q: "Does GNSIS show up when I share my screen?",
    a: "No. GNSIS’s windows are left out of screenshots, screen recordings and screen sharing, so only you see it.",
  },
  {
    q: "Which computers does it run on?",
    a: "It runs natively on both Apple silicon and Intel Macs. Windows is coming soon.",
  },
  {
    q: "I build AI agents. Can I use your vision technology?",
    a: (
      <>
        Yes. Panoptic lets any agent see: Claude Code, Codex or anything that speaks MCP, plus our API and SDK.{" "}
        <Link to={STUDIO_PATHS.developersPanoptic} className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
          Read the developer docs
        </Link>
        .
      </>
    ),
  },
];

function Faq() {
  return (
    <RevealSection id="faq" aria-labelledby="faq-title" className="border-t border-line py-20 sm:py-28">
      <h2 id="faq-title" className="text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[44px]">
        Frequently asked questions
      </h2>
      <div className="mt-10 border-b border-line">
        {FAQS.map(({ q, a }) => (
          <details key={q} className="group border-t border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[18px] font-medium tracking-[-0.01em] text-ink outline-none focus-visible:shadow-[0_0_0_2px_var(--signal)] [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown aria-hidden className="size-5 shrink-0 text-ink-3 transition-transform duration-300 ease-out-strong group-open:rotate-180" />
            </summary>
            <p className="max-w-3xl pb-7 text-[16px] leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </RevealSection>
  );
}

function Closing() {
  return (
    <RevealSection aria-labelledby="home-closing-title" className="relative mb-24 overflow-hidden rounded-[28px] bg-[#0b1220] px-6 py-16 text-center sm:px-12 sm:py-20">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(79,134,224,0.45),transparent_70%)]" />
      <div className="relative">
        <img src="/brand/gnsis-mark.png" alt="" width={48} height={48} className="mx-auto size-12 invert" />
        <h2 id="home-closing-title" className="mt-6 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[48px]">
          Conversation that moves at the pace of your thinking.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-white/65">Built in Toronto, Canada.</p>
        <div className="mt-9 flex justify-center">
          <TryButton source="home:closing" size="lg" tone="light" />
        </div>
      </div>
    </RevealSection>
  );
}

export default function HomePage() {
  usePageMeta(LAB_META.title, LAB_META.description);
  return (
    <div className="relative overflow-x-clip">
      <Sky />
      <StudioNav onSky />
      <main className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Hero />
        <HowItWorks />
        <Control />
        <Faq />
        <Closing />
      </main>
    </div>
  );
}
