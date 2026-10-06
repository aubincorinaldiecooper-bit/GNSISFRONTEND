// Adapted from Beautiful UI (MIT, © 2026 Shane Levine): see ./LICENSE-beautiful-ui.txt.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "signal" | "ok" | "warm";

const pill: Record<Tone, string> = {
  neutral: "bg-inset text-ink-2 shadow-hairline",
  signal: "bg-signal-tint text-signal-ink",
  ok: "bg-ok-tint text-ok",
  warm: "bg-warm-tint text-warm",
};

const dot: Record<Tone, string> = {
  neutral: "bg-ink-3",
  signal: "bg-signal",
  ok: "bg-ok",
  warm: "bg-warm",
};

export function StatusPill({
  tone = "neutral",
  live = false,
  children,
  className,
}: {
  tone?: Tone;
  /** The dot breathes: something is happening right now. */
  live?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium leading-none", pill[tone], className)}>
      <span className="relative flex size-1.5">
        {live && <span className={cn("absolute inset-0 rounded-full opacity-60", dot[tone])} style={{ animation: "bui-ping 1.6s cubic-bezier(0,0,0.2,1) infinite" }} />}
        <span className={cn("relative size-1.5 rounded-full", dot[tone])} />
      </span>
      {children}
    </span>
  );
}
