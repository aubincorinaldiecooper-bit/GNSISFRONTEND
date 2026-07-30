import { describe, it, expect } from "vitest";

import {
  formatProviderCostState,
  formatIntelligenceState,
  formatCheckRows,
  formatTokensSummary,
  getReceiptSections,
} from "@/lib/receiptSections";
import type { JobRecord, JobStatus, RunReceipt } from "@/lib/api";

function job(status: JobStatus, overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "run-root", repo: "acme/widgets", instruction: "Add a README", base_branch: "main",
    engine: "claude", model: "anthropic/claude-sonnet-5", advisor_model: null, status,
    branch: null, error: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", usage: {},
    ...overrides,
  };
}

function receipt(overrides: Partial<RunReceipt> = {}): RunReceipt {
  return {
    object: "receipt", run_id: "run-root", execution_run_id: "exec-1", task: "Add a README",
    repository: "acme/widgets", status: "completed", model: "anthropic/claude-sonnet-5",
    approval: null, pull_request: null, files_changed: [], tokens: null, tests: null, cost: null,
    failure_category: null, failure_message: null,
    ...overrides,
  };
}

describe("formatProviderCostState", () => {
  it("is unavailable when cost is entirely absent", () => {
    expect(formatProviderCostState(null)).toEqual({ label: "Cost unavailable", known: false });
  });

  it("is unavailable when the backend marks it unresolved", () => {
    const state = formatProviderCostState({ provider_cost: "0", currency: "USD", reconciliation_state: "needs_reconciliation" });
    expect(state).toEqual({ label: "Cost unavailable", known: false });
  });

  it("renders a real $0.00 when the backend omits reconciliation_state (preserves the existing zero-value receipt contract)", () => {
    const state = formatProviderCostState({ provider_cost: "0", currency: "USD" });
    expect(state).toEqual({ label: "$0.00", known: true });
  });

  it("renders a real $0.00 when the backend explicitly marks it resolved", () => {
    const state = formatProviderCostState({ provider_cost: "0", currency: "USD", reconciliation_state: "resolved" });
    expect(state.known).toBe(true);
    expect(state.label).toBe("$0.00");
  });

  it("formats a genuine non-zero known cost", () => {
    const state = formatProviderCostState({ provider_cost: "1.5", currency: "USD", reconciliation_state: "resolved" });
    expect(state.label).toBe("$1.50");
    expect(state.known).toBe(true);
  });
});

describe("formatIntelligenceState", () => {
  it("renders honest empty-state copy for every category, never a bare zero", () => {
    const state = formatIntelligenceState(receipt({ intelligence: { supplied: [], proposed: [], approved: [] } }));
    expect(state.selected).toEqual({ count: 0, label: "None selected for this run" });
    expect(state.delivered).toEqual({ count: 0, label: "None" });
    expect(state.proposed).toEqual({ count: 0, label: "None proposed" });
    expect(state.approved).toEqual({ count: 0, label: "None approved" });
  });

  it("defaults to the same honest empty state when intelligence is omitted entirely", () => {
    const state = formatIntelligenceState(receipt({ intelligence: undefined }));
    expect(state.selected.count).toBe(0);
    expect(state.delivered.count).toBe(0);
  });

  it("keeps selected and delivered distinct — delivered only counts attested items", () => {
    const state = formatIntelligenceState(
      receipt({
        intelligence: {
          supplied: [
            { memory_id: "m1", kind: null, content: null, selected: true, delivered: true, source_run_id: null, source_model: null, source_advisor_model: null, approval_id: null, approved_by: null, approved_at: null, destination_run_id: "run-root", destination_model: null },
            { memory_id: "m2", kind: null, content: null, selected: true, delivered: false, source_run_id: null, source_model: null, source_advisor_model: null, approval_id: null, approved_by: null, approved_at: null, destination_run_id: "run-root", destination_model: null },
          ],
          proposed: [],
          approved: [],
        },
      }),
    );
    expect(state.selected.count).toBe(2);
    expect(state.delivered.count).toBe(1);
  });
});

