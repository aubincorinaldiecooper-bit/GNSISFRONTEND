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
    getJobThreadMock: vi.fn(),
    followUpJobMock: vi.fn(),
    approveJobMock: vi.fn(),
    rejectJobMock: vi.fn(),
    listJobsMock: vi.fn(),
  };
});

vi.mock("@/lib/api", () => ({
  ApiError: apiMocks.MockApiError,
  approveJob: (...a: unknown[]) => apiMocks.approveJobMock(...a),
  rejectJob: (...a: unknown[]) => apiMocks.rejectJobMock(...a),
  createJob: vi.fn(),
  getBalances: vi.fn(async () => ({ workspace_id: "workspace-1", available: "10", reserved: "0", balance: "10" })),
  getJob: (...a: unknown[]) => apiMocks.getJobMock(...a),
  getJobDiff: (...a: unknown[]) => apiMocks.getJobDiffMock(...a),
  getJobLogs: (...a: unknown[]) => apiMocks.getJobLogsMock(...a),
  getJobThread: (...a: unknown[]) => apiMocks.getJobThreadMock(...a),
  followUpJob: (...a: unknown[]) => apiMocks.followUpJobMock(...a),
  health: vi.fn(),
  isApiConfigured: () => true,
  isTerminalStatus: (s: string) => ["completed", "rejected", "failed", "blocked"].includes(s),
  listEngines: vi.fn(async () => [{ id: "gnsis", label: "GNSIS" }]),
  listJobs: (...a: unknown[]) => apiMocks.listJobsMock(...a),
  listRepositories: vi.fn(async () => []),
  listBranches: vi.fn(async () => ({ default_branch: "main", branches: [] })),
  listModels: vi.fn(async () => ({ items: [] })),
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
  apiMocks.listJobsMock.mockResolvedValue([]);
  apiMocks.getJobLogsMock.mockResolvedValue([]);
  apiMocks.getJobDiffMock.mockResolvedValue({ patch: "", files_changed: [] });
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

  it("renders a blocked run distinctly from a runtime failure and offers Retry", async () => {
    // A run stopped in preflight is NOT an ordinary failure: nothing executed,
    // so it must not be framed as one, and it stays retryable once the
    // prerequisite is fixed.
    mockThread([
      job({
        id: "run-root",
        instruction: "Do the thing",
        status: "blocked",
        error: "GNSIS couldn't start this run because CLIPIT does not have an initial commit yet.\n\nTechnical details: GitHub GET .../git/ref/heads/main -> 409",
      }),
    ]);
    renderThread("/runs/run-root");

    expect(await screen.findByText("Run couldn't start")).toBeInTheDocument();
    expect(screen.queryByText("Run failed")).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/does not have an initial commit yet/).length,
    ).toBeGreaterThan(0);
    // The raw provider response stays behind the technical-details toggle.
    expect(screen.queryByText(/409/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry run/i })).toBeInTheDocument();
  });

  it("a completed tip offers 'Run again'", async () => {
    mockThread([job({ id: "run-root", instruction: "Ship it", status: "completed" })]);
    renderThread("/runs/run-root");
    expect(await screen.findByRole("button", { name: /Run again/i })).toBeInTheDocument();
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
