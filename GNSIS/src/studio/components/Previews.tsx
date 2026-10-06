import { motion, useReducedMotion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { Shimmer } from "../ui/Shimmer";

function Dots({ tone }: { tone: "dark" | "light" }) {
  const dot = tone === "dark" ? "bg-white/20" : "bg-[var(--line-strong)]";
  return (
    <span className="flex gap-1">
      <span className={`size-1.5 rounded-full ${dot}`} />
      <span className={`size-1.5 rounded-full ${dot}`} />
      <span className={`size-1.5 rounded-full ${dot}`} />
    </span>
  );
}

/** A page under watch: a scan line sweeps, and a focus box tracks the element Panoptic grounds. */
export function PanopticPreview() {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden
      className="relative aspect-[16/11] overflow-hidden rounded-[14px] bg-[#0b0f17] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_18px_40px_-18px_rgba(2,6,23,0.7)] transition-transform duration-500 ease-out-strong group-hover:scale-[1.015]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_0%,rgba(59,130,246,0.22),transparent_60%)]" />
      <div className="relative flex items-center gap-3 px-3 py-2.5">
        <Dots tone="dark" />
        <span className="h-2 w-28 rounded-full bg-white/10" />
      </div>
      <div className="relative grid grid-cols-[1fr_1.5fr] gap-2.5 px-3">
        <div className="space-y-2 pt-1">
          <span className="block h-1.5 w-4/5 rounded-full bg-white/15" />
          <span className="block h-1.5 w-3/5 rounded-full bg-white/10" />
          <span className="block h-1.5 w-2/3 rounded-full bg-white/10" />
          <span className="mt-3 block h-6 w-full rounded-md bg-white/[0.06] ring-1 ring-white/5" />
          <span className="block h-6 w-full rounded-md bg-white/[0.06] ring-1 ring-white/5" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="block rounded-md bg-white/[0.05] p-1.5 ring-1 ring-white/5">
              <span className="block aspect-[4/3] rounded bg-white/[0.07]" />
              <span className="mt-1.5 block h-1 w-3/4 rounded-full bg-white/15" />
            </span>
          ))}
        </div>
      </div>

      {!reduce && (
        <motion.span
          className="absolute inset-x-0 h-20 bg-gradient-to-b from-transparent via-blue-400/15 to-transparent"
          initial={{ top: "-25%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
        />
      )}

      <motion.span
        className="absolute rounded-[5px] border border-blue-400 bg-blue-500/10 shadow-[0_0_0_3px_rgba(59,130,246,0.18)]"
        initial={{ left: "47%", top: "30%", width: "22%", height: "34%" }}
        animate={
          reduce
            ? undefined
            : {
                left: ["47%", "71%", "6%", "47%"],
                top: ["30%", "62%", "64%", "30%"],
                width: ["22%", "22%", "30%", "22%"],
                height: ["34%", "30%", "14%", "34%"],
              }
        }
        transition={{ duration: 8, repeat: Infinity, ease: [0.65, 0, 0.35, 1], times: [0, 0.33, 0.66, 1] }}
      >
        <span className="absolute -top-[18px] left-0 whitespace-nowrap rounded-[4px] bg-blue-500 px-1.5 py-[2px] text-[8.5px] font-medium leading-none text-white">
          target · 0.94
        </span>
      </motion.span>

      <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between text-[9px] font-medium text-white/50">
        <span className="flex items-center gap-1.5">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400/70" style={{ animation: "bui-ping 1.6s cubic-bezier(0,0,0.2,1) infinite" }} />
            <span className="relative size-1.5 rounded-full bg-emerald-400" />
          </span>
          Live · 4 fps
        </span>
        <span>1s window</span>
      </div>
    </div>
  );
}

/** A task in progress: the request, a plan forming, and the next step. */
export function Gnsis01Preview() {
  return (
    <div
      aria-hidden
      className="relative aspect-[16/11] overflow-hidden rounded-[14px] bg-[#fbfaf8] shadow-[0_0_0_1px_var(--line),0_18px_40px_-20px_rgba(120,60,20,0.35)] transition-transform duration-500 ease-out-strong group-hover:scale-[1.015]"
    >
      <div className="absolute -bottom-1/3 -right-1/4 size-[85%] rounded-full bg-[radial-gradient(circle,rgba(255,157,99,0.55),rgba(255,213,150,0.25)_45%,transparent_70%)] blur-xl" />
      <div className="relative flex items-center gap-3 px-3 py-2.5">
        <Dots tone="light" />
        <span className="h-2 w-28 rounded-full bg-[var(--hover-2)]" />
      </div>
      <div className="relative space-y-2 px-3.5">
        <div className="ml-auto w-fit max-w-[78%] rounded-[10px] rounded-br-[4px] bg-ink px-2.5 py-1.5 text-[9.5px] leading-snug text-white">
          Find a quiet café near me that opens before 7
        </div>
        <div className="w-[86%] rounded-[10px] bg-white/90 p-2 shadow-card backdrop-blur">
          <span className="flex items-center gap-1.5 text-[9.5px] font-medium">
            <Sparkles className="size-3 text-warm" />
            <Shimmer>Planning 3 steps</Shimmer>
          </span>
          <span className="mt-1.5 flex items-center gap-1.5 text-[9px] text-ink-2">
            <Check className="size-2.5 text-ok" strokeWidth={3} /> Checked your location
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[9px] text-ink-2">
            <Check className="size-2.5 text-ok" strokeWidth={3} /> Searched opening hours
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[9px] text-ink">
            <span className="size-2.5 rounded-full border-[1.5px] border-line-strong border-t-warm" style={{ animation: "bui-spin 800ms linear infinite" }} />
            Comparing reviews
          </span>
        </div>
      </div>
    </div>
  );
}