describe("formatCheckRows", () => {
  it("returns no rows when tests data is entirely absent", () => {
    expect(formatCheckRows(null)).toEqual([]);
  });

  it("represents 'not_run' distinctly from pass/fail", () => {
    expect(formatCheckRows("not_run")).toEqual([{ name: "Repository checks", status: "not_run", passed: null }]);
  });

  it("reads a structured tests_summary record", () => {
    const rows = formatCheckRows({ runner: "npm", status: "failed", passed: 0, failed: 3, skipped: 0 });
    expect(rows).toEqual([{ name: "npm", status: "failed", passed: false }]);
  });

  it("infers status from a failed count when no explicit status field is present", () => {
    const rows = formatCheckRows({ runner: "pytest", failed: 2, passed: 5 });
    expect(rows[0].status).toBe("failed");
    expect(rows[0].passed).toBe(false);
  });
});

describe("formatTokensSummary", () => {
  it("is Unavailable when tokens is null", () => {
    expect(formatTokensSummary(null)).toBe("Unavailable");
  });

  it("renders a literal 0 for a genuine all-zero token count, never hiding it", () => {
    expect(formatTokensSummary({ input: 0, output: 0, cached: 0, reasoning: 0 })).toBe("0");
  });

  it("renders a full breakdown for real usage", () => {
    expect(formatTokensSummary({ input: 100, output: 20, cached: 5, reasoning: 1 })).toContain("Input 100");
  });
});

describe("getReceiptSections", () => {
  it("reproduces the exact known-zero-value receipt contract pinned by App.thread.test.tsx", () => {
    const r = receipt({
      task: "Canonical blocked task", repository: "canonical/repo", status: "blocked",
      execution_started: false, model: "canonical/model", tests: "not_run",
      cost: { provider_cost: "0", currency: "USD" },
      failure_category: "blocked_preflight", failure_message: "Canonical failure message",
    });
    const sections = getReceiptSections(r, job("blocked"));
    expect(sections.agent.cost).toEqual({ label: "$0.00", known: true });
    expect(sections.verification.checks).toEqual([{ name: "Repository checks", status: "not_run", passed: null }]);
    expect(sections.technical.executionStarted).toBe(false);
    expect(sections.header.title).toBe("Attempt stopped");
    expect(sections.header.description).toBe("Canonical failure message");
    expect(sections.header.failed).toBe(true);
  });

  it("never sources the lifecycle label from receipt.status — only from job.status", () => {
    // receipt.status here claims "completed" (the execution run's own status)
    // while the job itself is only awaiting_approval — this must not render "Published".
    const r = receipt({ status: "completed" });
    const sections = getReceiptSections(r, job("awaiting_approval"));
    expect(sections.header.title).toBe("Ready for review");
  });

  it("distinguishes a validated patch with failing repository checks from a failed agent execution", () => {
    const r = receipt({ tests: { runner: "npm", status: "failed", passed: 0, failed: 3 } });
    const sections = getReceiptSections(r, job("awaiting_approval"));
    expect(sections.header.title).toBe("Ready for review");
    expect(sections.header.qualifier).toBe("Checks need attention");
    expect(sections.header.failed).toBe(false);
  });

  it("shows Approved · Not published distinctly from Published", () => {
    const approvedSections = getReceiptSections(receipt(), job("approved"));
    expect(approvedSections.header.title).toBe("Approved");
    expect(approvedSections.header.qualifier).toBe("Not published");
    expect(approvedSections.publication.phase).toBe("approved_not_published");

    const publishedSections = getReceiptSections(receipt(), job("completed"));
    expect(publishedSections.header.title).toBe("Published");
    expect(publishedSections.publication.phase).toBe("published");
  });

  it("distinguishes a failed publish attempt from a failed execution attempt", () => {
    const r = receipt();
    const sections = getReceiptSections(r, job("failed", { error: "publishing failed: base branch moved since approval; a new run is required" }));
    expect(sections.header.title).toBe("Publication failed");
  });

  it("surfaces the previously-unrendered pull_request field for the Publication section", () => {
    const r = receipt({ pull_request: { number: 42, url: "https://github.com/acme/widgets/pull/42", branch: "gnsis/run-root" } });
    const sections = getReceiptSections(r, job("completed"));
    expect(sections.publication.pullRequest).toEqual({ number: 42, url: "https://github.com/acme/widgets/pull/42", branch: "gnsis/run-root" });
  });

  it("surfaces the previously-unrendered approval field", () => {
    const r = receipt({ approval: { decision: "approved", approver: "reviewer@example.com", at: "2026-01-01T00:00:00Z" } });
    const sections = getReceiptSections(r, job("approved"));
    expect(sections.publication.approval).toEqual({ decision: "approved", approver: "reviewer@example.com", at: "2026-01-01T00:00:00Z" });
  });
});
