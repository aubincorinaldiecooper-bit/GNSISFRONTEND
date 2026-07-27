import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { JobRecord, RunEvent } from "@/lib/api";
import { RunActivityTimeline } from "./RunActivityTimeline";
import { eventLabel, groupRunEvents, isFailureEvent, mergeRunEvents } from "@/lib/timelineEvents";

const job = (status: JobRecord["status"] = "planning"): JobRecord => ({ id: "run/1", repo: "acme/repo", instruction: "Do it", base_branch: "main", engine: "agent", model: "model", advisor_model: null, status, branch: null, error: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", usage: {} });
const event = (id: string, sequence: number, type: string, payload: RunEvent["payload"] = {}): RunEvent => ({ id, run_id: "run/1", sequence, type, at: `2026-01-01T00:00:0${sequence}Z`, payload });

describe("RunActivityTimeline", () => {
  it("shows truthful immediate activity while waiting", () => {
    render(<RunActivityTimeline run={job()} events={[]} loading polling reconnecting={false} compact />);
    expect(screen.getAllByText("Request received").length).toBeGreaterThan(0);
    expect(screen.getByText("Waiting for execution to begin")).toBeInTheDocument();
  });

  it("merges by id and preserves backend sequence order", () => {
    expect(mergeRunEvents([event("b", 2, "tests.started")], [event("a", 1, "run.created"), event("b", 2, "tests.started")]).map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("maps unknown events safely and groups consecutive file activity", () => {
    expect(eventLabel(event("x", 1, "future.event"))).toBe("Run activity recorded");
    const grouped = groupRunEvents([event("a", 1, "tool.file_read", { path: "a.ts" }), event("b", 2, "tool.file_read", { path: "b.ts" }), event("c", 3, "tool.file_changed", { path: "c.ts" }), event("d", 4, "tool.file_changed", { path: "d.ts" })]);
    expect(grouped.map((item) => item.label)).toEqual(["Reviewed 2 project files", "Updated 2 files"]);
  });

  it("recognizes only failed and blocked lifecycle evidence as failure events", () => {
    expect(isFailureEvent(event("ok", 1, "repository.access_verified"))).toBe(false);
    expect(isFailureEvent(event("failed", 2, "source.download.failed"))).toBe(true);
    expect(isFailureEvent(event("blocked", 3, "run.blocked"))).toBe(true);
  });

  it("keeps failure guidance visible, technical details collapsed, and copies only technical data", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<RunActivityTimeline run={job("failed")} events={[event("f", 1, "run.failed", { stage: "authentication", execution_started: true, model_called: false, next_action: "Check configuration.", technical: { code: "bad_identity" } })]} loading={false} polling={false} reconnecting={false} />);
    expect(screen.getByText(/Execution began:/)).toHaveTextContent("Yes");
    expect(screen.getByText("Technical details").closest("details")).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText("Technical details"));
    await userEvent.click(screen.getByRole("button", { name: "Copy technical details" }));
    expect(writeText).toHaveBeenCalledWith(JSON.stringify({ code: "bad_identity" }, null, 2));
  });

  it("presents receipt failure independently and retries only the receipt", async () => {
    const retryReceipt = vi.fn();
    render(<RunActivityTimeline run={job("completed")} events={[event("done", 1, "run.completed")]} loading={false} polling={false} reconnecting={false} receiptState="unavailable" onRetryReceipt={retryReceipt} />);
    expect(screen.getByText(/run outcome is known/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry receipt" }));
    expect(retryReceipt).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Retry run" })).not.toBeInTheDocument();
  });

  it("treats blocked as a distinct terminal state", () => {
    render(<RunActivityTimeline run={job("blocked")} events={[event("b", 1, "run.blocked", { next_action: "Try again." })]} loading={false} polling={false} reconnecting={false} compact />);
    expect(screen.getAllByText("Run could not start")[0]).toHaveClass("text-amber-700");
    expect(screen.queryByText("GNSIS is working")).not.toBeInTheDocument();
  });
});
