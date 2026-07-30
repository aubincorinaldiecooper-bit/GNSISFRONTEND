// The single source of truth for a run's user-facing lifecycle stage. Replaces
// what used to be five independent status→label mappings scattered across
// App.tsx (jobStatusToRunStatus, runLabelCls, sidebarStatusIcon,
// CollapsedRunPanel's inline ternary, DashboardView's counts reducer) — each
// had drifted to slightly different vocabulary for the same JobStatus.
//
// Always derives the lifecycle label from `job.status` (the JobRecord's own
// status, authoritative end-to-end), never from a RunReceipt's own `status`
// field — the receipt's `status` reflects the *execution run's* status, which
// reaches "completed" the moment the patch is validated, before human
// approval or publishing. Reading it for the lifecycle label would make a
// receipt say "Published" while the job is merely awaiting review.

import type { JobRecord, JobStatus, RunReceipt } from "@/lib/api";
import { isTerminalStatus } from "@/lib/api";

export type LifecycleStageId =
  | "queued"
  | "working"
  | "ready_for_review"
  | "approved"
  | "published"
  | "attempt_stopped"
  | "publication_failed"
  | "rejected"
  | "cancelled";

export type LifecycleIndicatorKind = "idle" | "active" | "completed" | "waiting" | "failed";

export interface RunLifecycleState {
  stage: LifecycleStageId;
  label: string;
  /** A secondary fact shown alongside the label, e.g. "Checks need attention" or "Not published". */
  qualifier: string | null;
  indicatorKind: LifecycleIndicatorKind;
  isTerminal: boolean;
}

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStageId, string> = {
  queued: "Queued",
  working: "Working",
  ready_for_review: "Ready for review",
  approved: "Approved",
  published: "Published",
  attempt_stopped: "Attempt stopped",
  publication_failed: "Publication failed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// Reuses today's 5-value dot/color vocabulary (App.tsx's StatusKind) rather
// than inventing new colors. "Approved" intentionally shares "waiting" with
// "Ready for review" — they're distinguished by label text, never by color
// alone, per the accessibility requirement that status must not rely on
// color alone. "Rejected"/"Cancelled" share "idle" (a muted, non-alarming
// dot) since they are terminal-by-choice, not failures.
const INDICATOR_KINDS: Record<LifecycleStageId, LifecycleIndicatorKind> = {
  queued: "idle",
  working: "active",
  ready_for_review: "waiting",
  approved: "waiting",
  published: "completed",
  attempt_stopped: "failed",
  publication_failed: "failed",
  rejected: "idle",
  cancelled: "idle",
};

/**
 * A validated patch — and therefore a receipt worth showing — may exist
 * starting at "awaiting_approval", well before the job reaches a terminal
 * status. Deliberately broader than `isTerminalStatus`.
 */
export function isReceiptEligibleStatus(status: JobStatus): boolean {
  return (
    status === "awaiting_approval" ||
    status === "approved" ||
    status === "publishing" ||
    isTerminalStatus(status)
  );
}

/**
 * The backend sets `job.error` to a string starting with "publishing failed"
 * only when `publish_approved()` fails after a job was already approved (see
 * gnsisbackend's executor/publish.py). This is the one evidence-grounded way
 * to tell "the agent's own execution attempt stopped" apart from "the agent
 * succeeded and was approved, but publishing the change afterwards failed" —
 * both currently share the same generic `failed` JobStatus.
 */
function isPublicationFailure(job: JobRecord): boolean {
  return (
    job.status === "failed" &&
    typeof job.error === "string" &&
    job.error.toLowerCase().startsWith("publishing failed")
  );
}

/** Does the record already available for this run's repository checks indicate a failure? */
function checksNeedAttention(tests: RunReceipt["tests"] | undefined): boolean {
  if (tests == null) return false;
  if (typeof tests === "string") return tests === "failed";
  const status = tests["status"];
  if (typeof status === "string") return status === "failed";
  const failed = tests["failed"];
  return typeof failed === "number" && failed > 0;
}

/**
 * The run's lifecycle stage, derived only from `job.status` plus (optionally)
 * the repository-check outcome already available from a loaded receipt.
 * `tests` is optional and omitted by callers (sidebar, runs table) that have
 * not loaded a receipt — passing it never triggers a fetch.
 */
export function getRunLifecycleState(job: JobRecord, tests?: RunReceipt["tests"]): RunLifecycleState {
  let stage: LifecycleStageId;
  let qualifier: string | null = null;

  switch (job.status) {
    case "queued":
      stage = "queued";
      break;
    case "planning":
    case "patching":
    case "testing":
    case "summarizing":
      stage = "working";
      break;
    case "awaiting_approval":
      stage = "ready_for_review";
      if (checksNeedAttention(tests)) qualifier = "Checks need attention";
      break;
    case "approved":
    case "publishing":
      stage = "approved";
      qualifier = "Not published";
      break;
    case "completed":
      stage = "published";
      break;
    case "rejected":
      stage = "rejected";
      break;
    case "cancelled":
      stage = "cancelled";
      break;
    case "blocked":
      stage = "attempt_stopped";
      break;
    case "failed":
      stage = isPublicationFailure(job) ? "publication_failed" : "attempt_stopped";
      break;
    default:
      stage = "working";
  }

  return {
    stage,
    label: LIFECYCLE_STAGE_LABELS[stage],
    qualifier,
    indicatorKind: INDICATOR_KINDS[stage],
    isTerminal: isTerminalStatus(job.status),
  };
}

/** For the Runs view's status filter dropdown. */
export const LIFECYCLE_FILTER_OPTIONS: readonly LifecycleStageId[] = [
  "queued",
  "working",
  "ready_for_review",
  "approved",
  "published",
  "attempt_stopped",
  "publication_failed",
  "rejected",
  "cancelled",
];
