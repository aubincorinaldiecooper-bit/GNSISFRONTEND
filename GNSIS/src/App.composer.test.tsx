import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const sessionValue = {
  status: "authenticated" as const,
  authConfigured: true,
  authUser: { id: "user-1", email: "test@example.com", name: "Test User", image: null, githubLogin: "test" },
  me: {
    user: { id: "user-1", email: "test@example.com", name: "Test User", avatar_url: null },
    workspace: { id: "workspace-1", name: "Test workspace" },
    github: { connected: true, installation_count: 1, repository_count: 1 },
  },
  backendState: "ok" as const,
  signInGitHub: vi.fn(),
  signOut: vi.fn(),
  refreshMe: vi.fn(),
};
vi.mock("@/lib/session", () => ({ useSession: () => sessionValue }));
vi.mock("@/pages/IntegrationTestPage", () => ({ default: () => <h1>Integration test</h1> }));
vi.mock("@/components/ApiKeysSection", () => ({ default: () => <div>API keys</div> }));
vi.mock("@/lib/useVirtualKeys", () => ({
  useVirtualKeys: () => ({ keys: [], loading: false, error: null, createKey: vi.fn(), rotateKey: vi.fn(), disableKey: vi.fn() }),
}));

vi.mock("@/lib/env", () => ({
  apiBaseUrl: () => "https://api.example.test",
  authBaseUrl: () => "https://auth.example.test",
  githubAppSlug: () => "gnsis-test-app",
  integrationLabEnabled: () => false,
  isApiConfigured: () => true,
  isAuthConfigured: () => true,
  smokeTestModel: () => "gpt-test",
}));

const apiMocks = vi.hoisted(() => ({
  createJobMock: vi.fn(),
  listJobsMock: vi.fn(),
  getJobMock: vi.fn(),
  listRepositoriesMock: vi.fn(),
  listBranchesMock: vi.fn(),
  listModelsMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  approveJob: vi.fn(),
  claimGitHubInstallation: vi.fn(),
  createJob: (...a: unknown[]) => apiMocks.createJobMock(...a),
  getBalances: vi.fn(async () => ({ workspace_id: "workspace-1", available: "10", reserved: "0", balance: "10" })),
  getJob: (...a: unknown[]) => apiMocks.getJobMock(...a),
  getJobDiff: vi.fn(async () => ({ patch: "", files_changed: [] })),
  getJobLogs: vi.fn(async () => []),
  health: vi.fn(),
  isApiConfigured: () => true,
  isTerminalStatus: (status: string) => ["completed", "rejected", "failed"].includes(status),
  listEngines: vi.fn(async () => [{ id: "gnsis", label: "GNSIS" }]),
  listJobs: (...a: unknown[]) => apiMocks.listJobsMock(...a),
  listRepositories: (...a: unknown[]) => apiMocks.listRepositoriesMock(...a),
  listBranches: (...a: unknown[]) => apiMocks.listBranchesMock(...a),
  listModels: (...a: unknown[]) => apiMocks.listModelsMock(...a),
  listUsageEvents: vi.fn(async () => []),
  matchesGatewayRequest: vi.fn(() => false),
  rejectJob: vi.fn(),
}));

