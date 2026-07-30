// Pure, deterministic helpers for conversational run threads. Kept out of the
// component file so they can be unit-tested directly and so App.tsx stays a
// components-only module (React Fast Refresh requirement).

import type { JobRecord, RunReceipt } from "@/lib/api";
import { getRunLifecycleState, type LifecycleStageId } from "@/lib/runLifecycle";

// A thread's title, derived deterministically from its first instruction — never
// a model call. Sentence-cased first non-empty line, collapsed whitespace,
// truncated with an ellipsis.
export function threadTitle(firstInstruction: string): string {
  const firstLine =
    (firstInstruction || "")
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  const collapsed = firstLine.replace(/\s+/g, " ").trim();
  if (!collapsed) return "Untitled run";
  const cased = collapsed.charAt(0).toUpperCase() + collapsed.slice(1);
  const LIMIT = 72;
  return cased.length > LIMIT ? `${cased.slice(0, LIMIT - 1).trimEnd()}…` : cased;
}

// A quiet, deterministic relative time — "just now", "5 minutes ago",
// "2 hours ago", "yesterday", then a localized date — from an ISO timestamp.
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.round((now - then) / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return "yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// The full localized datetime, for the timestamp's hover tooltip.
export function fullDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

// =============================================================================
// THREAD-AWARE SIDEBAR / RUNS-TABLE ROWS
// =============================================================================

// Sidebar/table row shape, derived from real JobRecords — no fabricated
// fields. One row per conversation thread rather than one row per run, so a
// task retried 3 times doesn't clutter the list with 3 near-identical entries.
export interface RecentRun {
  id: string; // the thread's most-recently-updated run — opening it resolves the whole thread
  threadId: string;
  title: string;
  repo: string;
  model: string;
  status: LifecycleStageId;
  updatedAt: string;
  attemptCount: number;
}

/** Groups a flat cross-thread job list (as returned by listJobs) into one row per thread_id. */
export function groupJobsIntoThreadRows(jobs: JobRecord[]): RecentRun[] {
  const byThread = new Map<string, JobRecord[]>();
  for (const job of jobs) {
    const threadId = job.thread_id ?? job.id;
    if (!byThread.has(threadId)) byThread.set(threadId, []);
    byThread.get(threadId)!.push(job);
  }

  const rows: RecentRun[] = [];
  for (const [threadId, threadJobs] of byThread) {
    const oldestFirst = [...threadJobs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const root = oldestFirst[0];
    const tip = oldestFirst.reduce((latest, job) =>
      new Date(job.updated_at).getTime() > new Date(latest.updated_at).getTime() ? job : latest,
    );
    rows.push({
      id: tip.id,
      threadId,
      title: threadTitle(root.instruction),
      repo: root.repo,
      model: root.model ?? "—",
      status: getRunLifecycleState(tip).stage,
      updatedAt: tip.updated_at,
      attemptCount: oldestFirst.length,
    });
  }

  return rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// =============================================================================
// ATTEMPT GROUPING (within a single already-resolved thread)
// =============================================================================

export interface AttemptSummary {
  runId: string;
  attemptNumber: number;
  lifecycle: ReturnType<typeof getRunLifecycleState>;
  model: string;
  /** e.g. "2m 36s" — derived from job timestamps, never a receipt fetch. */
  elapsedLabel: string | null;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`;
}

/** attemptNumber is the run's 1-based position within its thread (trivial array index — no backend field needed). */
export function getAttemptSummary(job: JobRecord, attemptNumber: number, tests?: RunReceipt["tests"]): AttemptSummary {
  const elapsedMs = new Date(job.updated_at).getTime() - new Date(job.created_at).getTime();
  return {
    runId: job.id,
    attemptNumber,
    lifecycle: getRunLifecycleState(job, tests),
    model: job.model ?? "—",
    elapsedLabel: Number.isFinite(elapsedMs) ? formatElapsed(elapsedMs) : null,
  };
}

const COLLAPSIBLE_STAGES = new Set<LifecycleStageId>(["attempt_stopped", "publication_failed", "rejected", "cancelled"]);

/**
 * The trailing run of non-tip attempts (nearest the tip, working backwards)
 * whose lifecycle stage is a stopped/rejected/cancelled outcome. Each attempt
 * keeps its own record — this only decides which ids default to collapsed in
 * the UI, it never merges or discards anything.
 */
export function collapsibleAttemptIds(jobsOldestFirst: JobRecord[]): Set<string> {
  const collapsible = new Set<string>();
  for (let i = jobsOldestFirst.length - 2; i >= 0; i -= 1) {
    if (!COLLAPSIBLE_STAGES.has(getRunLifecycleState(jobsOldestFirst[i]).stage)) break;
    collapsible.add(jobsOldestFirst[i].id);
  }
  return collapsible;
}

/**
 * A grounded one-line summary of a collapsed run of earlier attempts. Stays
 * generic ("stopped") rather than a specific claim like "before execution"
 * when that finer-grained evidence (execution_started) isn't available from
 * a JobRecord alone.
 */
export function summarizeCollapsedAttempts(collapsed: JobRecord[]): string {
  if (collapsed.length === 0) return "";
  const n = collapsed.length;
  const noun = n === 1 ? "attempt" : "attempts";
  const stages = collapsed.map((job) => getRunLifecycleState(job).stage);
  if (stages.every((s) => s === "rejected")) return `${n} earlier ${noun} rejected`;
  if (stages.every((s) => s === "cancelled")) return `${n} earlier ${noun} cancelled`;
  return `${n} earlier ${noun} stopped`;
}
