import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Circle, Copy, Loader2 } from "lucide-react";
import type { JobRecord, RunEvent } from "@/lib/api";
import { normalizeActivityEvents } from "@/lib/activityStages";
import { eventLabel } from "@/lib/timelineEvents";
import { cn } from "@/lib/utils";

export type ReceiptActivityState = "idle" | "loading" | "loaded" | "unavailable" | "error";

function safeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * The right panel's detailed stage inspector — the ONE place the full,
 * step-by-step activity for a run is ever shown. The center column shows only
 * a one-line current-stage summary (see AttemptActivityStrip in App.tsx); this
 * component is never mounted twice for the same run at once.
 */
export function RunActivityTimeline({ run, events, loading, polling, reconnecting, receiptState, onRetryReceipt }: {
  run: JobRecord; events: RunEvent[]; loading: boolean; polling: boolean; reconnecting: boolean;
  receiptState?: ReceiptActivityState; onRetryReceipt?: () => void;
}) {
  const activity = useMemo(() => normalizeActivityEvents(events, run), [events, run]);
  const rejected = run.status === "rejected";
  const cancelled = run.status === "cancelled";
  const reachedReady = activity.stages.some((stage) => stage.id === "ready");
  const [copied, setCopied] = useState(false);
  const [techniqueOpen, setTechniqueOpen] = useState(false);

  const heading = rejected
    ? "Run rejected"
    : cancelled
    ? "Run cancelled"
    : activity.failure
    ? "Attempt stopped"
    : reachedReady
    ? "Ready for review"
    : "Working";

  const copyTechnical = async () => {
    if (!activity.failure?.technical || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(JSON.stringify(activity.failure.technical, null, 2));
    setCopied(true);
  };

  return (
    <section className="px-4 py-3" aria-label="Run activity">
      <h3 className={cn("text-sm font-semibold mb-2", activity.failure && "text-red-600")}>{heading}</h3>

      <ol className="relative ml-1 border-l border-border" aria-live="off">
        {activity.stages.map((stage) => {
          const active = stage.status === "active";
          return (
            <li key={stage.id} className="relative pl-6 pb-3 last:pb-1" aria-label={`${active ? "In progress" : "Completed"}: ${stage.title}`}>
              <span className="absolute -left-2 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background" aria-hidden="true">
                {active ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Check className="h-4 w-4" />}
              </span>
              <p className="text-sm leading-snug" title={stage.evidence[0]?.event.at ? new Date(stage.evidence[0].event.at).toLocaleString() : undefined}>
                {stage.summary}
              </p>
              {stage.evidence.some((item) => item.paths?.length) && (
                <details className="mt-1 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">View file paths</summary>
                  <ul className="mt-1 space-y-0.5 font-mono">
                    {stage.evidence.flatMap((item) => item.paths ?? []).map((path) => (
                      <li key={path}>{path}</li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
        {activity.stages.length === 0 && !activity.failure && (
          <li className="relative pl-6 pb-1" aria-label="Waiting: Waiting for execution to begin">
            <Circle className="absolute -left-2 top-0.5 h-4 w-4 bg-background text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Waiting for execution to begin</p>
          </li>
        )}
      </ol>

      {polling && !reconnecting && <p className="sr-only" aria-live="polite">Current run activity is updating</p>}
      {reconnecting && <p className="mt-2 text-xs text-muted-foreground" role="status">Activity is reconnecting</p>}
      {loading && activity.stages.length === 0 && <p className="sr-only">Loading run activity</p>}

      {activity.failure && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-muted-foreground">{activity.failure.summary}</p>
          <p className="text-muted-foreground">
            Execution began: <strong>{activity.failure.executionStarted ? "Yes" : "No"}</strong> · Model called:{" "}
            <strong>{activity.failure.modelCalled ? "Yes" : "No"}</strong>
          </p>
          {activity.failure.nextAction && (
            <p>
              <strong>Suggested action:</strong>
              <br />
              {activity.failure.nextAction}
            </p>
          )}
          {activity.failure.technical && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Technical details</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-neutral-950 p-3 text-neutral-100 whitespace-pre-wrap">
                {JSON.stringify(activity.failure.technical, null, 2)}
              </pre>
              <button type="button" onClick={copyTechnical} aria-label="Copy technical details" className="mt-1 inline-flex items-center gap-1 underline">
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : "Copy technical details"}
              </button>
            </details>
          )}
        </div>
      )}

      {activity.technical.length > 0 && (
        <details
          className="mt-3 border-t border-border pt-3 text-xs"
          open={techniqueOpen}
          onToggle={(e) => setTechniqueOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="flex cursor-pointer items-center gap-1 font-medium text-muted-foreground">
            <ChevronDown className={cn("h-3 w-3 transition-transform", techniqueOpen && "rotate-180")} aria-hidden="true" />
            Security and technical details
          </summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {activity.technical.map((event) => (
              <li key={event.id} className="font-mono">
                {new Date(event.at).toLocaleTimeString()} — {eventLabel(event)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {(receiptState === "unavailable" || receiptState === "error") && (
        <div className="mt-3 border-t border-border pt-3 text-sm">
          <p className="font-medium">Receipt unavailable</p>
          <p className="text-muted-foreground">The run outcome is known, but its detailed receipt could not be loaded.</p>
          {onRetryReceipt && (
            <button type="button" onClick={onRetryReceipt} className="mt-1 underline">
              Retry receipt
            </button>
          )}
        </div>
      )}

      {rejected ? (
        <p className="mt-2 text-xs text-muted-foreground">The proposed result was not approved.</p>
      ) : cancelled ? (
        <p className="mt-2 text-xs text-muted-foreground">The run was cancelled before it finished.</p>
      ) : null}
    </section>
  );
}

/**
 * The center column's lightweight, non-duplicating counterpart: a single line
 * naming the current stage while the run is still in flight. Once terminal,
 * RunExecution's own outcome components (RunCompleteMessage, FailedMessage,
 * TerminalMessage, BetaRunReview) already carry the outcome, so this renders
 * nothing rather than repeating the full stage list the right panel already
 * shows for the same run.
 */
export function AttemptActivityStrip({ job, events, isTerminal }: { job: JobRecord; events: RunEvent[]; isTerminal: boolean }) {
  if (isTerminal) return null;
  const activity = normalizeActivityEvents(events, job);
  if (activity.failure) {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700">
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
        {activity.failure.summary}
      </p>
    );
  }
  const current = activity.stages[activity.stages.length - 1];
  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {safeText(current?.summary) ?? "Waiting for execution to begin"}
    </p>
  );
}
