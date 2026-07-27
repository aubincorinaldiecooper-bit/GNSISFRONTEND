import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

// -- session / env / page mocks (mirror App.routing.test.tsx) -----------------

const sessionValue = {
  status: "authenticated",
  authConfigured: true,
  authUser: { id: "user-1", email: "test@example.com", name: "Test User", image: null, githubLogin: "test" },
  me: {
    user: { id: "user-1", email: "test@example.com", name: "Test User", avatar_url: null },
    workspace: { id: "workspace-1", name: "Test workspace" },
    github: { connected: true, installation_count: 1, repository_count: 1 },
  },
  backendState: "ok",
  signInGitHub: vi.fn(),
  signOut: vi.fn(),
  refreshMe: vi.fn(),
};

const useSessionMock = vi.fn(() => sessionValue);
const publicBetaModeMock = vi.hoisted(() => vi.fn(() => false));
vi.mock("@/lib/session", () => ({ useSession: () => useSessionMock() }));
vi.mock("@/pages/IntegrationTestPage", () => ({ default: () => <h1>Integration test</h1> }));
vi.mock("@/components/ApiKeysSection", () => ({ default: () => <div>API keys</div> }));
vi.mock("@/lib/useVirtualKeys", () => ({
  useVirtualKeys: () => ({ keys: [], loading: false, error: null, createKey: vi.fn(), rotateKey: vi.fn(), disableKey: vi.fn() }),
}));
vi.mock("@/lib/env", () => ({
  apiBaseUrl: () => "https://api.example.test",
  authBaseUrl: () => "https://auth.example.test",
  githubAppSlug: () => "gnsis-test-app",
  integrationLabEnabled: () => true,
  publicBetaMode: () => publicBetaModeMock(),
  isApiConfigured: () => true,
  isAuthConfigured: () => true,
  smokeTestModel: () => "gpt-test",
}));

const apiMocks = vi.hoisted(() => {
  class MockApiError extends Error {
    status: number;
    code: string | null = null;
    requestId: string | null = null;
    details: unknown = null;
    constructor(status: number, message: string) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }
  return {
    MockApiError,
    getJobMock: vi.fn(),
    getJobLogsMock: vi.fn(),
    getJobDiffMock: vi.fn(),
    getRunReceiptMock: vi.fn(),
    getJobThreadMock: vi.fn(),
    followUpJobMock: vi.fn(),
    approveJobMock: vi.fn(),
    rejectJobMock: vi.fn(),
    cancelJobMock: vi.fn(),
    listJobsMock: vi.fn(),
    proposalsMock: vi.fn(),
    approveRunMock: vi.fn(),
    publishRunMock: vi.fn(),
  };
});

vi.mock("@/lib/api", () => ({
  ApiError: apiMocks.MockApiError,
  approveJob: (...a: unknown[]) => apiMocks.approveJobMock(...a),
  rejectJob: (...a: unknown[]) => apiMocks.rejectJobMock(...a),
  cancelJob: (...a: unknown[]) => apiMocks.cancelJobMock(...a),
  createJob: vi.fn(),
  getBalances: vi.fn(async () => ({ workspace_id: "workspace-1", available: "10", reserved: "0", balance: "10" })),
  getJob: (...a: unknown[]) => apiMocks.getJobMock(...a),
  getJobDiff: (...a: unknown[]) => apiMocks.getJobDiffMock(...a),
  getRunReceipt: (...a: unknown[]) => apiMocks.getRunReceiptMock(...a),
  getRunEvents: vi.fn(async () => ({ object: "list", data: [], has_more: false, total: 0, limit: 100, offset: 0 })),
  getRunEventsSince: vi.fn(async () => []),
  getAllRunEvents: vi.fn(async () => []),
  getJobLogs: (...a: unknown[]) => apiMocks.getJobLogsMock(...a),
  getJobThread: (...a: unknown[]) => apiMocks.getJobThreadMock(...a),
  followUpJob: (...a: unknown[]) => apiMocks.followUpJobMock(...a),
  health: vi.fn(),
  isApiConfigured: () => true,
  isTerminalStatus: (s: string) => ["completed", "rejected", "blocked", "failed", "cancelled"].includes(s),
  listEngines: vi.fn(async () => [{ id: "gnsis", label: "GNSIS" }]),
  listJobs: (...a: unknown[]) => apiMocks.listJobsMock(...a),
  listRepositories: vi.fn(async () => []),
  listBranches: vi.fn(async () => ({ default_branch: "main", branches: [] })),
  listModels: vi.fn(async () => ({ items: [] })),
  getRunIntelligenceProposals: (...a: unknown[]) => apiMocks.proposalsMock(...a),
  approveRun: (...a: unknown[]) => apiMocks.approveRunMock(...a),
  publishRun: (...a: unknown[]) => apiMocks.publishRunMock(...a),
  queryRepositoryIntelligence: vi.fn(async () => ({ object: "list", data: [] })),
  listUsageEvents: vi.fn(async () => ({ items: [] })),
  matchesGatewayRequest: vi.fn(() => false),
}));

