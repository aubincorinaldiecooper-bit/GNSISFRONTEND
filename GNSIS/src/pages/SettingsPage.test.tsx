import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const sessionValue = {
  status: "authenticated" as const,
  authConfigured: true,
  authUser: { id: "user-1", email: "test@example.com", name: "Test User", image: null, githubLogin: "test" },
  me: {
    user: { id: "user-1", email: "test@example.com", name: "Test User", avatar_url: null },
    workspace: { id: "workspace-super-secret-id-123", name: "Test workspace" },
    github: { connected: true, installation_count: 1, repository_count: 1 },
  },
  backendState: "ok" as const,
  signInGitHub: vi.fn(),
  signOut: vi.fn(),
  refreshMe: vi.fn(),
};
vi.mock("@/lib/session", () => ({ useSession: () => sessionValue }));

vi.mock("@/lib/env", () => ({
  githubAppSlug: () => "gnsis-test-app",
  isApiConfigured: () => true,
}));

const listRepositories = vi.fn();
const setRepositoryEnabled = vi.fn();
const listKeys = vi.fn();
const createKey = vi.fn();
const rotateKey = vi.fn();
const disableKey = vi.fn();
vi.mock("@/lib/api", () => ({
  listRepositories: (...a: unknown[]) => listRepositories(...a),
  setRepositoryEnabled: (...a: unknown[]) => setRepositoryEnabled(...a),
  listKeys: (...a: unknown[]) => listKeys(...a),
  createKey: (...a: unknown[]) => createKey(...a),
  rotateKey: (...a: unknown[]) => rotateKey(...a),
  disableKey: (...a: unknown[]) => disableKey(...a),
  ApiError: class ApiError extends Error {},
}));

import SettingsPage from "@/pages/SettingsPage";

function repo(overrides: Record<string, unknown> = {}) {
  return {
    id: "repo-1",
    github_repository_id: 1,
    owner: "owner",
    name: "repo",
    full_name: "owner/repo",
    default_branch: "main",
    private: true,
    enabled: false,
    archived: false,
    ...overrides,
  };
}

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={["/settings"]}>
      <SettingsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listRepositories.mockResolvedValue([]);
  listKeys.mockResolvedValue({ items: [] });
});

describe("SettingsPage", () => {
  it('titles the repository section "Connected repositories"', async () => {
    renderSettings();
    expect(await screen.findByRole("heading", { name: "Connected repositories" })).toBeInTheDocument();
  });

  it("never renders the raw workspace ID", async () => {
    renderSettings();
    await screen.findByRole("heading", { name: "Connected repositories" });
    expect(screen.queryByText("workspace-super-secret-id-123")).not.toBeInTheDocument();
  });

  it("shows an empty state with an install link when no repositories are connected", async () => {
    listRepositories.mockResolvedValue([]);
    renderSettings();

    expect(await screen.findByText("No repositories connected yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Install the GNSIS GitHub App/i })).toHaveAttribute(
      "href",
      "https://github.com/apps/gnsis-test-app/installations/new",
    );
  });

  it("searches repositories server-side as the user types", async () => {
    const user = userEvent.setup();
    listRepositories.mockResolvedValue([repo()]);
    renderSettings();
    await screen.findByText("owner/repo");
    listRepositories.mockClear();
    listRepositories.mockResolvedValue([]);

    await user.type(screen.getByLabelText("Search repositories"), "zzz");

    await waitFor(() =>
      expect(listRepositories).toHaveBeenCalledWith({ enabledOnly: false, q: "zzz", limit: 30, offset: 0 }),
    );
  });

  it("toggling a repository calls setRepositoryEnabled and flips the switch", async () => {
    const user = userEvent.setup();
    listRepositories.mockResolvedValue([repo({ enabled: false })]);
    setRepositoryEnabled.mockResolvedValue(repo({ enabled: true }));
    renderSettings();

    const toggle = await screen.findByRole("switch", { name: "Enable owner/repo" });
    expect(toggle).not.toBeChecked();

    await user.click(toggle);

    await waitFor(() => expect(setRepositoryEnabled).toHaveBeenCalledWith("repo-1", true));
    expect(await screen.findByRole("switch", { name: "Disable owner/repo" })).toBeChecked();
  });

  it("shows only the active keys the backend returns, with no key-history control", async () => {
    listKeys.mockResolvedValue({
      items: [{ id: "vk1", key_prefix: "gns_live_abcd", mode: "live", name: "Production", status: "active", created_at: "2026-01-01T00:00:00Z" }],
    });
    renderSettings();

    expect(await screen.findByText("Production")).toBeInTheDocument();
    expect(screen.queryByText(/rotated/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/disabled/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /history/i })).not.toBeInTheDocument();
  });

  it("a disabled key disappears from the list once the backend excludes it", async () => {
    const user = userEvent.setup();
    listKeys.mockResolvedValueOnce({
      items: [{ id: "vk1", key_prefix: "gns_live_abcd", mode: "live", name: "Production", status: "active", created_at: "2026-01-01T00:00:00Z" }],
    });
    disableKey.mockResolvedValue({ id: "vk1", status: "disabled" });
    renderSettings();

    await screen.findByText("Production");
    listKeys.mockResolvedValueOnce({ items: [] });

    await user.click(screen.getByRole("button", { name: "Disable" }));

    await waitFor(() => expect(screen.queryByText("Production")).not.toBeInTheDocument());
  });
});
