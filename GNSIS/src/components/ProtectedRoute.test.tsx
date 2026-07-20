import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

const useSessionMock = vi.fn();
vi.mock("@/lib/session", () => ({ useSession: () => useSessionMock() }));

import ProtectedRoute from "@/components/ProtectedRoute";

function renderWith(status: string) {
  useSessionMock.mockReturnValue({ status });
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<div>APP CONTENT</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("redirects an unauthenticated visitor to /login", () => {
    renderWith("unauthenticated");
    expect(screen.getByText("LOGIN PAGE")).toBeInTheDocument();
    expect(screen.queryByText("APP CONTENT")).toBeNull();
  });

  it("renders the app for an authenticated user", () => {
    renderWith("authenticated");
    expect(screen.getByText("APP CONTENT")).toBeInTheDocument();
  });

  it("shows a loading state while the session resolves", () => {
    renderWith("loading");
    expect(screen.getByText(/Loading your workspace/i)).toBeInTheDocument();
    expect(screen.queryByText("APP CONTENT")).toBeNull();
  });
});