import App from "@/App";

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/new-run"]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.listJobsMock.mockResolvedValue([]);
  apiMocks.createJobMock.mockResolvedValue({
    id: "run-99",
    repo: "owner/alpha",
    instruction: "hi",
    base_branch: "main",
    engine: "gnsis",
    model: "anthropic/claude-opus-4.8",
    advisor_model: "anthropic/claude-opus-4.8",
    status: "queued",
    branch: null,
    error: null,
    created_at: "2026-07-23T00:00:00Z",
    updated_at: "2026-07-23T00:00:00Z",
    usage: {},
  });
  apiMocks.getJobMock.mockResolvedValue({
    id: "run-99",
    repo: "owner/alpha",
    instruction: "hi",
    base_branch: "main",
    engine: "gnsis",
    model: "anthropic/claude-opus-4.8",
    advisor_model: "anthropic/claude-opus-4.8",
    status: "queued",
    branch: null,
    error: null,
    created_at: "2026-07-23T00:00:00Z",
    updated_at: "2026-07-23T00:00:00Z",
    usage: {},
  });
  apiMocks.listRepositoriesMock.mockResolvedValue([
    { id: "repo-alpha", github_repository_id: 1, owner: "owner", name: "alpha", full_name: "owner/alpha", default_branch: "main", private: true, enabled: true, archived: false },
    { id: "repo-beta", github_repository_id: 2, owner: "owner", name: "beta", full_name: "owner/beta", default_branch: "develop", private: false, enabled: true, archived: false },
  ]);
  apiMocks.listBranchesMock.mockImplementation(async (repositoryId: string) => {
    if (repositoryId === "repo-alpha") {
      return { default_branch: "main", branches: [
        { name: "main", is_default: true }, { name: "feature-x", is_default: false },
      ] };
    }
    return { default_branch: "develop", branches: [
      { name: "develop", is_default: true }, { name: "release", is_default: false },
    ] };
  });
  apiMocks.listModelsMock.mockResolvedValue({
    items: [
      { id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", provider: "anthropic", default: true },
      { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5", provider: "anthropic", default: false },
    ],
  });
});