import App from "@/App";
import { threadTitle, relativeTime } from "@/lib/threads";
import type { JobRecord } from "@/lib/api";

type PartialJob = Partial<JobRecord> & { id: string; instruction: string };

function job(p: PartialJob): JobRecord {
  return {
    repo: "owner/repo",
    base_branch: "main",
    engine: "gnsis",
    model: "anthropic/claude-opus-4.8",
    advisor_model: null,
    status: "completed",
    branch: "feat/x",
    error: null,
    created_at: "2026-07-25T00:00:00.000Z",
    updated_at: "2026-07-25T00:00:00.000Z",
    usage: {},
    thread_id: "run-root",
    parent_job_id: null,
    ...p,
  };
}

function mockThread(runs: JobRecord[]) {
  apiMocks.getJobThreadMock.mockImplementation(async (id: string) => {
    if (!runs.some((r) => r.id === id)) throw new apiMocks.MockApiError(404, "not found");
    return runs;
  });
  // Keep getJob resolvable for any polling of non-terminal runs.
  apiMocks.getJobMock.mockImplementation(async (id: string) => {
    const found = runs.find((r) => r.id === id);
    if (!found) throw new apiMocks.MockApiError(404, "not found");
    return found;
  });
}

function renderThread(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useSessionMock.mockReturnValue(sessionValue);
  publicBetaModeMock.mockReturnValue(false);
  apiMocks.proposalsMock.mockResolvedValue({ object: "list", data: [] });
  apiMocks.listJobsMock.mockResolvedValue([]);
  apiMocks.getJobLogsMock.mockResolvedValue([]);
  apiMocks.getJobDiffMock.mockResolvedValue({ patch: "", files_changed: [] });
  apiMocks.getRunReceiptMock.mockImplementation(async (id: string) => ({
    object: "receipt", run_id: id, execution_run_id: `exec-${id}`, task: "Canonical task", repository: "owner/repo",
    status: "completed", execution_started: true, model: "canonical/model", approval: null,
    pull_request: null, files_changed: [], tokens: { input: 1, output: 2, cached: 0, reasoning: 0 },
    tests: "passed", cost: { provider_cost: "0.25", currency: "USD" },
    failure_category: null, failure_message: null,
  }));
  // Deterministic clipboard for the copy-action tests.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
});

// -- pure helpers -------------------------------------------------------------

describe("threadTitle", () => {
  it("sentence-cases the first non-empty line, no model call", () => {
    expect(threadTitle("add a login form")).toBe("Add a login form");
    expect(threadTitle("\n\n  fix the bug  \nmore detail")).toBe("Fix the bug");
  });

  it("collapses whitespace and truncates long instructions with an ellipsis", () => {
    const long = "Refactor ".repeat(20);
    const title = threadTitle(long);
    expect(title.length).toBeLessThanOrEqual(72);
    expect(title.endsWith("…")).toBe(true);
  });

  it("falls back to a placeholder for empty input", () => {
    expect(threadTitle("   ")).toBe("Untitled run");
  });
});

