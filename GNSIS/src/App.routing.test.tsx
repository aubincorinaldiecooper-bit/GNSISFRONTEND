import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";

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
vi.mock("@/lib/useVirtualKeys", () => ({ useVirtualKeys: () => ({ keys: [], loading: false, error: null, createKey: vi.fn(), rotateKey: vi.fn(), disableKey: vi.fn() }) }));
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
    listJobsMock: vi.fn(),
    getJobMock: vi.fn(),
    getJobLogsMock: vi.fn(),
    getJobDiffMock: vi.fn(),
    claimGitHubInstallationMock: vi.fn(),
    listRepositoriesMock: vi.fn(),
    setRepositoryEnabledMock: vi.fn(),
    listBranchesMock: vi.fn(),
    listModelsMock: vi.fn(),
  };
});

vi.mock("@/lib/api", () => ({
  ApiError: apiMocks.MockApiError,
  approveJob: vi.fn(),
  claimGitHubInstallation: (...args: unknown[]) => apiMocks.claimGitHubInstallationMock(...args),
  createJob: vi.fn(),
  getBalances: vi.fn(async () => ({ workspace_id: "workspace-1", available: "10", reserved: "0", balance: "10" })),
  getJob: (...args: unknown[]) => apiMocks.getJobMock(...args),
  getJobDiff: (...args: unknown[]) => apiMocks.getJobDiffMock(...args),
  getJobLogs: (...args: unknown[]) => apiMocks.getJobLogsMock(...args),
  health: vi.fn(),
  isApiConfigured: () => true,
  isTerminalStatus: (status: string) => ["completed", "rejected", "failed"].includes(status),
  listEngines: vi.fn(async () => [{ id: "gnsis", label: "GNSIS" }]),
  listJobs: (...args: unknown[]) => apiMocks.listJobsMock(...args),
  listRepositories: (...args: unknown[]) => apiMocks.listRepositoriesMock(...args),
  setRepositoryEnabled: (...args: unknown[]) => apiMocks.setRepositoryEnabledMock(...args),
  listBranches: (...args: unknown[]) => apiMocks.listBranchesMock(...args),
  listModels: (...args: unknown[]) => apiMocks.listModelsMock(...args),
  listUsageEvents: vi.fn(async () => []),
  matchesGatewayRequest: vi.fn(() => false),
  rejectJob: vi.fn(),
}));

import App from "@/App";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import type { JobRecord } from "@/lib/api";

const jobs: JobRecord[] = [
  {
    id: "run-1",
    repo: "owner/repo",
    instruction: "Fix dashboard routing",
    base_branch: "main",
    engine: "gnsis",
    model: "anthropic/claude-opus-4.8",
    status: "completed",
    branch: "fix-routing",
    error: null,
    created_at: "2026-07-21T00:00:00.000Z",
    updated_at: "2026-07-21T00:00:00.000Z",
    usage: {},
  },
  {
    id: "run-2",
    repo: "owner/repo",
    instruction: "Directly loaded run",
    base_branch: "main",
    engine: "gnsis",
    model: "anthropic/claude-opus-4.8",
    status: "completed",
    branch: "direct-run",
    error: null,
    created_at: "2026-07-21T00:00:00.000Z",
    updated_at: "2026-07-21T00:00:00.000Z",
    usage: {},
  },
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="pathname">{location.pathname}</div>;
}

function BackButton() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(-1)}>Browser back</button>;
}

function renderWorkspace(initialPath: string, options: { strict?: boolean } = {}) {
  const content = (
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
      <BackButton />
      <LocationProbe />
    </MemoryRouter>
  );

  return render(options.strict ? <StrictMode>{content}</StrictMode> : content);
}

function renderProtected(initialPath: string, status: "authenticated" | "unauthenticated" = "authenticated") {
  useSessionMock.mockReturnValue({ ...sessionValue, status });
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<App />} />
        </Route>
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useSessionMock.mockReturnValue(sessionValue);
  apiMocks.listJobsMock.mockResolvedValue(jobs);
  apiMocks.getJobMock.mockImplementation(async (id: string) => {
    const job = jobs.find((candidate) => candidate.id === id);
    if (!job) throw new apiMocks.MockApiError(404, "not found");
    return job;
  });
  apiMocks.getJobLogsMock.mockResolvedValue([]);
  apiMocks.getJobDiffMock.mockResolvedValue({ patch: "", files_changed: [] });
  apiMocks.claimGitHubInstallationMock.mockResolvedValue(undefined);
  apiMocks.listRepositoriesMock.mockResolvedValue([
    {
      id: "repo-1",
      github_repository_id: 123,
      owner: "owner",
      name: "repo",
      full_name: "owner/repo",
      default_branch: "main",
      private: true,
      enabled: true,
      archived: false,
    },
  ]);
  apiMocks.setRepositoryEnabledMock.mockImplementation(async (id: string, enabled: boolean) => ({
    id, enabled, github_repository_id: 123, owner: "owner", name: "repo",
    full_name: "owner/repo", default_branch: "main", private: true, archived: false,
  }));
  apiMocks.listBranchesMock.mockResolvedValue({
    default_branch: "main",
    branches: [{ name: "main", is_default: true }],
  });
  apiMocks.listModelsMock.mockResolvedValue({
    items: [{ id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", provider: "anthropic", default: true }],
  });
});