describe("NewRunComposer", () => {
  it("requests repositories without any enable-only filter — GitHub access is the permission", async () => {
    renderApp();
    await waitFor(() =>
      expect(apiMocks.listRepositoriesMock).toHaveBeenCalled(),
    );
    // Called with no options (or a bare object that carries no enabledOnly).
    const call = apiMocks.listRepositoriesMock.mock.calls[0];
    const opts = (call && call[0]) ?? {};
    expect((opts as Record<string, unknown>).enabledOnly).toBeUndefined();
    expect((opts as Record<string, unknown>).enabled_only).toBeUndefined();
  });

  it('shows "No repositories are available." with a Manage GitHub access action when nothing is accessible', async () => {
    apiMocks.listRepositoriesMock.mockResolvedValue([]);
    renderApp();

    expect(await screen.findByText("No repositories are available.")).toBeInTheDocument();
    // The instruction is now to manage access through GitHub, never "enable
    // a repository in Settings".
    expect(screen.queryByText(/Enable a repository in Settings/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage GitHub access/i })).toHaveAttribute(
      "href",
      "https://github.com/apps/gnsis-test-app/installations/new",
    );
  });

  it("selects the default branch automatically once the branch list arrives", async () => {
    renderApp();
    const branch = await screen.findByRole("combobox", { name: "Branch" });
    await waitFor(() => expect(branch).toHaveTextContent("main"));
  });

  it("resets the selected branch after switching repositories, then auto-selects the new default", async () => {
    const user = userEvent.setup();
    renderApp();

    const branch = await screen.findByRole("combobox", { name: "Branch" });
    await waitFor(() => expect(branch).toHaveTextContent("main"));

    // Switch to the second repo.
    await user.click(screen.getByRole("combobox", { name: "Repository" }));
    await user.click(screen.getByRole("option", { name: "owner/beta" }));

    // Its default branch (develop) is auto-selected — "main" from the previous
    // repo must never remain.
    await waitFor(() => expect(branch).toHaveTextContent("develop"));
    expect(branch).not.toHaveTextContent("main");
  });

  it("populates the Model picker from the backend catalog and auto-selects the default", async () => {
    renderApp();
    const model = await screen.findByRole("combobox", { name: "Model" });
    await waitFor(() => expect(model).toHaveTextContent("Claude Opus 4.8"));

    const user = userEvent.setup();
    await user.click(model);
    // Both catalog entries appear, with no invented Sonnet-4 / Haiku / etc.
    expect(screen.getByRole("option", { name: /Claude Opus 4.8/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Claude Sonnet 5/ })).toBeInTheDocument();
    // The picker doesn't show "gpt-4" or similar hallucinated models.
    expect(screen.queryByRole("option", { name: /gpt-4/i })).not.toBeInTheDocument();
  });

  it("submits repository_id + selected primary + advisor model to createJob", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByRole("combobox", { name: "Repository" });
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Branch" })).toHaveTextContent("main"));

    // Pick a non-default model to prove the user's choice is submitted, not the
    // server default.
    await user.click(screen.getByRole("combobox", { name: "Model" }));
    await user.click(screen.getByRole("option", { name: /Claude Sonnet 5/ }));

    const promptBox = screen.getByPlaceholderText(/Describe the change/i);
    await user.type(promptBox, "Refactor the router");

    const startButtons = screen.getAllByRole("button", { name: /Start run/i });
    await user.click(startButtons[0]);

    await waitFor(() => expect(apiMocks.createJobMock).toHaveBeenCalledTimes(1));
    // Advisor defaulted to the first allowed model (Claude Opus 4.8) — the
    // primary and Advisor are two distinct fields, both sent verbatim.
    expect(apiMocks.createJobMock).toHaveBeenCalledWith({
      repository_id: "repo-alpha",
      instruction: "Refactor the router",
      base_branch: "main",
      model: "anthropic/claude-sonnet-5",
      advisor_model: "anthropic/claude-opus-4.8",
    });
  });

  it("submits a user-changed Advisor model as a distinct field", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByRole("combobox", { name: "Repository" });
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Advisor" })).toHaveTextContent("Claude Opus 4.8"),
    );

    // Change ONLY the Advisor to prove the two selectors are independent.
    await user.click(screen.getByRole("combobox", { name: "Advisor" }));
    await user.click(screen.getByRole("option", { name: /Claude Sonnet 5/ }));

    await user.type(screen.getByPlaceholderText(/Describe the change/i), "review this");
    await user.click(screen.getAllByRole("button", { name: /Start run/i })[0]);

    await waitFor(() => expect(apiMocks.createJobMock).toHaveBeenCalledTimes(1));
    const call = apiMocks.createJobMock.mock.calls[0][0];
    // Primary stays on the default; Advisor swapped to the picked value.
    expect(call.model).toBe("anthropic/claude-opus-4.8");
    expect(call.advisor_model).toBe("anthropic/claude-sonnet-5");
  });

  it("Advisor selector initializes from the backend catalog, not a hardcoded value", async () => {
    // A backend allowlist WITHOUT the marketing-common opus id proves the
    // Advisor is initialised from the catalogue rather than a hardcoded
    // default the frontend picked itself.
    apiMocks.listModelsMock.mockResolvedValueOnce({
      items: [
        { id: "vendor-x/model-1", label: "Vendor X 1", provider: "vendor-x", default: true },
        { id: "vendor-x/model-2", label: "Vendor X 2", provider: "vendor-x", default: false },
      ],
    });
    renderApp();
    const advisor = await screen.findByRole("combobox", { name: "Advisor" });
    await waitFor(() => expect(advisor).toHaveTextContent("Vendor X 1"));
    expect(advisor).not.toHaveTextContent("Opus");
    expect(advisor).not.toHaveTextContent("Sonnet");
  });

  it('labels the third selector "Model", never "Agent harness" or "Executor"', async () => {
    renderApp();
    await screen.findByRole("combobox", { name: "Model" });
    expect(screen.queryByRole("combobox", { name: /Agent harness/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Executor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Provider/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Claude Agent SDK/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/OpenHands/i)).not.toBeInTheDocument();
  });

  it("the Repository selector doesn't accept free-typed values", async () => {
    const user = userEvent.setup();
    renderApp();

    const trigger = await screen.findByRole("combobox", { name: "Repository" });
    await user.click(trigger);

    // The dropdown search input is separate from the trigger button, and the
    // trigger itself is a <button>, not an <input> — a user cannot type into
    // it to fabricate an id/full_name that the picker will accept.
    expect(trigger.tagName).toBe("BUTTON");

    // A typed query that matches nothing yields "No matching repositories."
    // and offers no option to commit.
    const search = within(screen.getByRole("listbox")).getByRole("textbox");
    await user.type(search, "someone/private-repo-i-typed");

    expect(screen.getByText("No matching repositories.")).toBeInTheDocument();
    await user.keyboard("{Enter}");

    // Nothing submitted — the trigger still shows the auto-selected first repo.
    expect(trigger).toHaveTextContent("owner/alpha");
  });
});
