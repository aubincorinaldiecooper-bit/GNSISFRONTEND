import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { JobRecord, RunEvent } from "@/lib/api";
import { RunActivityTimeline, AttemptActivityStrip } from "./RunActivityTimeline";
import { eventLabel, groupRunEvents, isFailureEvent, mergeRunEvents } from "@/lib/timelineEvents";

const job = (status: JobRecord["status"] = "planning"): JobRecord => ({ id: "run/1", repo: "acme/repo", instruction: "Do it", base_branch: "main", engine: "agent", model: "model", advisor_model: null, status, branch: null, error: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", usage: {} });
const event = (id: string, sequence: number, type: string, payload: RunEvent["payload"] = {}): RunEvent => ({ id, run_id: "run/1", sequence, type, at: `2026-01-01T00:00:0${sequence}Z`, payload });

describe("RunActivityTimeline", () => {
  it("shows a truthful waiting state with no events yet, never a fabricated step", () => {
    render(<RunActivityTimeline run={job()} events={[]} loading polling reconnecting={false} />);
    expect(screen.getByText("Waiting for execution to begin")).toBeInTheDocument();
    expect(screen.getByText("Working")).toBeInTheDocument();
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

  it("shows Ready for review once the ready milestone is reached, replacing the old terse 'GNSIS finished'", () => {
    render(<RunActivityTimeline run={job("completed")} events={[event("a", 1, "agent.started"), event("b", 2, "run.completed")]} loading={false} polling={false} reconnecting={false} />);
    expect(screen.getByRole("heading", { name: "Ready for review" })).toBeInTheDocument();
    expect(screen.queryByText("GNSIS finished")).not.toBeInTheDocument();
    expect(screen.queryByText("GNSIS is working")).not.toBeInTheDocument();
  });

  it("keeps failure guidance visible, technical details collapsed, and copies only technical data", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<RunActivityTimeline run={job("failed")} events={[event("f", 1, "run.failed", { stage: "authentication", execution_started: true, model_called: false, next_action: "Check configuration.", technical: { code: "bad_identity" } })]} loading={false} polling={false} reconnecting={false} />);
    expect(screen.getByText("Attempt stopped")).toBeInTheDocument();
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

  it("treats blocked as an Attempt stopped case, distinguished from a generic working header by its explanation, not a separate heading", () => {
    render(<RunActivityTimeline run={job("blocked")} events={[event("b", 1, "run.blocked", { next_action: "Try again." })]} loading={false} polling={false} reconnecting={false} />);
    expect(screen.getByRole("heading", { name: "Attempt stopped" })).toHaveClass("text-red-600");
    expect(screen.getByText("This run could not begin because a required prerequisite was unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("GNSIS is working")).not.toBeInTheDocument();
  });

  it("treats rejection as its own neutral terminal state, never as Ready for review", () => {
    render(<RunActivityTimeline run={job("rejected")} events={[event("r", 1, "run.rejected")]} loading={false} polling={false} reconnecting={false} />);
    expect(screen.getByText("Run rejected")).toBeInTheDocument();
    expect(screen.getByText("The proposed result was not approved.")).toBeInTheDocument();
    expect(screen.queryByText("GNSIS finished")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready for review")).not.toBeInTheDocument();
  });

  it("treats cancellation as its own neutral terminal state, never as Ready for review", () => {
    render(<RunActivityTimeline run={job("cancelled")} events={[event("c", 1, "run.cancelled")]} loading={false} polling={false} reconnecting={false} />);
    expect(screen.getByText("Run cancelled")).toBeInTheDocument();
    expect(screen.getByText("The run was cancelled before it finished.")).toBeInTheDocument();
    expect(screen.queryByText("GNSIS finished")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready for review")).not.toBeInTheDocument();
  });

  it("moves infrastructure-shaped events into a collapsed 'Security and technical details' section", () => {
    render(
      <RunActivityTimeline
        run={job("planning")}
        events={[event("a", 1, "repository.access_verified"), event("b", 2, "executor.authenticated"), event("c", 3, "source.downloaded")]}
        loading={false}
        polling
        reconnecting={false}
      />,
    );
    const details = screen.getByText("Security and technical details").closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByText(/Executor identity verified/)).toBeInTheDocument();
  });
});

describe("AttemptActivityStrip", () => {
  it("renders nothing once the run is terminal — the outcome components take over instead", () => {
    const { container } = render(<AttemptActivityStrip job={job("completed")} events={[]} isTerminal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a truthful one-line current-stage summary while non-terminal", () => {
    render(<AttemptActivityStrip job={job("planning")} events={[event("a", 1, "agent.started")]} isTerminal={false} />);
    expect(screen.getByText(/Understanding the project/)).toBeInTheDocument();
  });

  it("shows a grounded failure explanation rather than the generic stage summary", () => {
    render(<AttemptActivityStrip job={job("failed")} events={[event("f", 1, "run.failed", { message: "The trusted executor could not be started." })]} isTerminal={false} />);
    expect(screen.getByText("The trusted executor could not be started.")).toBeInTheDocument();
  });
});