describe("workspace routing", () => {
  it("renders Settings from /settings after initial load", async () => {
    renderWorkspace("/settings");

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders Dashboard from /dashboard after initial load", async () => {
    renderWorkspace("/dashboard");

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders Runs from /runs", async () => {
    renderWorkspace("/runs");

    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
  });

  it("continues to render the Integration Test route", async () => {
    renderWorkspace("/integration-test");

    expect(await screen.findByRole("heading", { name: "Integration test" })).toBeInTheDocument();
  });

  it("selecting Settings updates the pathname to /settings", async () => {
    const user = userEvent.setup();
    renderWorkspace("/");

    await user.click(screen.getAllByText("Test User")[0]);
    const settingsItems = await screen.findAllByRole("menuitem", { name: /Settings/i });
    await user.click(settingsItems[0]);

    expect(screen.getByTestId("pathname")).toHaveTextContent("/settings");
  });

  it("selecting Dashboard updates the pathname to /dashboard", async () => {
    const user = userEvent.setup();
    renderWorkspace("/");

    await user.click(screen.getAllByRole("button", { name: "Dashboard" })[0]);

    expect(screen.getByTestId("pathname")).toHaveTextContent("/dashboard");
  });

  it("selecting a run updates the pathname to /runs/:runId", async () => {
    const user = userEvent.setup();
    renderWorkspace("/runs");

    await user.click((await screen.findAllByRole("button", { name: /Fix dashboard routing/i }))[0]);

    expect(screen.getByTestId("pathname")).toHaveTextContent("/runs/run-1");
  });

  it("directly loading /runs/:runId fetches and renders the requested run", async () => {
    apiMocks.listJobsMock.mockResolvedValueOnce([]);
    renderWorkspace("/runs/run-2");

    expect((await screen.findAllByText("Directly loaded run")).length).toBeGreaterThan(0);
    expect(apiMocks.getJobMock).toHaveBeenCalledWith("run-2");
  });

  it("browser back navigation restores the prior screen", async () => {
    const user = userEvent.setup();
    renderWorkspace("/");

    await user.click(screen.getAllByRole("button", { name: "Dashboard" })[0]);
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Runs" })[0]);
    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Browser back" }));

    await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/dashboard"));
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders an explicit not-found state for an unknown run ID", async () => {
    renderWorkspace("/runs/unknown-run");

    expect(await screen.findByText("Run not found")).toBeInTheDocument();
    expect(screen.getByText(/unknown-run was not found or is not accessible/i)).toBeInTheDocument();
  });

  it("authenticated refresh preserves the canonical route instead of redirecting to /", async () => {
    renderProtected("/settings", "authenticated");

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/settings");
  });


  it("submits exactly one numeric GitHub installation claim under StrictMode", async () => {
    renderWorkspace("/onboarding/github?installation_id=12345&setup_action=install", { strict: true });

    // The claim resolves quickly against mocks and moves straight into the
    // repository-selection step, so the transient "Connecting…" text isn't a
    // reliable thing to assert on here. What this test actually guards is
    // StrictMode's double-invoke of effects not producing a duplicate claim.
    expect(await screen.findByRole("heading", { name: "Choose repositories for GNSIS" })).toBeInTheDocument();
    expect(apiMocks.claimGitHubInstallationMock).toHaveBeenCalledTimes(1);
    expect(apiMocks.claimGitHubInstallationMock).toHaveBeenCalledWith(12345);
  });

  it("shows repository selection after a successful claim, then continues to Settings", async () => {
    const user = userEvent.setup();
    renderWorkspace("/onboarding/github?installation_id=67890&setup_action=install");

    // Connection is already successful here — the repo-selection step is a
    // deliberate next step, not a gate on success.
    expect(await screen.findByRole("heading", { name: "Choose repositories for GNSIS" })).toBeInTheDocument();
    expect(sessionValue.refreshMe).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("owner/repo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/settings"));
    expect(await screen.findByText(/GitHub repositories connected successfully/i)).toBeInTheDocument();
  });

  it("shows an invalid callback screen when installation_id is missing", async () => {
    renderWorkspace("/onboarding/github?setup_action=install");

    expect(await screen.findByRole("heading", { name: "Invalid GitHub callback" })).toBeInTheDocument();
    expect(apiMocks.claimGitHubInstallationMock).not.toHaveBeenCalled();
  });

  it("shows backend errors and retries the GitHub installation claim", async () => {
    const user = userEvent.setup();
    apiMocks.claimGitHubInstallationMock
      .mockRejectedValueOnce(new apiMocks.MockApiError(400, "installation already claimed"))
      .mockResolvedValueOnce(undefined);

    renderWorkspace("/onboarding/github?installation_id=13579&setup_action=install");

    expect(await screen.findByText("installation already claimed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(apiMocks.claimGitHubInstallationMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("heading", { name: "Choose repositories for GNSIS" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Continue/i }));
    await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/settings"));
  });

  it("unauthenticated access still redirects through ProtectedRoute", async () => {
    renderProtected("/settings", "unauthenticated");

    await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/login"));
    expect(screen.getByRole("heading", { name: "GNSIS" })).toBeInTheDocument();
    expect(screen.getByText(/Sign in to your Genesis workspace/i)).toBeInTheDocument();
  });
});
