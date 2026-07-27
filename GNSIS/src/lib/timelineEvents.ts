import type { RunEvent } from "@/lib/api";

const labels: Record<string, string> = {
  "run.created": "Request received", "run.queued": "Waiting for execution",
  "repository.access_verified": "Repository access confirmed", "repository.base_resolved": "Starting commit locked",
  "run.dispatch_started": "Starting the trusted executor", "executor.workflow_dispatched": "Trusted executor started",
  "executor.authentication_started": "Verifying executor identity", "executor.authenticated": "Executor identity verified",
  "source.download_started": "Loading repository source", "source.downloaded": "Repository source loaded",
  "sandbox.prepare_started": "Preparing an isolated workspace", "sandbox.ready": "Isolated workspace ready",
  "agent.started": "Reviewing the project", "tool.command_completed": "Command completed",
  "tests.started": "Running tests", "tests.completed": "Tests completed",
  "output.validation_started": "Validating the result", "output.validated": "Result validated",
  "run.awaiting_approval": "Ready for review", "receipt.ready": "Receipt prepared",
  "run.completed": "Run completed", "run.failed": "Run stopped", "run.blocked": "Run could not start",
};

function safeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function eventLabel(event: RunEvent): string {
  if (event.type === "agent.progress") return safeText(event.payload.message) ?? "Work is continuing";
  if (event.type === "tool.file_read") return `Inspected ${safeText(event.payload.path) ?? "a project file"}`;
  if (event.type === "tool.file_changed") return `Updated ${safeText(event.payload.path) ?? "a project file"}`;
  if (event.type === "tool.command_started") return `Running ${safeText(event.payload.command_label) ?? safeText(event.payload.label) ?? "a project command"}`;
  return labels[event.type] ?? safeText(event.payload.message) ?? "Run activity recorded";
}

export type TimelineItem = { event: RunEvent; label: string; paths?: string[]; count?: number };
export function mergeRunEvents(current: RunEvent[], incoming: RunEvent[]): RunEvent[] {
  return [...new Map([...current, ...incoming].map((event) => [event.id, event])).values()].sort((a, b) => a.sequence - b.sequence);
}

export function groupRunEvents(events: RunEvent[]): TimelineItem[] {
  const ordered = mergeRunEvents([], events);
  const result: TimelineItem[] = [];
  for (let i = 0; i < ordered.length; i += 1) {
    const event = ordered[i];
    if (event.type === "tool.file_read" || event.type === "tool.file_changed") {
      const grouped = [event];
      while (ordered[i + 1]?.type === event.type) grouped.push(ordered[++i]);
      if (grouped.length > 1) {
        const noun = event.type === "tool.file_read" ? "Reviewed" : "Updated";
        result.push({ event, label: `${noun} ${grouped.length} ${event.type === "tool.file_read" ? "project files" : "files"}`, count: grouped.length,
          paths: grouped.map((item) => safeText(item.payload.path)).filter((path): path is string => !!path) });
        continue;
      }
    }
    result.push({ event, label: eventLabel(event) });
  }
  return result;
}