describe("relativeTime", () => {
  const base = Date.parse("2026-07-25T12:00:00.000Z");
  it("renders coarse, deterministic buckets", () => {
    expect(relativeTime("2026-07-25T11:59:50.000Z", base)).toBe("just now");
    expect(relativeTime("2026-07-25T11:55:00.000Z", base)).toBe("5 minutes ago");
    expect(relativeTime("2026-07-25T10:00:00.000Z", base)).toBe("2 hours ago");
    expect(relativeTime("2026-07-24T12:00:00.000Z", base)).toBe("yesterday");
  });
});

// -- conversation rendering ---------------------------------------------------

describe("conversational run thread", () => {
  it("renders every linked run's instruction, oldest first, as one conversation", async () => {
    mockThread([
      job({ id: "run-root", instruction: "Add a login form", status: "completed" }),
      job({ id: "run-2", instruction: "Also add a logout button", status: "completed", parent_job_id: "run-root" }),
    ]);
    renderThread("/runs/run-root");

    expect((await screen.findAllByText("Add a login form")).length).toBeGreaterThan(0);
    // (Also appears in the side receipt panel for the tip, hence getAllByText.)
    expect((await screen.findAllByText("Also add a logout button")).length).toBeGreaterThan(0);
  });

  it("shows a deterministic thread title + repo + model, and no raw job id", async () => {
    mockThread([job({ id: "run-root", instruction: "Add a login form", model: "anthropic/claude-opus-4.8" })]);
    renderThread("/runs/run-root");

    // Title is the sentence-cased first instruction (an <h1>), not a job id.
    expect(await screen.findByRole("heading", { level: 1, name: "Add a login form" })).toBeInTheDocument();
    expect(screen.getAllByText("owner/repo").length).toBeGreaterThan(0);
    expect(screen.getByText(/Model:/)).toBeInTheDocument();
    // The raw Genesis job id never appears in the main hierarchy.
    expect(screen.queryByText(/run-root/)).not.toBeInTheDocument();
  });

  it("shows the Advisor only when the run pinned one", async () => {
    mockThread([job({ id: "run-root", instruction: "Task", advisor_model: "openai/gpt-5.4" })]);
    renderThread("/runs/run-root");
    expect(await screen.findByText(/Advisor: openai\/gpt-5.4/)).toBeInTheDocument();
  });

  it("offers a copy action on each instruction and confirms with 'Copied'", async () => {
    // fireEvent (not userEvent) so the deterministic clipboard mock installed in
    // beforeEach is the one exercised, independent of userEvent's own stub.
    mockThread([job({ id: "run-root", instruction: "Add a login form" })]);
    renderThread("/runs/run-root");

    const copy = (await screen.findAllByRole("button", { name: "Copy instruction" }))[0];
    fireEvent.click(copy);
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Add a login form"));
    expect(await within(copy).findByText("Copied")).toBeInTheDocument();
  });
});

// -- failed run ---------------------------------------------------------------

