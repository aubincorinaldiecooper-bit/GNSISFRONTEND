import type { ComponentType } from "react";
import { motion } from "motion/react";
import { ArrowRight, Cloud, Code2, Eye, Hand, Laptop, Mic, MousePointerClick, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Link } from "react-router";
import { LAB_META } from "@/panoptic/pageMeta";
import { usePageMeta } from "@/panoptic/usePageMeta";
import { STUDIO_PATHS } from "../config";
import { DownloadMenu } from "../components/DownloadMenu";
import { StudioFooter } from "../components/Footer";
import { StudioNav } from "../components/Nav";
import { Eyebrow, RevealSection, RiseLines } from "../components/Reveal";
import { buttonArrow, studioButton } from "../ui/variants";

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
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[12.5px] font-medium text-white ring-1 ring-white/25 backdrop-blur"
      >
        GNSIS 1.0 and GNSIS 0.5 · for Mac
      </motion.p>
      <h1
        id="home-title"
        className="mx-auto mt-6 max-w-4xl text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-[68px]"
      >
        <RiseLines lines={["Super intelligence that", "lives on your computer."]} delay={0.05} />
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
        className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-white/85"
      >
        GNSIS floats over your desktop and works in the apps you already use. Ask by voice or by typing. It sees what’s on
        your screen and gets the task done, from a quick reply to a long piece of writing or code.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.42, ease: EASE }}
        className="mt-9 flex justify-center"
      >
        <DownloadMenu size="lg" tone="light" />
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

const MODELS = [
  {
    icon: Laptop,
    name: "GNSIS 0.5",
    where: "Runs on your Mac",
    body: "Quick, everyday actions, offline and private. Nothing leaves your computer.",
    good: ["Opening and switching apps", "Short replies and notes", "Reminders and quick look-ups"],
  },
  {
    icon: Cloud,
    name: "GNSIS 1.0",
    where: "Runs in the cloud",
    body: "Harder thinking for bigger jobs, when you want the most capable answer.",
    good: ["Planning and research", "Long writing", "Coding"],
  },
] as const;

function Models() {
  return (
    <RevealSection id="models" aria-labelledby="models-title" className="border-t border-line py-20 sm:py-28">
      <Eyebrow>Two models, one app</Eyebrow>
      <h2 id="models-title" className="mt-4 max-w-2xl text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[44px]">
        Pick the one that fits the task.
      </h2>
      <p className="mt-4 max-w-xl text-[16.5px] leading-relaxed text-ink-2">Switch between them from the chat bar, any time.</p>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {MODELS.map(({ icon: Icon, name, where, body, good }) => (
          <article key={name} className="rounded-[22px] bg-surface p-7 shadow-btn sm:p-9">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-inset text-ink">
                <Icon className="size-[18px]" />
              </span>
              <div>
                <h3 className="text-[20px] font-semibold tracking-[-0.015em] text-ink">{name}</h3>
                <p className="text-[13px] text-ink-3">{where}</p>
              </div>
            </div>
            <p className="mt-6 text-[16px] leading-relaxed text-ink-2">{body}</p>
            <ul className="mt-6 divide-y divide-line border-y border-line text-[15px] text-ink">
              {good.map((g) => (
                <li key={g} className="py-3">
                  {g}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </RevealSection>
  );
}

const CONTROLS: readonly Item[] = [
  { icon: Hand, title: "It asks first", body: "Anything that sends, buys, posts or deletes waits for your OK." },
  { icon: ShieldCheck, title: "You decide what it sees", body: "Screen and camera sharing are off until you turn them on, and off again with one click." },
  { icon: UserRound, title: "Your memory is yours", body: "What GNSIS remembers belongs to you, on your account." },
];

function Control() {
  return (
    <RevealSection aria-labelledby="control-title" className="border-t border-line py-20 sm:py-28">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
        <div>
          <Eyebrow>You stay in control</Eyebrow>
          <h2 id="control-title" className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[44px]">
            Helpful, never out of hand.
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

function ForDevelopers() {
  return (
    <RevealSection aria-labelledby="devs-title" className="border-t border-line py-20 sm:py-24">
      <div className="flex flex-col gap-6 rounded-[22px] bg-inset p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-btn">
            <Code2 className="size-[18px]" />
          </span>
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-ink-3">From the lab · for developers</p>
            <h2 id="devs-title" className="mt-1.5 text-[20px] font-semibold tracking-[-0.015em] text-ink">
              Panoptic: vision for your own agents
            </h2>
            <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-ink-2">
              Give the agents you build the ability to see, through our API, SDK and MCP server.
            </p>
          </div>
        </div>
        <Link to={STUDIO_PATHS.developersPanoptic} className={studioButton({ variant: "secondary", size: "md" })}>
          Developer docs
          <ArrowRight aria-hidden className={buttonArrow} />
        </Link>
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
          Your computer, with GNSIS on it.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-white/65">Built in Toronto, Canada.</p>
        <div className="mt-9 flex justify-center">
          <DownloadMenu size="lg" tone="light" />
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
        <Models />
        <Control />
        <ForDevelopers />
        <Closing />
      </main>
      <StudioFooter />
    </div>
  );
}
