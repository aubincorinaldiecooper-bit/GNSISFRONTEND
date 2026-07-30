// Normalizes the raw, infrastructure-shaped lifecycle events for a run into a
// small set of named, human-readable activity stages — the "understandable
// coding agent" view, as distinct from the raw executor/audit trail.
//
// Truthfulness rule: a stage's `summary` is built only from event counts and
// known milestones (via lib/timelineEvents.ts's existing groupRunEvents /
// eventLabel — unchanged, reused as-is). Any free-form backend message
// (payload.message, e.g. from an "agent.progress" event) is attached verbatim
// as evidence, never paraphrased or expanded into invented detail — this is
// what keeps "Thinking" a summary of observable work, never fabricated and
// never a stand-in for hidden chain-of-thought.
//
// Stages advance through a single monotonic cursor over an ordered milestone
// table (see STAGE_MILESTONES below). Anything that isn't itself a milestone
// (agent.progress, tool.command_*, an unrecognized future event type) simply
// attaches as evidence to whichever stage the cursor currently sits at — this
// is what makes an unrecognized event type safe by construction: it is never
// dropped, and never promoted into a stage it wasn't confirmed to reach.

import type { JobRecord, RunEvent } from "@/lib/api";
import { eventLabel, groupRunEvents, isFailureEvent, type TimelineItem } from "@/lib/timelineEvents";

export type ActivityStageId =
  | "preparing"
  | "loading"
  | "thinking"
  | "planning"
  | "editing"
  | "checking"
  | "preparing_review"
  | "ready";

const STAGE_TITLES: Record<ActivityStageId, string> = {
  preparing: "Preparing",
  loading: "Loading the project",
  thinking: "Thinking",
  planning: "Planning the change",
  editing: "Editing files",
  checking: "Checking the result",
  preparing_review: "Preparing the result for review",
  ready: "Ready for review",
};

// Ordered milestone → stage table. First match wins; the cursor only ever
// moves forward. Types not listed here never advance the cursor.
const STAGE_MILESTONES: { type: string; stage: ActivityStageId }[] = [
  { type: "run.created", stage: "preparing" },
  { type: "run.queued", stage: "preparing" },
  { type: "repository.access_verified", stage: "preparing" },
  { type: "repository.base_resolved", stage: "preparing" },
  { type: "run.dispatch_started", stage: "preparing" },
  { type: "executor.authentication_started", stage: "preparing" },
  { type: "executor.authenticated", stage: "preparing" },
  { type: "executor.workflow_dispatched", stage: "preparing" },
  { type: "source.download_started", stage: "loading" },
  { type: "source.downloaded", stage: "loading" },
  { type: "sandbox.prepare_started", stage: "loading" },
  { type: "sandbox.ready", stage: "loading" },
  { type: "agent.started", stage: "thinking" },
  { type: "tool.file_read", stage: "thinking" },
  { type: "tool.file_changed", stage: "editing" },
  { type: "tests.started", stage: "checking" },
  { type: "tests.completed", stage: "checking" },
  { type: "output.validation_started", stage: "checking" },
  { type: "output.validated", stage: "checking" },
  { type: "receipt.ready", stage: "preparing_review" },
  { type: "run.awaiting_approval", stage: "ready" },
  { type: "run.completed", stage: "ready" },
];

const STAGE_ORDER: ActivityStageId[] = [
  "preparing",
  "loading",
  "thinking",
  "planning",
  "editing",
  "checking",
  "preparing_review",
  "ready",
];

function stageIndex(stage: ActivityStageId): number {
  return STAGE_ORDER.indexOf(stage);
}

function milestoneStageFor(type: string): ActivityStageId | null {
  return STAGE_MILESTONES.find((m) => m.type === type)?.stage ?? null;
}

export interface NormalizedActivityStage {
  id: ActivityStageId;
  title: string;
  /** A concise, grounded one-line summary — never longer, never invented. */
  summary: string;
  status: "active" | "done";
  /** The raw grouped items chronologically bucketed into this stage, for the detailed inspector. */
  evidence: TimelineItem[];
}

export interface NormalizedActivityFailure {
  summary: string;
  /** A prerequisite was never satisfied (run.blocked), as opposed to a started attempt that stopped. */
  blocked: boolean;
  executionStarted: boolean;
  modelCalled: boolean;
  nextAction: string | null;
  technical: Record<string, unknown> | null;
}