describe("failed run presentation", () => {
  it("keeps 'Run failed', separates summary from technical details, and offers Retry", async () => {
    const user = userEvent.setup();
    mockThread([
      job({
        id: "run-root",
        instruction: "Do the thing",
        status: "failed",
        error: "Executor exited with code 1\n  at step: build\n  stderr: boom",
      }),
    ]);
    renderThread("/runs/run-root");

    expect(await screen.findByText("Run failed")).toBeInTheDocument();
    // Concise summary is the first line; the rest is behind a details toggle.
    // (The summary also appears in the side receipt panel, hence getAllByText.)
    expect(screen.getAllByText("Executor exited with code 1").length).toBeGreaterThan(0);
    expect(screen.queryByText(/stderr: boom/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Show technical details/i }));
    expect(screen.getByText(/stderr: boom/)).toBeInTheDocument();
    // A failed run offers "Retry run".
    expect(screen.getByRole("button", { name: /Retry run/i })).toBeInTheDocument();
  });

  it("Retry queues a linked run reusing the parent instruction (no instruction sent)", async () => {
    const user = userEvent.setup();
    mockThread([job({ id: "run-root", instruction: "Do the thing", status: "failed", error: "nope" })]);
    apiMocks.followUpJobMock.mockResolvedValue(
      job({ id: "run-2", instruction: "Do the thing", status: "queued", parent_job_id: "run-root" }),
    );
    renderThread("/runs/run-root");

    await user.click(await screen.findByRole("button", { name: /Retry run/i }));
    await waitFor(() => expect(apiMocks.followUpJobMock).toHaveBeenCalledWith("run-root"));
  });

  it("a completed tip offers 'Run again'", async () => {
    mockThread([job({ id: "run-root", instruction: "Ship it", status: "completed" })]);
    renderThread("/runs/run-root");
    expect(await screen.findByRole("button", { name: /Run again/i })).toBeInTheDocument();
  });

  it("treats a blocked tip as terminal and offers Retry run", async () => {
    mockThread([job({ id: "run-root", instruction: "Start it", status: "blocked" })]);
    renderThread("/runs/run-root");
    expect(await screen.findByText("Run could not start")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry run/i })).toBeInTheDocument();
    expect(apiMocks.getJobMock).not.toHaveBeenCalled();
  });
});

