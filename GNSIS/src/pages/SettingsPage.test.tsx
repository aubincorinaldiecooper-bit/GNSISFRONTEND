import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
const listKeys = vi.fn();
const createKey = vi.fn();
const rotateKey = vi.fn();
const disableKey = vi.fn();
vi.mock("@/lib/api", () => ({
  listRepositories: (...a: unknown[]) => listRepositories(...a),
  listKeys: (...a: unknown[]) => listKeys(...a),
  createKey: (...a: unknown[]) => createKey(...a),
  rotateKey: (...a: unknown[]) => rotateKey(...a),
  disableKey: (...a: unknown[]) => disableKey(...a),
  ApiError: class ApiError extends Error {},
}));

import SettingsPage from "@/pages/SettingsPage";
import { clearAllSecrets } from "@/lib/keySecrets";

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
  clearAllSecrets();
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

  it('shows "No repositories are available." with a Manage GitHub access action when none are accessible', async () => {
    listRepositories.mockResolvedValue([]);
    renderSettings();

    expect(await screen.findByText("No repositories are available.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage GitHub access/i })).toHaveAttribute(
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

    // No enabledOnly — GitHub App access itself is the permission.
    await waitFor(() =>
      expect(listRepositories).toHaveBeenCalledWith({ q: "zzz", limit: 30, offset: 0 }),
    );
  });

  it("lists connected repositories read-only, with no enable/disable toggle", async () => {
    listRepositories.mockResolvedValue([repo({ enabled: true })]);
    renderSettings();

    await screen.findByText("owner/repo");
    // The repo appears; there is no per-row switch to drive.
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Manage GitHub access/i }),
    ).toBeInTheDocument();
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

  it("keeps a failed create draft and mode, then clears only after a successful retry", async () => {
    const user = userEvent.setup();
    createKey.mockRejectedValueOnce(new Error("Key service unavailable"));
    renderSettings();
    const trigger = screen.getByRole("button", { name: "Create key" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Create API key" });
    const name = within(dialog).getByRole("textbox", { name: "Name" });
    await user.type(name, "Production app");
    await user.click(within(dialog).getByRole("button", { name: /Live/i }));
    await user.click(within(dialog).getByRole("button", { name: "Create key" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Key service unavailable");
    expect(name).toHaveValue("Production app");
    expect(within(dialog).getByRole("button", { name: /Live/i })).toHaveAttribute("aria-pressed", "true");
    const key = { id: "created", key_prefix: "gns_live_example", mode: "live", name: "Production app", status: "active", created_at: "2026-01-01T00:00:00Z" };
    createKey.mockResolvedValueOnce({ virtual_key: key, key: "gns_live_fixture_only" });
    listKeys.mockResolvedValueOnce({ items: [key] });
    await user.click(within(dialog).getByRole("button", { name: "Create key" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(createKey).toHaveBeenLastCalledWith({ name: "Production app", mode: "live" });
    expect(screen.queryByText("gns_live_fixture_only")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reveal secret" }));
    expect(screen.getByText("gns_live_fixture_only")).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: /Test/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("guards repeated pending form submissions and restores focus on Escape", async () => {
    const user = userEvent.setup();
    let reject!: (reason: Error) => void;
    createKey.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    renderSettings();
    const trigger = screen.getByRole("button", { name: "Create key" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Create API key" });
    await user.type(within(dialog).getByRole("textbox", { name: "Name" }), "Pending{Enter}");
    const form = dialog.querySelector("form")!;
    expect(form).toHaveAttribute("aria-busy", "true");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(createKey).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error("Try again")));
    expect(form).toHaveAttribute("aria-busy", "false");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("exposes the appearance choice as a pressed shared control", async () => {
    renderSettings();
    const dark = screen.getByRole("button", { name: "Dark" });
    await userEvent.click(dark);
    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "false");
  });
});
