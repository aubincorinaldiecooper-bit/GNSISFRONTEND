import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import LandingPage from "@/pages/LandingPage";

function renderLanding(initial = "/welcome") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  // Clean up any analytics surface a test installed.
  delete (window as unknown as { analytics?: unknown }).analytics;
  delete (window as unknown as { gnsis?: unknown }).gnsis;
});

describe("LandingPage", () => {
  it("renders the marketing content: hero, the repository loop, and a sample receipt", () => {
    renderLanding();
    expect(screen.getByRole("heading", { name: /Own the intelligence your coding agents create/i })).toBeInTheDocument();
    expect(screen.getByText(/Repository loop/i)).toBeInTheDocument();
    // The sample receipt section is present and anchor-linkable.
    expect(document.querySelector("#sample-receipt")).not.toBeNull();
    expect(screen.getByLabelText(/Sample run receipt/i)).toBeInTheDocument();
  });

  it("offers Connect GitHub on every surface (nav, hero, final CTA)", () => {
    renderLanding();
    expect(screen.getAllByRole("button", { name: /Connect GitHub/i }).length).toBeGreaterThanOrEqual(3);
  });

  it("routes Connect GitHub to the real /login GitHub entry (not a placeholder)", async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.click(screen.getAllByRole("button", { name: /Connect GitHub/i })[0]);
    expect(screen.getByText("LOGIN PAGE")).toBeInTheDocument();
  });

  it("routes the nav Sign in to /login", async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("LOGIN PAGE")).toBeInTheDocument();
  });

  it("fires the analytics event on the existing window.analytics surface before navigating", async () => {
    const track = vi.fn();
    (window as unknown as { analytics: { track: typeof track } }).analytics = { track };
    const user = userEvent.setup();
    renderLanding();

    await user.click(screen.getAllByRole("button", { name: /Connect GitHub/i })[0]);

    expect(track).toHaveBeenCalledWith(
      "landing_connect_github_clicked",
      expect.objectContaining({ source: expect.stringMatching(/nav|hero|final_cta/) }),
    );
    // Navigation still happened.
    expect(screen.getByText("LOGIN PAGE")).toBeInTheDocument();
  });

  it("also supports the window.gnsis analytics surface", async () => {
    const track = vi.fn();
    (window as unknown as { gnsis: { track: typeof track } }).gnsis = { track };
    const user = userEvent.setup();
    renderLanding();

    await user.click(screen.getAllByRole("button", { name: /Connect GitHub/i })[1]);
    expect(track).toHaveBeenCalledWith("landing_connect_github_clicked", expect.any(Object));
  });

  it("never blocks navigation when no analytics surface exists", async () => {
    const user = userEvent.setup();
    renderLanding();
    // No window.analytics / window.gnsis installed — click must still navigate.
    await user.click(screen.getAllByRole("button", { name: /Connect GitHub/i })[2]);
    expect(screen.getByText("LOGIN PAGE")).toBeInTheDocument();
  });

  it("keeps the 'View a sample receipt' link as an in-page anchor", () => {
    renderLanding();
    const link = screen.getByRole("link", { name: /View a sample receipt/i });
    expect(link).toHaveAttribute("href", "#sample-receipt");
  });

  it("exposes the four-step product loop", () => {
    renderLanding();
    const loop = screen.getByRole("list", { name: /Product loop steps/i });
    expect(within(loop).getAllByRole("listitem")).toHaveLength(4);
  });
});
