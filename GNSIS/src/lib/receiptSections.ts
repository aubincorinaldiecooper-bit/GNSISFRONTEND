// Derives the outcome-first Receipt hierarchy from a RunReceipt + its
// JobRecord: header, changes, verification, agent, intelligence, publication,
// technical evidence — in the order the redesigned ReceiptPanel renders them.
//
// This is the first consumer of `receipt.approval`, `receipt.pull_request`,
// and `receipt.cost.reconciliation_state` — all three already exist in the
// wire type but were previously read nowhere in the app.

import type { JobRecord, RunReceipt } from "@/lib/api";
import { getRunLifecycleState, type LifecycleStageId } from "@/lib/runLifecycle";

export interface CostState {
  label: string;
  known: boolean;
}

/**
 * "Cost unavailable" whenever the backend has not resolved a real figure yet
 * (cost is entirely absent, or its own `reconciliation_state` says so) — only
 * a backend-confirmed resolved cost ever renders as a dollar amount, and that
 * amount may legitimately be $0.00.
 */
export function formatProviderCostState(cost: RunReceipt["cost"]): CostState {
  if (cost == null) return { label: "Cost unavailable", known: false };
  if (cost.reconciliation_state != null && cost.reconciliation_state !== "resolved") {
    return { label: "Cost unavailable", known: false };
  }
  const amount = Number(cost.provider_cost);
  if (!Number.isFinite(amount)) return { label: "Cost unavailable", known: false };
  return {
    label: amount.toLocaleString("en-US", { style: "currency", currency: cost.currency || "USD" }),
    known: true,
  };
}

export interface IntelligenceRow {
  count: number;
  label: string;
}

export interface IntelligenceSectionState {
  selected: IntelligenceRow;
  delivered: IntelligenceRow;
  proposed: IntelligenceRow;
  approved: IntelligenceRow;
}

/**
 * Selected / delivered / proposed / approved are kept as four independently
 * counted facts — never collapsed into one another, and never described as
 * the model having "used", "applied", "learned from", or been "influenced
 * by" the intelligence (that would claim a semantic-use fact nobody attests).
 */
export function formatIntelligenceState(receipt: RunReceipt): IntelligenceSectionState {
  const supplied = receipt.intelligence?.supplied ?? [];
  const proposed = receipt.intelligence?.proposed ?? [];
  const approved = receipt.intelligence?.approved ?? [];
  const deliveredCount = supplied.filter((item) => item.delivered).length;

  return {
    selected: {
      count: supplied.length,
      label: supplied.length === 0 ? "None selected for this run" : `${supplied.length} selected for this run`,
    },
    delivered: {
      count: deliveredCount,
      label: deliveredCount === 0 ? "None" : `${deliveredCount} delivered to the model request`,
    },
    proposed: {
      count: proposed.length,
      label: proposed.length === 0 ? "None proposed" : `${proposed.length} proposed`,
    },
    approved: {
      count: approved.length,
      label: approved.length === 0 ? "None approved" : `${approved.length} approved by the human`,
    },
  };
}

export interface CheckRow {
  name: string;
  status: string;
  passed: boolean | null;
}

/** Breaks the receipt's one `tests` field into named rows instead of a single joined string. */
export function formatCheckRows(tests: RunReceipt["tests"]): CheckRow[] {
  if (tests == null) return [];
  if (typeof tests === "string") {
    if (tests === "not_run") return [{ name: "Repository checks", status: "not_run", passed: null }];
    return [{ name: "Repository checks", status: tests, passed: tests === "passed" ? true : tests === "failed" ? false : null }];
  }
  const runner = typeof tests["runner"] === "string" ? (tests["runner"] as string) : "Repository checks";
  const statusValue = typeof tests["status"] === "string" ? (tests["status"] as string) : null;
  const failedCount = typeof tests["failed"] === "number" ? (tests["failed"] as number) : null;
  const status = statusValue ?? (failedCount != null ? (failedCount > 0 ? "failed" : "passed") : "unknown");
  return [{ name: runner, status, passed: status === "passed" ? true : status === "failed" ? false : null }];
}

