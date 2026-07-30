import { describe, it, expect } from "vitest";

import { getRunLifecycleState, isReceiptEligibleStatus, LIFECYCLE_FILTER_OPTIONS } from "@/lib/runLifecycle";
import type { JobRecord, JobStatus } from "@/lib/api";

function job(status: JobStatus, overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "run-1",
    repo: "acme/widgets",
    instruction: "Add a README",
    base_branch: "main",
    engine: "claude",
    model: "anthropic/claude-sonnet-5",
    advisor_model: null,
    status,
    branch: null,
    error: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    usage: {},
    ...overrides,
  };
}

describe("getRunLifecycleState", () => {
  it("maps queued", () => {
    expect(getRunLifecycleState(job("queued")).stage).toBe("queued");
  });

  it("collapses every in-flight sub-status to working", () => {
    for (const status of ["planning", "patching", "testing", "summarizing"] as const) {
      const state = getRunLifecycleState(job(status));
      expect(state.stage).toBe("working");
      expect(state.indicatorKind).toBe("active");
    }
  });

  it("maps awaiting_approval to ready_for_review with no qualifier when checks are unknown", () => {
    const state = getRunLifecycleState(job("awaiting_approval"));
    expect(state.stage).toBe("ready_for_review");
    expect(state.label).toBe("Ready for review");
    expect(state.qualifier).toBeNull();
  });

  it("surfaces 'Checks need attention' without treating the run itself as failed", () => {
    const state = getRunLifecycleState(job("awaiting_approval"), { runner: "npm", status: "failed", passed: 0, failed: 3 });
    expect(state.stage).toBe("ready_for_review");
    expect(state.qualifier).toBe("Checks need attention");
    expect(state.indicatorKind).not.toBe("failed");
  });

  it("recognizes a passing check summary as no qualifier", () => {
    const state = getRunLifecycleState(job("awaiting_approval"), { runner: "npm", status: "passed", passed: 12, failed: 0 });
    expect(state.qualifier).toBeNull();
  });

  it("recognizes a raw string 'failed' tests value", () => {
    const state = getRunLifecycleState(job("awaiting_approval"), "failed");
    expect(state.qualifier).toBe("Checks need attention");
  });

  it("maps approved to its own stage, distinct from actively working (fixes the approved/publishing bug)", () => {
    const state = getRunLifecycleState(job("approved"));
    expect(state.stage).toBe("approved");
    expect(state.label).toBe("Approved");
    expect(state.qualifier).toBe("Not published");
    expect(state.indicatorKind).not.toBe("active");
  });

  it("maps publishing to the same approved stage as approved (not to working)", () => {
    const state = getRunLifecycleState(job("publishing"));
    expect(state.stage).toBe("approved");
    expect(state.indicatorKind).not.toBe("active");
  });

  it("maps completed to published", () => {
    const state = getRunLifecycleState(job("completed"));
    expect(state.stage).toBe("published");
    expect(state.label).toBe("Published");
    expect(state.indicatorKind).toBe("completed");
  });

  it("maps rejected and cancelled to their own distinct, non-failure stages", () => {
    expect(getRunLifecycleState(job("rejected")).stage).toBe("rejected");
    expect(getRunLifecycleState(job("cancelled")).stage).toBe("cancelled");
    expect(getRunLifecycleState(job("rejected")).indicatorKind).toBe("idle");
    expect(getRunLifecycleState(job("cancelled")).indicatorKind).toBe("idle");
  });

  it("maps blocked to attempt_stopped", () => {
    const state = getRunLifecycleState(job("blocked"));
    expect(state.stage).toBe("attempt_stopped");
    expect(state.label).toBe("Attempt stopped");
  });

  it("maps a generic failed status to attempt_stopped", () => {
    const state = getRunLifecycleState(job("failed", { error: "OIDC verification failed" }));
    expect(state.stage).toBe("attempt_stopped");
  });

  it("distinguishes a failed publish from a failed execution attempt using the backend's own error text", () => {
    const state = getRunLifecycleState(job("failed", { error: "publishing failed: base branch moved since approval; a new run is required" }));
    expect(state.stage).toBe("publication_failed");
    expect(state.label).toBe("Publication failed");
  });

  it("is case-insensitive when detecting the publishing-failed error prefix", () => {
    const state = getRunLifecycleState(job("failed", { error: "Publishing failed: network error" }));
    expect(state.stage).toBe("publication_failed");
  });

  it("never treats a merely-similar error message as a publication failure", () => {
    const state = getRunLifecycleState(job("failed", { error: "the executor could not be started" }));
    expect(state.stage).toBe("attempt_stopped");
  });

  it("sets isTerminal from the same TERMINAL_STATUSES every other caller uses", () => {
    expect(getRunLifecycleState(job("queued")).isTerminal).toBe(false);
    expect(getRunLifecycleState(job("approved")).isTerminal).toBe(false);
    expect(getRunLifecycleState(job("completed")).isTerminal).toBe(true);
    expect(getRunLifecycleState(job("failed")).isTerminal).toBe(true);
  });
});

describe("isReceiptEligibleStatus", () => {
  it("is true starting at awaiting_approval, well before terminal", () => {
    expect(isReceiptEligibleStatus("awaiting_approval")).toBe(true);
    expect(isReceiptEligibleStatus("approved")).toBe(true);
    expect(isReceiptEligibleStatus("publishing")).toBe(true);
  });

  it("is true for every terminal status", () => {
    for (const status of ["completed", "rejected", "blocked", "failed", "cancelled"] as const) {
      expect(isReceiptEligibleStatus(status)).toBe(true);
    }
  });

  it("is false while still queued or in-flight", () => {
    for (const status of ["queued", "planning", "patching", "testing", "summarizing"] as const) {
      expect(isReceiptEligibleStatus(status)).toBe(false);
    }
  });
});

describe("LIFECYCLE_FILTER_OPTIONS", () => {
  it("covers every stage exactly once", () => {
    expect(new Set(LIFECYCLE_FILTER_OPTIONS).size).toBe(LIFECYCLE_FILTER_OPTIONS.length);
    expect(LIFECYCLE_FILTER_OPTIONS).toContain("approved");
    expect(LIFECYCLE_FILTER_OPTIONS).toContain("publication_failed");
  });
});