describe("cancel run", () => {
  it("offers Cancel run while a run is in flight and applies the response status immediately", async () => {
    mockThread([job({ id: "run-root", instruction: "Do the thing", status: "running" })]);
    // Hold the background poll open so its (stale) response can't race the
    // mutation-applied status before the assertions below run — same technique
    // as the "still lets polling replace..." test above.
    let resolvePoll!: (value: JobRecord) => void;
    apiMocks.getJobMock.mockReturnValue(new Promise((resolve) => { resolvePoll = resolve; }));
    apiMocks.cancelJobMock.mockResolvedValue(job({ id: "run-root", instruction: "Do the thing", status: "cancelled" }));
    renderThread("/runs/run-root");

    const cancelButton = await screen.findByRole("button", { name: "Cancel run" });
    await userEvent.click(cancelButton);

    await waitFor(() => expect(apiMocks.cancelJobMock).toHaveBeenCalledWith("run-root"));
    expect(await screen.findByText("This run was cancelled before it finished.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel run" })).not.toBeInTheDocument();
    // A cancelled tip is retry-eligible, same as failed.
    expect(screen.getByRole("button", { name: /Retry run/i })).toBeInTheDocument();
    resolvePoll(job({ id: "run-root", instruction: "Do the thing", status: "cancelled" }));
  });

  it("keeps Cancel run available with an error when the mutation fails", async () => {
    mockThread([job({ id: "run-root", instruction: "Do the thing", status: "queued" })]);
    apiMocks.cancelJobMock.mockRejectedValue(new apiMocks.MockApiError(409, "job is already 'completed'"));
    renderThread("/runs/run-root");

    await userEvent.click(await screen.findByRole("button", { name: "Cancel run" }));
    expect(await screen.findByText("job is already 'completed'")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel run" })).toBeEnabled();
  });

  it("does not offer Cancel run once a run has reached a terminal state", async () => {
    mockThread([job({ id: "run-root", instruction: "Ship it", status: "completed" })]);
    renderThread("/runs/run-root");
    await screen.findByText("Run complete");
    expect(screen.queryByRole("button", { name: "Cancel run" })).not.toBeInTheDocument();
    expect(apiMocks.cancelJobMock).not.toHaveBeenCalled();
  });

  it("disables Approve run while Cancel is in flight, and Cancel while Approve is in flight (beta mode)", async () => {
    publicBetaModeMock.mockReturnValue(true);
    mockThread([job({ id: "run-root", instruction: "Review it", status: "awaiting_approval" })]);
    apiMocks.proposalsMock.mockResolvedValue({ object: "list", data: [] });
    let resolveCancel!: (value: JobRecord) => void;
    apiMocks.cancelJobMock.mockReturnValue(new Promise((resolve) => { resolveCancel = resolve; }));
    renderThread("/runs/run-root");

    const cancelButton = await screen.findByRole("button", { name: "Cancel run" });
    const approveButton = await screen.findByRole("button", { name: "Approve run" });
    expect(approveButton).toBeEnabled();

    await userEvent.click(cancelButton);
    // Cancelling is in flight: approving the same run must not be possible.
    expect(approveButton).toBeDisabled();
    resolveCancel(job({ id: "run-root", instruction: "Review it", status: "cancelled" }));
    await screen.findByText("This run was cancelled before it finished.");
  });

  it("disables Cancel run while Approve is in flight (beta mode)", async () => {
    publicBetaModeMock.mockReturnValue(true);
    mockThread([job({ id: "run-root", instruction: "Review it", status: "awaiting_approval" })]);
    apiMocks.proposalsMock.mockResolvedValue({ object: "list", data: [] });
    let resolveApprove!: (value: JobRecord) => void;
    apiMocks.approveRunMock.mockReturnValue(new Promise((resolve) => { resolveApprove = resolve; }));
    renderThread("/runs/run-root");

    const cancelButton = await screen.findByRole("button", { name: "Cancel run" });
    const approveButton = await screen.findByRole("button", { name: "Approve run" });

    await userEvent.click(approveButton);
    // Approving is in flight: cancelling the same run must not be possible.
    expect(cancelButton).toBeDisabled();
    resolveApprove(job({ id: "run-root", instruction: "Review it", status: "approved" }));
    await screen.findByText("Run approved");
  });

  it("treats a cancelled run as terminal (not active) in the collapsed run panel", async () => {
    mockThread([job({ id: "run-root", instruction: "Do it", status: "cancelled" })]);
    const { container } = renderThread("/runs/run-root");
    await screen.findByText("This run was cancelled before it finished.");
    await userEvent.click(screen.getByRole("button", { name: "Collapse run panel" }));
    // The animated "active" ping is only rendered for a genuinely in-flight
    // run; a cancelled run must not still look like it's executing.
    expect(container.querySelector(".animate-ping")).not.toBeInTheDocument();
  });

  it("disables Approve & publish / Reject while Cancel is in flight (non-beta ApprovalBlock)", async () => {
    publicBetaModeMock.mockReturnValue(false);
    mockThread([job({ id: "run-root", instruction: "Review it", status: "awaiting_approval" })]);
    apiMocks.getJobDiffMock.mockResolvedValue({ patch: "diff", files_changed: ["a.ts"] });
    let resolveCancel!: (value: JobRecord) => void;
    apiMocks.cancelJobMock.mockReturnValue(new Promise((resolve) => { resolveCancel = resolve; }));
    renderThread("/runs/run-root");

    const cancelButton = await screen.findByRole("button", { name: "Cancel run" });
    const approveButton = await screen.findByRole("button", { name: "Approve & publish" });
    const rejectButton = screen.getByRole("button", { name: "Reject" });
    expect(approveButton).toBeEnabled();
    expect(rejectButton).toBeEnabled();

    await userEvent.click(cancelButton);
    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
    resolveCancel(job({ id: "run-root", instruction: "Review it", status: "cancelled" }));
    await screen.findByText("This run was cancelled before it finished.");
  });
});

