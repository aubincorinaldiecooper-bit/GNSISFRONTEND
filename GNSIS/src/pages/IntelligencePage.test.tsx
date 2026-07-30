import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), repos: vi.fn() }));
vi.mock("@/lib/api", () => ({
  getAllRepositories: (...args: unknown[]) => mocks.repos(...args),
  getAllRepositoryIntelligence: (...args: unknown[]) => mocks.list(...args),
}));
import IntelligencePage from "./IntelligencePage";

describe("IntelligencePage", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.repos.mockResolvedValue([{ id: "repo", full_name: "acme/repo" }]); });
  it("shows loading then the empty state", async () => {
    let resolve!: (value: unknown) => void; mocks.list.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<IntelligencePage />); await screen.findByRole("option", { name: "acme/repo" }); expect(await screen.findByText(/Loading intelligence/)).toBeInTheDocument();
    resolve([]); expect(await screen.findByText("No approved intelligence yet.")).toBeInTheDocument();
  });
  it("renders only authoritative populated provenance", async () => {
    mocks.list.mockResolvedValue([{ id: "i", repository_id: "repo", content: "Keep issuer checks", type: "accepted_change", status: "active", source_run_id: "run-a", source_model: "model-a", source_advisor_model: null, approval_id: 3, approved_by: "reviewer", approved_at: "2026-01-01T00:00:00Z", created_at: null }]);
    render(<IntelligencePage />); expect(await screen.findByText("Keep issuer checks")).toBeInTheDocument();
    expect(screen.getByText(/Source model: model-a/)).toBeInTheDocument(); expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Source run" })).toHaveAttribute("href", "/runs/run-a");
  });
  it("shows an error and retries", async () => {
    mocks.list.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce([]);
    render(<IntelligencePage />); expect(await screen.findByText("Intelligence could not be loaded.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Retry/ })); expect(await screen.findByText("No approved intelligence yet.")).toBeInTheDocument(); expect(mocks.list).toHaveBeenCalledTimes(2);
  });
  it("retries repository discovery and then loads a valid repository", async () => {
    mocks.repos.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce([{ id: "repo-2", full_name: "acme/second" }]);
    mocks.list.mockResolvedValue([]);
    render(<IntelligencePage />);
    expect(await screen.findByText("Repositories could not be loaded.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(await screen.findByRole("option", { name: "acme/second" })).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith("repo-2");
  });
  it("settles intentionally when repository discovery returns no repositories", async () => {
    mocks.repos.mockResolvedValue([]);
    render(<IntelligencePage />);
    expect(await screen.findByText("No repositories available.")).toBeInTheDocument();
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("hides the prior repository's intelligence while a switched repository loads", async () => {
    mocks.repos.mockResolvedValue([{ id: "one", full_name: "acme/one" }, { id: "two", full_name: "acme/two" }]);
    let resolveSecond!: (value: unknown[]) => void;
    mocks.list.mockResolvedValueOnce([{ id: "old", content: "Only repository one", type: null }]).mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));
    render(<IntelligencePage />);
    expect(await screen.findByText("Only repository one")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Intelligence repository" }), "two");
    expect(screen.queryByText("Only repository one")).not.toBeInTheDocument();
    expect(screen.getByText("Loading intelligence…")).toBeInTheDocument();
    resolveSecond([]);
    expect(await screen.findByText("No approved intelligence yet.")).toBeInTheDocument();
  });
});
