import { useMemo, useState } from "react";
import { AlertTriangle, Check, Circle, CircleX, Copy, Loader2 } from "lucide-react";
import type { JobRecord, RunEvent } from "@/lib/api";
import { groupRunEvents, isFailureEvent } from "@/lib/timelineEvents";
import { cn } from "@/lib/utils";

export type ReceiptActivityState = "idle" | "loading" | "loaded" | "unavailable" | "error";

function safeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const terminal = new Set(["completed", "failed", "rejected", "blocked", "cancelled"]);
const failedType = (type: string) => type === "run.failed" || type.endsWith(".failed");
const blockedType = (type: string) => type === "run.blocked" || type.endsWith(".blocked");

export function RunActivityTimeline({ run, events, loading, polling, reconnecting, compact = false, receiptState, onRetryReceipt }: {
  run: JobRecord; events: RunEvent[]; loading: boolean; polling: boolean; reconnecting: boolean; compact?: boolean;
  receiptState?: ReceiptActivityState; onRetryReceipt?: () => void;
}) {
  const items = useMemo(() => groupRunEvents(events), [events]);
  const settled = terminal.has(run.status);
  const rejected = run.status === "rejected";
  const cancelled = run.status === "cancelled";
  const failed = run.status === "failed" || run.status === "blocked" || items.some((item) => isFailureEvent(item.event));
  const [expanded, setExpanded] = useState(!settled || failed);
  const [copied, setCopied] = useState(false);

  const visible = items.length ? items : [{ event: { id: "created", run_id: run.id, sequence: 0, type: "run.created", at: run.created_at, payload: {} }, label: "Request received" }];
  const failure = [...visible].reverse().find((item) => isFailureEvent(item.event));
  const technical = failure?.event.payload.technical;
  const copyTechnical = async () => {
    if (!technical || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(JSON.stringify(technical, null, 2)); setCopied(true);
  };

  if (settled && !failed && !expanded && compact) return (
    <button type="button" onClick={() => setExpanded(true)} className="mt-3 text-xs text-muted-foreground hover:text-foreground" aria-expanded="false">
      {rejected ? "Run rejected" : cancelled ? "Run cancelled" : "Run completed"} · {visible.length} steps <span className="underline">Show activity</span>
    </button>
  );

  return <section className={cn("py-3", compact ? "mt-1 border-b border-border" : "px-4")} aria-label="Run activity timeline">
    <div className="flex items-center justify-between gap-2 mb-2">
      <h3 className={cn("text-sm font-semibold", run.status === "blocked" && "text-amber-700")}>{run.status === "blocked" ? "Run could not start" : rejected ? "Run rejected" : cancelled ? "Run cancelled" : settled ? failed ? "GNSIS stopped" : "GNSIS finished" : "GNSIS is working"}</h3>
      {compact && settled && <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setExpanded(false)}>Collapse</button>}
    </div>
    <ol className="relative ml-1 border-l border-border" aria-live="off">
      {visible.map((item, index) => {
        const isFailure = failedType(item.event.type); const isBlocked = blockedType(item.event.type);
        const active = !settled && index === visible.length - 1;
        return <li key={item.event.id} className="relative pl-6 pb-3 last:pb-1" aria-label={`${active ? "In progress" : isFailure ? "Failed" : isBlocked ? "Blocked" : "Completed"}: ${item.label}`}>
          <span className="absolute -left-2 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background" aria-hidden="true">
            {active ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : isFailure ? <CircleX className="h-4 w-4 text-red-600" /> : isBlocked ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <Check className="h-4 w-4" />}
          </span>
          <p className={cn("text-sm leading-snug", (isFailure || isBlocked) && "font-semibold", isFailure && "text-red-700", isBlocked && "text-amber-700")} title={item.event.at ? new Date(item.event.at).toLocaleString() : undefined}>{item.label}</p>
          {item.paths?.length ? <details className="mt-1 text-xs text-muted-foreground"><summary className="cursor-pointer">View file paths</summary><ul className="mt-1 space-y-0.5 font-mono">{item.paths.map((path) => <li key={path}>{path}</li>)}</ul></details> : null}
        </li>;
      })}
      {!settled && items.length === 0 && <li className="relative pl-6 pb-1" aria-label="Waiting: Waiting for execution to begin"><Circle className="absolute -left-2 top-0.5 h-4 w-4 bg-background text-muted-foreground" /><p className="text-sm text-muted-foreground">Waiting for execution to begin</p></li>}
    </ol>
    {polling && !reconnecting && <p className="sr-only" aria-live="polite">Current run activity is updating</p>}
    {reconnecting && <p className="mt-2 text-xs text-muted-foreground" role="status">Activity is reconnecting</p>}
    {loading && items.length === 0 && <p className="sr-only">Loading run activity</p>}
    {failure && <div className="mt-3 space-y-2 text-sm">
      <p className="text-muted-foreground">{safeText(failure.event.payload.message) ?? (blockedType(failure.event.type) ? "This run could not begin because a required prerequisite was unavailable." : `The trusted executor ${failure.event.payload.execution_started ? "started but stopped" : "could not be started"}${failure.event.payload.stage ? ` during ${failure.event.payload.stage}` : ""}.`)}</p>
      <p className="text-muted-foreground">Execution began: <strong>{failure.event.payload.execution_started ? "Yes" : "No"}</strong> · Model called: <strong>{failure.event.payload.model_called ? "Yes" : "No"}</strong></p>
      {safeText(failure.event.payload.next_action) && <p><strong>Suggested action:</strong><br />{String(failure.event.payload.next_action)}</p>}
      {technical && <details className="text-xs"><summary className="cursor-pointer font-medium">Technical details</summary><pre className="mt-2 max-h-48 overflow-auto rounded bg-neutral-950 p-3 text-neutral-100 whitespace-pre-wrap">{JSON.stringify(technical, null, 2)}</pre><button type="button" onClick={copyTechnical} aria-label="Copy technical details" className="mt-1 inline-flex items-center gap-1 underline"><Copy className="h-3 w-3" />{copied ? "Copied" : "Copy technical details"}</button></details>}
    </div>}
    {(receiptState === "unavailable" || receiptState === "error") && <div className="mt-3 border-t border-border pt-3 text-sm"><p className="font-medium">Receipt unavailable</p><p className="text-muted-foreground">The run outcome is known, but its detailed receipt could not be loaded.</p>{onRetryReceipt && <button type="button" onClick={onRetryReceipt} className="mt-1 underline">Retry receipt</button>}</div>}
    {rejected ? <p className="mt-2 text-xs text-muted-foreground">The proposed result was not approved.</p> : cancelled ? <p className="mt-2 text-xs text-muted-foreground">The run was cancelled before it finished.</p> : settled && !failed && <p className="mt-2 text-xs font-medium">Ready for review</p>}
  </section>;
}