export interface NormalizedActivity {
  /** Only stages actually reached, in order — never padded with invented "upcoming" entries. */
  stages: NormalizedActivityStage[];
  /** Raw, infrastructure-shaped events for the collapsed "Security and technical details" section. */
  technical: RunEvent[];
  failure: NormalizedActivityFailure | null;
}

function safeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function summarize(stage: ActivityStageId, evidence: TimelineItem[]): string {
  if (stage === "thinking") {
    const fileGroup = evidence.find((item) => item.count && item.event.type === "tool.file_read");
    if (fileGroup) return `Thinking · ${fileGroup.label}`;
    return "Thinking · Understanding the project";
  }
  if (stage === "editing") {
    const fileGroup = evidence.find((item) => item.count && item.event.type === "tool.file_changed");
    if (fileGroup) return `Editing files · ${fileGroup.label}`;
    return "Editing files";
  }
  if (stage === "checking") {
    const last = evidence[evidence.length - 1];
    return last ? last.label : "Checking the result";
  }
  // Every other stage's title is already a concise, grounded description on
  // its own; only attach a trailing detail when one is genuinely available.
  const message = evidence
    .map((item) => safeText(item.event.payload.message))
    .find((text): text is string => text !== null);
  return message ? `${STAGE_TITLES[stage]} · ${message}` : STAGE_TITLES[stage];
}

/**
 * `job` is used only to keep the overall done/active framing correct when the
 * live event stream is reconnecting or briefly lagging behind the job's own
 * authoritative status — mirroring the existing "an events outage must never
 * freeze terminal status" isolation already used elsewhere in the app.
 */
export function normalizeActivityEvents(events: RunEvent[], job: JobRecord): NormalizedActivity {
  const grouped = groupRunEvents(events);
  const technical: RunEvent[] = [];
  const byStage = new Map<ActivityStageId, TimelineItem[]>();
  let cursor: ActivityStageId | null = null;
  let failureItem: TimelineItem | null = null;

  for (const item of grouped) {
    if (isFailureEvent(item.event)) {
      failureItem = item;
      continue;
    }
    const milestoneStage = milestoneStageFor(item.event.type);
    if (milestoneStage && (cursor === null || stageIndex(milestoneStage) > stageIndex(cursor))) {
      cursor = milestoneStage;
    }
    const bucket = cursor ?? "preparing";
    if (!byStage.has(bucket)) byStage.set(bucket, []);
    byStage.get(bucket)!.push(item);
    // "Security and technical details": infra-shaped raw events, kept
    // available for audit but never part of the human-facing stage summary.
    if (
      item.event.type.startsWith("executor.") ||
      item.event.type.startsWith("repository.") ||
      item.event.type === "run.dispatch_started" ||
      item.event.type === "source.download_started" ||
      item.event.type === "source.downloaded" ||
      item.event.type === "receipt.ready"
    ) {
      technical.push(item.event);
    }
  }

  const reachedIndex = cursor ? stageIndex(cursor) : -1;
  const stages: NormalizedActivityStage[] = STAGE_ORDER.filter((_, i) => i <= reachedIndex && byStage.has(STAGE_ORDER[i])).map(
    (stage, i, arr) => {
      const evidence = byStage.get(stage) ?? [];
      const isLast = i === arr.length - 1;
      return {
        id: stage,
        title: STAGE_TITLES[stage],
        summary: summarize(stage, evidence),
        status: isLast && !job.status.match(/^(completed|rejected|blocked|failed|cancelled|awaiting_approval)$/) ? "active" : "done",
        evidence,
      };
    },
  );

  let failure: NormalizedActivityFailure | null = null;
  if (failureItem) {
    const payload = failureItem.event.payload;
    const executionStarted = payload.execution_started === true;
    const blocked = failureItem.event.type === "run.blocked" || failureItem.event.type.endsWith(".blocked");
    failure = {
      summary:
        safeText(payload.message) ??
        (blocked
          ? "This run could not begin because a required prerequisite was unavailable."
          : `The trusted executor ${executionStarted ? "started but stopped" : "could not be started"}${
              safeText(payload.stage) ? ` during ${payload.stage}` : ""
            }.`),
      blocked,
      executionStarted,
      modelCalled: payload.model_called === true,
      nextAction: safeText(payload.next_action),
      technical: (payload.technical as Record<string, unknown> | undefined) ?? null,
    };
  }

  return { stages, technical, failure };
}

// Re-exported so consumers of this module don't also need to import from
// lib/timelineEvents.ts directly just to type the evidence list.
export type { TimelineItem };
export { eventLabel };
