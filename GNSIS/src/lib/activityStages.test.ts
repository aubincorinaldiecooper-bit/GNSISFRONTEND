import { describe, it, expect } from "vitest";

import { normalizeActivityEvents } from "@/lib/activityStages";
import type { JobRecord, JobStatus, RunEvent } from "@/lib/api";

function job(status: JobStatus): JobRecord {
  return {
    id: "run-1", repo: "acme/widgets", instruction: "Add a README", base_branch: "main",
    engine: "claude", model: "anthropic/claude-sonnet-5", advisor_model: null, status,
    branch: null, error: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", usage: {},
  };
}

let seq = 0;
function ev(type: string, payload: RunEvent["payload"] = {}): RunEvent {
  seq += 1;
  return { id: `e${seq}`, run_id: "run-1", sequence: seq, type, at: "2026-01-01T00:00:00Z", payload };
}

describe("normalizeActivityEvents", () => {
  it("never invents stages beyond what the events actually reached", () => {
    const result = normalizeActivityEvents([ev("run.created")], job("queued"));
    expect(result.stages.map((s) => s.id)).toEqual(["preparing"]);
  });

  it("collapses the source download start/finish pair into one visible stage, not two", () => {
    const result = normalizeActivityEvents(
      [ev("run.created"), ev("source.download_started"), ev("source.downloaded")],
      job("planning"),
    );
    const loadingStages = result.stages.filter((s) => s.id === "loading");
    expect(loadingStages).toHaveLength(1);
  });

  it("collapses executor authentication start/finish into one stage", () => {
    const result = normalizeActivityEvents(
      [ev("executor.authentication_started"), ev("executor.authenticated")],
      job("planning"),
    );
    expect(result.stages.filter((s) => s.id === "preparing")).toHaveLength(1);
  });

  it("collapses tests started/completed and output validation start/finish into one checking stage", () => {
    const result = normalizeActivityEvents(
      [ev("tests.started"), ev("tests.completed"), ev("output.validation_started"), ev("output.validated")],
      job("testing"),
    );
    expect(result.stages.filter((s) => s.id === "checking")).toHaveLength(1);
  });

  it("produces a deterministic, grounded Thinking summary from agent.started alone", () => {
    const result = normalizeActivityEvents([ev("agent.started")], job("planning"));
    const thinking = result.stages.find((s) => s.id === "thinking");
    expect(thinking?.summary).toBe("Thinking · Understanding the project");
  });

  it("grounds the Thinking summary in the actual number of files reviewed, never a fabricated count", () => {
    const result = normalizeActivityEvents(
      [
        ev("agent.started"),
        ev("tool.file_read", { path: "README.md" }),
        ev("tool.file_read", { path: "package.json" }),
        ev("tool.file_read", { path: "src/index.ts" }),
      ],
      job("planning"),
    );
    const thinking = result.stages.find((s) => s.id === "thinking");
    expect(thinking?.summary).toBe("Thinking · Reviewed 3 project files");
  });

  it("never renders a free-form multi-sentence chain-of-thought — summaries stay one short line", () => {
    const result = normalizeActivityEvents(
      [ev("agent.started"), ev("agent.progress", { message: "internal reasoning: considering approach A vs B at length..." })],
      job("planning"),
    );
    const thinking = result.stages.find((s) => s.id === "thinking");
    // The raw message is allowed to surface verbatim as evidence (never
    // paraphrased/expanded), but the stage summary itself must not balloon
    // into more than one line of text.
    expect(thinking?.summary.split("\n")).toHaveLength(1);
  });

  it("buckets an unrecognized future event type as evidence rather than dropping it", () => {
    const result = normalizeActivityEvents([ev("agent.started"), ev("executor.some_future_kind", { message: "new backend fact" })], job("planning"));
    const thinking = result.stages.find((s) => s.id === "thinking");
    expect(thinking?.evidence.some((item) => item.event.type === "executor.some_future_kind")).toBe(true);
  });

  it("separates a failure event out of the stage list entirely", () => {
    const result = normalizeActivityEvents(
      [ev("run.dispatch_started"), ev("run.failed", { execution_started: false, message: "The trusted executor could not be started." })],
      job("failed"),
    );
    expect(result.stages.some((s) => s.id === "ready")).toBe(false);
    expect(result.failure).not.toBeNull();
    expect(result.failure?.summary).toBe("The trusted executor could not be started.");
    expect(result.failure?.executionStarted).toBe(false);
  });

  it("produces an evidence-grounded blocked explanation without a persisted message", () => {
    const result = normalizeActivityEvents([ev("run.blocked", {})], job("blocked"));
    expect(result.failure?.summary).toBe("This run could not begin because a required prerequisite was unavailable.");
    expect(result.failure?.blocked).toBe(true);
  });

  it("marks a non-blocked failure distinctly so callers can choose 'Attempt stopped' vs 'Run could not start'", () => {
    const result = normalizeActivityEvents([ev("run.failed", { execution_started: true })], job("failed"));
    expect(result.failure?.blocked).toBe(false);
  });

  it("routes infra-shaped events into the technical bucket for the collapsed section", () => {
    const result = normalizeActivityEvents(
      [ev("repository.access_verified"), ev("executor.authenticated"), ev("source.downloaded")],
      job("planning"),
    );
    const technicalTypes = result.technical.map((e) => e.type);
    expect(technicalTypes).toEqual(expect.arrayContaining(["repository.access_verified", "executor.authenticated", "source.downloaded"]));
  });

  it("marks the run.awaiting_approval milestone as Ready and terminal for the stage view", () => {
    const result = normalizeActivityEvents(
      [ev("agent.started"), ev("tool.file_changed", { path: "README.md" }), ev("run.awaiting_approval")],
      job("awaiting_approval"),
    );
    const ready = result.stages.find((s) => s.id === "ready");
    expect(ready?.status).toBe("done");
  });
});
