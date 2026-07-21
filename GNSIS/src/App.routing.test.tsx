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
  };
});

vi.mock("@/lib/api", () => ({
  ApiError: apiMocks.MockApiError,
  approveJob: vi.fn(),
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
  listRepositories: vi.fn(async () => []),
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

function renderWorkspace(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
      <BackButton />
      <LocationProbe />
    </MemoryRouter>,
  );
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

  it("unauthenticated access still redirects through ProtectedRoute", async () => {
    renderProtected("/settings", "unauthenticated");

    await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/login"));
    expect(screen.getByRole("heading", { name: "GNSIS" })).toBeInTheDocument();
    expect(screen.getByText(/Sign in to your Genesis workspace/i)).toBeInTheDocument();
  });
});