describe("public beta intelligence review", () => {
  it("submits selected edits and exclusions through approval separately from publishing", async () => {
    publicBetaModeMock.mockReturnValue(true);
    mockThread([job({ id: "run-root", instruction: "Review it", status: "awaiting_approval" })]);
    apiMocks.proposalsMock.mockResolvedValue({ object: "list", data: [{ id: "p1", content: "Original", kind: "accepted_change" }, { id: "p2", content: "Exclude", kind: "testing_constraint" }] });
    apiMocks.approveRunMock.mockResolvedValue({ id: "run-root", status: "approved" });
    const user = userEvent.setup(); renderThread("/runs/run-root");
    const edit = await screen.findByRole("textbox", { name: "Edit proposal p1" });
    await user.clear(edit); await user.type(edit, "Edited authoritative insight");
    await user.click(screen.getByRole("checkbox", { name: "Select proposal p2" }));
    await user.click(screen.getByRole("button", { name: "Approve run" }));
    await waitFor(() => expect(apiMocks.approveRunMock).toHaveBeenCalledWith("run-root", [{ proposal_id: "p1", selected: true, content: "Edited authoritative insight" }, { proposal_id: "p2", selected: false }]));
    expect(apiMocks.publishRunMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Approve & publish")).not.toBeInTheDocument();
  });

  it("disables approval after proposal loading fails and retries without approving an empty list", async () => {
    publicBetaModeMock.mockReturnValue(true);
    mockThread([job({ id: "run-root", instruction: "Review it", status: "awaiting_approval" })]);
    apiMocks.proposalsMock.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce({ object: "list", data: [{ id: "p1", content: "Recovered", kind: "constraint" }] });
    renderThread("/runs/run-root");
    expect(await screen.findByText("Proposed intelligence could not be loaded.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve run" })).toBeDisabled();
    expect(apiMocks.approveRunMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("textbox", { name: "Edit proposal p1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve run" })).toBeEnabled();
  });

  it("allows zero-intelligence approval only after a successful empty response", async () => {
    publicBetaModeMock.mockReturnValue(true);
    mockThread([job({ id: "run-root", instruction: "Review it", status: "awaiting_approval" })]);
    apiMocks.proposalsMock.mockResolvedValue({ object: "list", data: [] });
    apiMocks.approveRunMock.mockResolvedValue({ id: "run-root", status: "approved" });
    renderThread("/runs/run-root");
    expect(await screen.findByText("No intelligence was proposed. You can still approve the run.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Approve run" }));
    await waitFor(() => expect(apiMocks.approveRunMock).toHaveBeenCalledWith("run-root", []));
  });

  it("applies approval immediately, prevents a stale second approval, and exposes publishing", async () => {
    publicBetaModeMock.mockReturnValue(true);
    mockThread([job({ id: "run-root", instruction: "Review it", status: "awaiting_approval" })]);
    apiMocks.approveRunMock.mockResolvedValue({ id: "run-root", status: "approved" });
    renderThread("/runs/run-root");
    await userEvent.click(await screen.findByRole("button", { name: "Approve run" }));
    expect(await screen.findByText("Run approved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish pull request" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve run" })).not.toBeInTheDocument();
    expect(apiMocks.approveRunMock).toHaveBeenCalledOnce();
  });

  it("keeps approval available with an error when the mutation fails", async () => {
    publicBetaModeMock.mockReturnValue(true);
    mockThread([job({ id: "run-root", instruction: "Review it", status: "awaiting_approval" })]);
    apiMocks.approveRunMock.mockRejectedValue(new apiMocks.MockApiError(503, "Approval unavailable"));
    renderThread("/runs/run-root");
    await userEvent.click(await screen.findByRole("button", { name: "Approve run" }));
    expect(await screen.findByText("Approval unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve run" })).toBeEnabled();
  });

  it("applies a successful publish response immediately", async () => {
    publicBetaModeMock.mockReturnValue(true);
    mockThread([job({ id: "run-root", instruction: "Publish it", status: "approved" })]);
    apiMocks.publishRunMock.mockResolvedValue({ id: "run-root", status: "completed" });
    renderThread("/runs/run-root");
    await userEvent.click(await screen.findByRole("button", { name: "Publish pull request" }));
    expect(await screen.findByText("Run complete")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish pull request" })).not.toBeInTheDocument();
    expect(apiMocks.publishRunMock).toHaveBeenCalledOnce();
  });

  it("still lets polling replace the mutation-updated status with the authoritative record", async () => {
    publicBetaModeMock.mockReturnValue(true);
    mockThread([job({ id: "run-root", instruction: "Reconcile it", status: "awaiting_approval" })]);
    let resolvePoll!: (value: JobRecord) => void;
    apiMocks.getJobMock.mockReturnValue(new Promise((resolve) => { resolvePoll = resolve; }));
    apiMocks.approveRunMock.mockResolvedValue({ id: "run-root", status: "approved" });
    renderThread("/runs/run-root");
    await userEvent.click(await screen.findByRole("button", { name: "Approve run" }));
    expect(await screen.findByText("Run approved")).toBeInTheDocument();
    resolvePoll(job({ id: "run-root", instruction: "Reconcile it", status: "completed", branch: "authoritative" }));
    expect(await screen.findByText("Run complete")).toBeInTheDocument();
  });
});

describe("canonical run receipt", () => {
  it("keeps selected and executor-attested delivery distinct without semantic-use claims", async () => {
    mockThread([job({ id: "run-root", instruction: "Cross-model task", status: "completed" })]);
    apiMocks.getRunReceiptMock.mockResolvedValue({ object: "receipt", run_id: "run-root", execution_run_id: "exec", task: "Task", repository: "owner/repo", status: "completed", execution_started: true, model: "model-b", approval: null, pull_request: null, files_changed: [], tokens: { input: 0, output: 0, cached: 0, reasoning: 0 }, tests: "not_run", cost: null, failure_category: null, failure_message: null, intelligence: { supplied: [{ memory_id: "memory-1", kind: "testing_constraint", content: "Keep contract tests", selected: true, delivered: false, source_run_id: "run-a", source_model: "model-a", source_advisor_model: null, approval_id: 2, approved_by: "reviewer", approved_at: "2026-01-01T00:00:00Z", destination_run_id: "run-root", destination_model: "model-b" }], proposed: [], approved: [] } });
    renderThread("/runs/run-root");
    expect(await screen.findByText("Selected by GNSIS")).toBeInTheDocument();
    expect(screen.getByText("Delivery not attested")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View source run" })).toHaveAttribute("href", "/runs/run-a");
    expect(screen.queryByText(/semantic use|used/i)).not.toBeInTheDocument();
  });

  it("uses the immutable ID from the route rather than a linked job record ID", async () => {
    const linkedJob = job({ id: "legacy-job-id", instruction: "Task" });
    apiMocks.getJobThreadMock.mockResolvedValue([linkedJob]);
    apiMocks.getJobLogsMock.mockResolvedValue([]);
    apiMocks.getJobDiffMock.mockResolvedValue({ patch: "", files_changed: [] });

    renderThread("/runs/immutable-route-id");

    await waitFor(() => expect(apiMocks.getRunReceiptMock).toHaveBeenCalledWith("immutable-route-id"));
    expect(apiMocks.getRunReceiptMock).not.toHaveBeenCalledWith("legacy-job-id");
  });

  it("requests the selected run receipt and renders known terminal zero values", async () => {
    mockThread([job({ id: "run-root", instruction: "Legacy task", usage: { total_tokens: 999 } })]);
    apiMocks.getRunReceiptMock.mockResolvedValue({
      object: "receipt", run_id: "run-root", execution_run_id: "exec-zero", task: "Canonical blocked task", repository: "canonical/repo",
      status: "blocked", execution_started: false, model: "canonical/model", approval: null,
      pull_request: null, files_changed: [], tokens: { input: 0, output: 0, cached: 0, reasoning: 0 },
      tests: "not_run", cost: { provider_cost: "0", currency: "USD" },
      failure_category: "blocked_preflight", failure_message: "Canonical failure message",
    });

    renderThread("/runs/run-root");

    expect(await screen.findByText("Canonical blocked task")).toBeInTheDocument();
    expect(apiMocks.getRunReceiptMock).toHaveBeenCalledWith("run-root");
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByText("Not run")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("999")).not.toBeInTheDocument();
    expect(screen.queryByText("Not tracked yet")).not.toBeInTheDocument();
  });

  it("shows receipt loading and request-failure states without crashing", async () => {
    mockThread([job({ id: "run-root", instruction: "Task" })]);
    let rejectReceipt!: (error: Error) => void;
    apiMocks.getRunReceiptMock.mockReturnValue(new Promise((_resolve, reject) => { rejectReceipt = reject; }));
    renderThread("/runs/run-root");

    expect(await screen.findByText("Loading receipt")).toBeInTheDocument();
    rejectReceipt(new Error("network down"));
    expect(await screen.findByText("Receipt request failed")).toBeInTheDocument();
  });

  it("keeps linked-run receipts separate when a different run is selected", async () => {
    const runs = [
      job({ id: "run-root", instruction: "First" }),
      job({ id: "run-2", instruction: "Second", parent_job_id: "run-root" }),
    ];
    mockThread(runs);
    apiMocks.getRunReceiptMock.mockImplementation(async (id: string) => ({
      object: "receipt", run_id: id, execution_run_id: `exec-${id}`, task: id === "run-root" ? "First receipt" : "Second receipt",
      repository: "owner/repo", status: "completed", execution_started: true, model: "model",
      approval: null, pull_request: null, files_changed: [], tokens: null, tests: null, cost: null,
      failure_category: null, failure_message: null,
    }));

    const first = renderThread("/runs/run-root");
    expect(await screen.findByText("First receipt")).toBeInTheDocument();
    first.unmount();
    renderThread("/runs/run-2");
    expect(await screen.findByText("Second receipt")).toBeInTheDocument();
    expect(apiMocks.getRunReceiptMock).toHaveBeenCalledWith("run-root");
    expect(apiMocks.getRunReceiptMock).toHaveBeenCalledWith("run-2");
  });
});

// -- follow-up composer -------------------------------------------------------

describe("follow-up composer", () => {
  it("is disabled until there is text, then submits to the conversation tip", async () => {
    const user = userEvent.setup();
    mockThread([
      job({ id: "run-root", instruction: "Add a login form", status: "completed" }),
      job({ id: "run-2", instruction: "Add logout", status: "completed", parent_job_id: "run-root" }),
    ]);
    apiMocks.followUpJobMock.mockResolvedValue(
      job({ id: "run-3", instruction: "Now add password reset", status: "queued", parent_job_id: "run-2" }),
    );
    renderThread("/runs/run-root");

    const send = await screen.findByRole("button", { name: "Send follow-up" });
    expect(send).toBeDisabled();

    const box = screen.getByLabelText("Follow-up message");
    await user.type(box, "Now add password reset");
    expect(send).toBeEnabled();
    await user.click(send);

    // Parent is the tip (run-2), and the new instruction is sent.
    await waitFor(() => expect(apiMocks.followUpJobMock).toHaveBeenCalledWith("run-2", "Now add password reset"));
    // Cleared only on success.
    await waitFor(() => expect((screen.getByLabelText("Follow-up message") as HTMLTextAreaElement).value).toBe(""));
  });

  it("submits on Enter and inserts a newline on Shift+Enter", async () => {
    const user = userEvent.setup();
    mockThread([job({ id: "run-root", instruction: "Root", status: "completed" })]);
    apiMocks.followUpJobMock.mockResolvedValue(
      job({ id: "run-2", instruction: "Second", status: "queued", parent_job_id: "run-root" }),
    );
    renderThread("/runs/run-root");

    const box = (await screen.findByLabelText("Follow-up message")) as HTMLTextAreaElement;
    await user.type(box, "line one{Shift>}{Enter}{/Shift}line two");
    expect(box.value).toBe("line one\nline two");
    expect(apiMocks.followUpJobMock).not.toHaveBeenCalled();

    await user.clear(box);
    await user.type(box, "send me{Enter}");
    await waitFor(() => expect(apiMocks.followUpJobMock).toHaveBeenCalledWith("run-root", "send me"));
  });

  it("preserves the text and shows an inline error when the follow-up fails", async () => {
    const user = userEvent.setup();
    mockThread([job({ id: "run-root", instruction: "Root", status: "completed" })]);
    apiMocks.followUpJobMock.mockRejectedValue(new apiMocks.MockApiError(503, "execution is not configured"));
    renderThread("/runs/run-root");

    const box = (await screen.findByLabelText("Follow-up message")) as HTMLTextAreaElement;
    await user.type(box, "keep me");
    await user.click(screen.getByRole("button", { name: "Send follow-up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("execution is not configured");
    expect(box.value).toBe("keep me"); // preserved, not cleared
  });
});
