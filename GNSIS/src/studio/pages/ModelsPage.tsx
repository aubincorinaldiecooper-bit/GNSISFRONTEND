import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODELS_META } from "@/panoptic/pageMeta";
import { usePageMeta } from "@/panoptic/usePageMeta";
import { ModelGlyph } from "../components/Glyphs";
import { ModelLink } from "../components/ModelLink";
import { StudioNav } from "../components/Nav";
import { StudioFooter } from "../components/Footer";
import { Gnsis01Preview, PanopticPreview } from "../components/Previews";
import { Eyebrow, RiseLines } from "../components/Reveal";
import { LISTED_MODELS, type StudioModel } from "../models";
import { buttonArrow, studioButton } from "../ui/variants";

const EASE = [0.23, 1, 0.32, 1] as const;

/** Slow-drifting colour behind the hero: warm on the left, cool on the right. */
function AmbientGlow() {
  const reduce = useReducedMotion();
  const drift = (x: number[], y: number[], duration: number) =>
    reduce ? undefined : { animate: { x, y }, transition: { duration, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const } };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[760px] overflow-hidden">
      <motion.div
        className="absolute -left-40 -top-56 size-[620px] rounded-full bg-[radial-gradient(circle,rgba(255,170,110,0.42),rgba(255,214,150,0.18)_45%,transparent_70%)] blur-2xl"
        {...drift([0, 60], [0, 30], 14)}
      />
      <motion.div
        className="absolute -right-40 -top-40 size-[560px] rounded-full bg-[radial-gradient(circle,rgba(120,170,255,0.38),rgba(170,200,255,0.14)_45%,transparent_70%)] blur-2xl"
        {...drift([0, -50], [0, 40], 16)}
      />
      <motion.div
        className="absolute left-1/3 top-40 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,236,170,0.35),transparent_65%)] blur-2xl"
        {...drift([0, 40], [0, -20], 18)}
      />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-[var(--page)]" />
    </div>
  );
}

function ModelCard({ model, index }: { model: StudioModel; index: number }) {
  const Preview = model.id === "panoptic" ? PanopticPreview : Gnsis01Preview;
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.35 + index * 0.1, ease: EASE }}
      whileHover={{ y: -4 }}
      className="group relative flex flex-col rounded-[22px] bg-surface p-4 shadow-card transition-shadow duration-300 hover:shadow-raised sm:p-5"
    >
      <Preview />
      <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-6">
        <div className="flex items-center gap-2.5">
          <ModelGlyph id={model.id} className="size-7 rounded-[8px] text-[11px]" />
          <h2 className="text-[24px] font-medium tracking-[-0.02em] text-ink">{model.name}</h2>
        </div>
        <p className="mt-3 text-[17px] leading-snug text-ink">{model.tagline}</p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{model.summary}</p>
        <div className="mt-auto pt-6">
          <ModelLink
            model={model}
            className={cn(
              studioButton({ variant: "secondary" }),
              "after:absolute after:inset-0 after:rounded-[22px] after:content-['']",
            )}
          >
            Explore {model.name}
            <ArrowRight aria-hidden className={cn(buttonArrow, "group-hover:translate-x-0.5")} />
          </ModelLink>
        </div>
      </div>
    </motion.article>
  );
}

export default function ModelsPage() {
  usePageMeta(MODELS_META.title, MODELS_META.description);
  return (
    <div className="relative overflow-x-clip">
      <AmbientGlow />
      <StudioNav />
      <main className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <section aria-labelledby="models-title" className="pb-14 pt-16 sm:pb-20 sm:pt-28">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            <Eyebrow>Models</Eyebrow>
          </motion.div>
          <h1 id="models-title" className="mt-5 text-[48px] font-light leading-[1.02] tracking-[-0.04em] text-ink sm:text-[76px]">
            <RiseLines lines={["Our releases."]} delay={0.05} />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
            className="mt-7 max-w-xl text-[18px] leading-relaxed text-ink-2"
          >
            Models from the GNSIS lab. Panoptic, our first release, gives agents real-time visual perception of the web.
          </motion.p>
        </section>
        <section aria-label="Models" className="grid gap-5 pb-28 md:grid-cols-2">
          {LISTED_MODELS.map((model, index) => (
            <ModelCard key={model.id} model={model} index={index} />
          ))}
        </section>
      </main>
      <StudioFooter />
    </div>
  );
}
