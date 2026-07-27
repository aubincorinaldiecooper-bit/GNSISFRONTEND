import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), repos: vi.fn() }));
vi.mock("@/lib/api", () => ({
  listRepositories: (...args: unknown[]) => mocks.repos(...args),
  listRepositoryIntelligence: (...args: unknown[]) => mocks.list(...args),
}));
import IntelligencePage from "./IntelligencePage";

describe("IntelligencePage", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.repos.mockResolvedValue([{ id: "repo", full_name: "acme/repo" }]); });
  it("shows loading then the empty state", async () => {
    let resolve!: (value: unknown) => void; mocks.list.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<IntelligencePage />); await screen.findByRole("option", { name: "acme/repo" }); expect(await screen.findByText(/Loading intelligence/)).toBeInTheDocument();
    resolve({ data: [] }); expect(await screen.findByText("No approved intelligence yet.")).toBeInTheDocument();
  });
  it("renders only authoritative populated provenance", async () => {
    mocks.list.mockResolvedValue({ data: [{ id: "i", repository_id: "repo", content: "Keep issuer checks", type: "accepted_change", status: "active", source_run_id: "run-a", source_model: "model-a", source_advisor_model: null, approval_id: 3, approved_by: "reviewer", approved_at: "2026-01-01T00:00:00Z", created_at: null }] });
    render(<IntelligencePage />); expect(await screen.findByText("Keep issuer checks")).toBeInTheDocument();
    expect(screen.getByText(/Source model: model-a/)).toBeInTheDocument(); expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Source run" })).toHaveAttribute("href", "/runs/run-a");
  });
  it("shows an error and retries", async () => {
    mocks.list.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce({ data: [] });
    render(<IntelligencePage />); expect(await screen.findByText("Intelligence could not be loaded.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Retry/ })); expect(await screen.findByText("No approved intelligence yet.")).toBeInTheDocument(); expect(mocks.list).toHaveBeenCalledTimes(2);
  });
});
