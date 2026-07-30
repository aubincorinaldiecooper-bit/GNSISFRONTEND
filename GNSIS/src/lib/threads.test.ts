import { describe, it, expect } from "vitest";

import {
  groupJobsIntoThreadRows,
  getAttemptSummary,
  collapsibleAttemptIds,
  summarizeCollapsedAttempts,
} from "@/lib/threads";
import type { JobRecord, JobStatus } from "@/lib/api";

function job(id: string, status: JobStatus, overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id, repo: "acme/widgets", instruction: "Add a README", base_branch: "main",
    engine: "claude", model: "anthropic/claude-sonnet-5", advisor_model: null, status,
    branch: null, error: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", usage: {},
    ...overrides,
  };
}

describe("groupJobsIntoThreadRows", () => {
  it("collapses every attempt of the same thread into a single row", () => {
    const jobs = [
      job("run-1", "failed", { thread_id: "run-1", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:01:00Z" }),
      job("run-2", "failed", { thread_id: "run-1", parent_job_id: "run-1", created_at: "2026-01-01T00:02:00Z", updated_at: "2026-01-01T00:03:00Z" }),
      job("run-3", "awaiting_approval", { thread_id: "run-1", parent_job_id: "run-2", created_at: "2026-01-01T00:04:00Z", updated_at: "2026-01-01T00:05:00Z" }),
    ];
    const rows = groupJobsIntoThreadRows(jobs);
    expect(rows).toHaveLength(1);
    expect(rows[0].attemptCount).toBe(3);
  });

  it("represents the row with the thread's most-recently-updated run, not the oldest", () => {
    const jobs = [
      job("run-1", "failed", { thread_id: "run-1", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:01:00Z" }),
      job("run-2", "awaiting_approval", { thread_id: "run-1", parent_job_id: "run-1", created_at: "2026-01-01T00:02:00Z", updated_at: "2026-01-01T00:03:00Z" }),
    ];
    const rows = groupJobsIntoThreadRows(jobs);
    expect(rows[0].id).toBe("run-2");
    expect(rows[0].status).toBe("ready_for_review");
  });

  it("titles the row from the thread's first (root) instruction, not the latest reply", () => {
    const jobs = [
      job("run-1", "completed", { thread_id: "run-1", instruction: "Add a README", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:01:00Z" }),
      job("run-2", "completed", { thread_id: "run-1", parent_job_id: "run-1", instruction: "Now add a LICENSE too", created_at: "2026-01-01T00:02:00Z", updated_at: "2026-01-01T00:03:00Z" }),
    ];
    const rows = groupJobsIntoThreadRows(jobs);
    expect(rows[0].title).toBe("Add a README");
  });

  it("keeps unrelated threads as separate rows", () => {
    const jobs = [
      job("run-1", "completed", { thread_id: "run-1" }),
      job("run-2", "queued", { thread_id: "run-2" }),
    ];
    expect(groupJobsIntoThreadRows(jobs)).toHaveLength(2);
  });

  it("treats a legacy job with no thread_id as its own single-run thread", () => {
    const jobs = [job("run-legacy", "completed", { thread_id: undefined })];
    const rows = groupJobsIntoThreadRows(jobs);
    expect(rows).toHaveLength(1);
    expect(rows[0].threadId).toBe("run-legacy");
    expect(rows[0].attemptCount).toBe(1);
  });

  it("sorts rows by most recently updated thread first", () => {
    const jobs = [
      job("run-1", "completed", { thread_id: "run-1", updated_at: "2026-01-01T00:00:00Z" }),
      job("run-2", "completed", { thread_id: "run-2", updated_at: "2026-01-02T00:00:00Z" }),
    ];
    const rows = groupJobsIntoThreadRows(jobs);
    expect(rows[0].threadId).toBe("run-2");
  });
});

describe("getAttemptSummary", () => {
  it("derives elapsed time from job timestamps without touching a receipt", () => {
    const summary = getAttemptSummary(
      job("run-1", "completed", { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:02:36Z" }),
      3,
    );
    expect(summary.attemptNumber).toBe(3);
    expect(summary.elapsedLabel).toBe("2m 36s");
    expect(summary.lifecycle.stage).toBe("published");
  });
});

describe("collapsibleAttemptIds", () => {
  it("collapses only the trailing run of stopped attempts, never the tip", () => {
    const jobs = [
      job("run-1", "failed"),
      job("run-2", "failed"),
      job("run-3", "awaiting_approval"),
    ];
    const collapsible = collapsibleAttemptIds(jobs);
    expect(collapsible.has("run-1")).toBe(true);
    expect(collapsible.has("run-2")).toBe(true);
    expect(collapsible.has("run-3")).toBe(false);
  });

  it("stops at the first non-stopped attempt walking backward from the tip", () => {
    const jobs = [
      job("run-1", "failed"),
      job("run-2", "completed"), // a real success in the middle — must break the trailing run
      job("run-3", "failed"),
      job("run-4", "awaiting_approval"),
    ];
    const collapsible = collapsibleAttemptIds(jobs);
    expect(collapsible.has("run-3")).toBe(true);
    expect(collapsible.has("run-2")).toBe(false);
    expect(collapsible.has("run-1")).toBe(false);
  });

  it("returns an empty set for a single-attempt thread", () => {
    expect(collapsibleAttemptIds([job("run-1", "completed")]).size).toBe(0);
  });
});

describe("summarizeCollapsedAttempts", () => {
  it("uses honest generic 'stopped' copy, not an unverifiable 'before execution' claim", () => {
    const summary = summarizeCollapsedAttempts([job("run-1", "failed"), job("run-2", "failed")]);
    expect(summary).toBe("2 earlier attempts stopped");
  });

  it("uses singular wording for exactly one collapsed attempt", () => {
    expect(summarizeCollapsedAttempts([job("run-1", "failed")])).toBe("1 earlier attempt stopped");
  });

  it("describes an all-rejected run distinctly", () => {
    expect(summarizeCollapsedAttempts([job("run-1", "rejected"), job("run-2", "rejected")])).toBe("2 earlier attempts rejected");
  });
});
