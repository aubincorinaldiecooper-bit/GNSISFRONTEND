import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/session", () => ({ useSession: () => ({ status: "authenticated" }) }));

const getBalances = vi.fn();
const listUsageEvents = vi.fn();
vi.mock("@/lib/api", () => ({
  getBalances: (...a: unknown[]) => getBalances(...a),
  listUsageEvents: (...a: unknown[]) => listUsageEvents(...a),
  ApiError: class ApiError extends Error {
    status = 0;
  },
}));

import BillingPage from "@/pages/BillingPage";

beforeEach(() => {
  vi.clearAllMocks();
  getBalances.mockResolvedValue({
    workspace_id: "ws",
    currency: "USD",
    balance: "10.00",
    available: "8.00",
    reserved: "2.00",
  });
  listUsageEvents.mockResolvedValue({ items: [] });
});

describe("BillingPage (billing dormant)", () => {
  it("shows the truthful billing-not-enabled state with real balances", async () => {
    render(<BillingPage />);
    await waitFor(() =>
      expect(screen.getByText(/Billing is not enabled/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("$8.00")).toBeInTheDocument(); // available balance
    // No fabricated wallet controls.
    expect(screen.queryByText(/Add funds/i)).toBeNull();
    expect(screen.queryByText(/Manage billing/i)).toBeNull();
  });

  it("still affirms that metering is active (not 'untracked')", async () => {
    render(<BillingPage />);
    await waitFor(() => expect(screen.getByText(/Metering is active/i)).toBeInTheDocument());
    expect(screen.queryByText(/untracked/i)).toBeNull();
  });
});