/** The existing all-or-nothing token breakdown, preserved verbatim (a real
 * zero across all four fields is a legitimate answer, never hidden). */
export function formatTokensSummary(tokens: RunReceipt["tokens"]): string {
  if (tokens === null) return "Unavailable";
  if (tokens.input === 0 && tokens.output === 0 && tokens.cached === 0 && tokens.reasoning === 0) return "0";
  return `Input ${tokens.input.toLocaleString()} · Output ${tokens.output.toLocaleString()} · Cached ${tokens.cached.toLocaleString()} · Reasoning ${tokens.reasoning.toLocaleString()}`;
}

function outputValidationState(receipt: RunReceipt, job: JobRecord): "passed" | "failed" | "unknown" {
  if (
    job.status === "awaiting_approval" ||
    job.status === "approved" ||
    job.status === "publishing" ||
    job.status === "completed" ||
    job.status === "rejected"
  ) {
    // Reaching this far always implies GNSIS's own structural output
    // validation already succeeded — the backend never advances a job here
    // otherwise.
    return "passed";
  }
  if (job.status === "cancelled") {
    // Cancellation can happen at any stage; only claim validation passed
    // when there is positive evidence (a non-empty patch), never by default.
    return receipt.files_changed.length > 0 ? "passed" : "unknown";
  }
  return "unknown";
}

function publicationPhase(job: JobRecord): "pre_approval" | "approved_not_published" | "published" {
  if (job.status === "completed") return "published";
  if (job.status === "approved" || job.status === "publishing") return "approved_not_published";
  return "pre_approval";
}

export interface ReceiptSections {
  header: { title: string; qualifier: string | null; description: string; failed: boolean };
  changes: { filesChanged: string[] };
  verification: { outputValidation: "passed" | "failed" | "unknown"; checks: CheckRow[] };
  agent: { model: string; advisorModel: string | null; tokensSummary: string; cost: CostState };
  intelligence: IntelligenceSectionState;
  publication: {
    phase: "pre_approval" | "approved_not_published" | "published";
    pullRequest: RunReceipt["pull_request"];
    approval: RunReceipt["approval"];
  };
  technical: {
    repository: string;
    startingCommit: string | null;
    executionId: string | null;
    patchHash: string | null;
    durationSeconds: number | null;
    executionStarted: boolean | undefined;
    rawTokens: RunReceipt["tokens"];
    timestamps: RunReceipt["timing"];
  };
  lifecycleStage: LifecycleStageId;
}

export function getReceiptSections(receipt: RunReceipt, job: JobRecord): ReceiptSections {
  const lifecycle = getRunLifecycleState(job, receipt.tests);
  const failed = lifecycle.stage === "attempt_stopped" || lifecycle.stage === "publication_failed";

  return {
    header: {
      title: lifecycle.label,
      qualifier: lifecycle.qualifier,
      description: (failed ? receipt.failure_message : null) ?? receipt.task,
      failed,
    },
    changes: { filesChanged: receipt.files_changed },
    verification: {
      outputValidation: outputValidationState(receipt, job),
      checks: formatCheckRows(receipt.tests),
    },
    agent: {
      model: receipt.model ?? "—",
      advisorModel: receipt.advisor_model ?? null,
      tokensSummary: formatTokensSummary(receipt.tokens),
      cost: formatProviderCostState(receipt.cost),
    },
    intelligence: formatIntelligenceState(receipt),
    publication: {
      phase: publicationPhase(job),
      pullRequest: receipt.pull_request,
      approval: receipt.approval,
    },
    technical: {
      repository: receipt.repository,
      startingCommit: receipt.base_sha ?? null,
      executionId: receipt.execution_run_id,
      patchHash: receipt.patch_hash ?? null,
      durationSeconds: receipt.timing?.duration_seconds ?? null,
      executionStarted: receipt.execution_started,
      rawTokens: receipt.tokens,
      timestamps: receipt.timing ?? null,
    },
    lifecycleStage: lifecycle.stage,
  };
}
