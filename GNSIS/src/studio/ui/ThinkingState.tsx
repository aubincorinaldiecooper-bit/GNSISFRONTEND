// Adapted from Beautiful UI (MIT, © 2026 Shane Levine): see ./LICENSE-beautiful-ui.txt.
// The "Steps" trace: a shimmering header while working, steps that tick off
// one by one, then a settled summary that stays expandable.

import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Shimmer } from "./Shimmer";

const STEP_MS = 900;

export function ThinkingState({
  steps,
  active,
  done,
  icon,
  className,
}: {
  steps: readonly string[];
  /** Header while working. */
  active: string;
  /** Header once every step has finished. */
  done: string;
  icon?: ReactNode;
  className?: string;
}) {
  // How many steps have started; steps.length + 1 means all finished.
  const [stage, setStage] = useState(1);
  const [expanded, setExpanded] = useState(true);
  const finished = stage > steps.length;

  useEffect(() => {
    if (finished) return;
    const id = window.setTimeout(() => setStage((s) => s + 1), STEP_MS);
    return () => window.clearTimeout(id);
  }, [stage, finished]);

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-control px-1.5 py-1 transition-colors duration-100 hover:bg-hover-2 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--signal)]"
      >
        <span className={cn("flex shrink-0 transition-colors duration-200", finished ? "text-ink-3" : "text-signal")}>{icon}</span>
        <span role="status" className="text-[13.5px] font-medium whitespace-nowrap">
          {finished ? <span className="text-ink-2" style={{ animation: "bui-fade-in 350ms ease-out both" }}>{done}</span> : <Shimmer>{active}</Shimmer>}
        </span>
        <ChevronDown className={cn("size-3.5 text-ink-3 transition-transform duration-300", expanded && "rotate-180")} />
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-500 ease-out-strong"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr", opacity: expanded ? 1 : 0 }}
      >
        <div className="overflow-hidden">
          <ol className="relative ml-[7px] mt-1 border-l border-line py-1 pl-4">
            {steps.slice(0, Math.min(stage, steps.length)).map((step, i) => {
              const running = i === stage - 1 && !finished;
              return (
                <li
                  key={step}
                  className="flex min-h-7 items-center gap-2 rounded-chip px-1.5 py-0.5"
                  style={{ animation: "bui-fade-up 320ms cubic-bezier(0.23,1,0.32,1) both" }}
                >
                  {running ? (
                    <span className="size-3 shrink-0 rounded-full border-[1.5px] border-line-strong border-t-signal" style={{ animation: "bui-spin 700ms linear infinite" }} />
                  ) : (
                    <Check className="size-3.5 shrink-0 text-ink-3" strokeWidth={2.5} />
                  )}
                  <span className={cn("min-w-0 text-[13px]", running ? "font-medium text-ink" : "text-ink-2")}>{step}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
