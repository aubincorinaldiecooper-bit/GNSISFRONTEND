import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";

// The integration-lab flag is what these tests are actually about, so it's
// wired through a mutable ref that each test can flip before calling render.
const integrationLabEnabledRef = { current: false };
vi.mock("@/lib/env", () => ({
  apiBaseUrl: () => "https://api.example.test",
  authBaseUrl: () => "https://auth.example.test",
  githubAppSlug: () => "gnsis-test-app",
  integrationLabEnabled: () => integrationLabEnabledRef.current,
  isApiConfigured: () => true,
  isAuthConfigured: () => true,
  smokeTestModel: () => "gpt-test",
}));

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

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  approveJob: vi.fn(),
  claimGitHubInstallation: vi.fn(),
  createJob: vi.fn(),
  getBalances: vi.fn(async () => ({ workspace_id: "workspace-1", available: "10", reserved: "0", balance: "10" })),
  getJob: vi.fn(),
  getJobDiff: vi.fn(async () => ({ patch: "", files_changed: [] })),
  getJobLogs: vi.fn(async () => []),
  health: vi.fn(),
  isApiConfigured: () => true,
  isTerminalStatus: (status: string) => ["completed", "rejected", "failed"].includes(status),
  listEngines: vi.fn(async () => [{ id: "gnsis", label: "GNSIS" }]),
  listJobs: vi.fn(async () => []),
  listRepositories: vi.fn(async () => []),
  listBranches: vi.fn(async () => ({ default_branch: "main", branches: [{ name: "main", is_default: true }] })),
  listModels: vi.fn(async () => ({ items: [{ id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", provider: "anthropic", default: true }] })),
  listUsageEvents: vi.fn(async () => []),
  matchesGatewayRequest: vi.fn(() => false),
  rejectJob: vi.fn(),
}));

import App from "@/App";

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="pathname">{loc.pathname}</div>;
}

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  integrationLabEnabledRef.current = false;
});

describe("Integration lab flag", () => {
  it("hides the Integration test nav item when the flag is off", async () => {
    integrationLabEnabledRef.current = false;
    renderApp("/");
    // Wait for the app shell to render at all.
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Dashboard" }).length).toBeGreaterThan(0));
    expect(screen.queryAllByRole("button", { name: "Integration test" })).toHaveLength(0);
  });

  it("shows the Integration test nav item when the flag is on", async () => {
    integrationLabEnabledRef.current = true;
    renderApp("/");
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Integration test" }).length).toBeGreaterThan(0),
    );
  });

  it("redirects a direct visit to /integration-test to / when the flag is off", async () => {
    integrationLabEnabledRef.current = false;
    renderApp("/integration-test");

    await waitFor(() => expect(screen.getByTestId("pathname")).toHaveTextContent("/"));
    expect(screen.queryByRole("heading", { name: "Integration test" })).not.toBeInTheDocument();
  });

  it("allows a direct visit to /integration-test when the flag is on", async () => {
    integrationLabEnabledRef.current = true;
    renderApp("/integration-test");

    expect(await screen.findByRole("heading", { name: "Integration test" })).toBeInTheDocument();
  });
});
