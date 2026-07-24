import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Navigate, Route, Routes, useLocation } from "react-router";

import HomePage from "@/pages/HomePage";

// A stand-in /login that echoes the pathname + query so we can assert the
// homepage CTAs arrive with ?next=/new.
function LoginProbe() {
  const loc = useLocation();
  return <div>LOGIN PAGE{loc.pathname}{loc.search}</div>;
}

function renderHome(initial = "/") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/welcome" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  delete (window as unknown as { analytics?: unknown }).analytics;
  delete (window as unknown as { gnsis?: unknown }).gnsis;
});

describe("HomePage", () => {
  it("renders the marketing content at / : hero, the repository loop, and a sample receipt", () => {
    renderHome("/");
    expect(screen.getByRole("heading", { name: /Own the intelligence your coding agents create/i })).toBeInTheDocument();
    expect(screen.getByText(/Repository loop/i)).toBeInTheDocument();
    expect(document.querySelector("#sample-receipt")).not.toBeNull();
    expect(screen.getByLabelText(/Sample run receipt/i)).toBeInTheDocument();
  });

  it("redirects the legacy /welcome path to the / homepage", () => {
    renderHome("/welcome");
    // Ends on the homepage content, not a 404 or the old /welcome page.
    expect(screen.getByRole("heading", { name: /Own the intelligence your coding agents create/i })).toBeInTheDocument();
  });

  it("offers Connect GitHub on every surface (nav, hero, final CTA)", () => {
    renderHome();
    expect(screen.getAllByRole("button", { name: /Connect GitHub/i }).length).toBeGreaterThanOrEqual(3);
  });

  it("routes Connect GitHub through /login and returns the user to /new", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getAllByRole("button", { name: /Connect GitHub/i })[0]);
    // Lands on /login carrying next=/new (URL-encoded).
    expect(screen.getByText(/LOGIN PAGE/)).toHaveTextContent("/login?next=%2Fnew");
  });

  it("routes the nav Sign in to /login?next=/new", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText(/LOGIN PAGE/)).toHaveTextContent("/login?next=%2Fnew");
  });

  it("fires the analytics event on the existing window.analytics surface before navigating", async () => {
    const track = vi.fn();
    (window as unknown as { analytics: { track: typeof track } }).analytics = { track };
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getAllByRole("button", { name: /Connect GitHub/i })[0]);

    expect(track).toHaveBeenCalledWith(
      "landing_connect_github_clicked",
      expect.objectContaining({ source: expect.stringMatching(/nav|hero|final_cta/) }),
    );
    expect(screen.getByText(/LOGIN PAGE/)).toBeInTheDocument();
  });

  it("also supports the window.gnsis analytics surface", async () => {
    const track = vi.fn();
    (window as unknown as { gnsis: { track: typeof track } }).gnsis = { track };
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getAllByRole("button", { name: /Connect GitHub/i })[1]);
    expect(track).toHaveBeenCalledWith("landing_connect_github_clicked", expect.any(Object));
  });

  it("never blocks navigation when no analytics surface exists", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getAllByRole("button", { name: /Connect GitHub/i })[2]);
    expect(screen.getByText(/LOGIN PAGE/)).toBeInTheDocument();
  });

  it("keeps the 'View a sample receipt' link as an in-page anchor", () => {
    renderHome();
    const link = screen.getByRole("link", { name: /View a sample receipt/i });
    expect(link).toHaveAttribute("href", "#sample-receipt");
  });

  it("exposes the four-step product loop", () => {
    renderHome();
    const loop = screen.getByRole("list", { name: /Product loop steps/i });
    expect(within(loop).getAllByRole("listitem")).toHaveLength(4);
  });
});
