import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import PanopticSite from "./Site";
import LandingPage from "./pages/LandingPage";
import WebSteeringPage from "./pages/WebSteeringPage";

afterEach(() => {
  delete window.__GNSIS_CONFIG__;
  vi.unstubAllGlobals();
  document.head.querySelectorAll('meta[name="robots"], meta[name="description"]').forEach((m) => m.remove());
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PanopticSite />}>
          <Route path="/video-search" element={<LandingPage />} />
          <Route path="/use-cases/agentic-web-steering" element={<WebSteeringPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("the landing's task bar", () => {
  it("opens early access without repeating the question, and sends it, exactly, with the sign-up", async () => {
    window.__GNSIS_CONFIG__ = { VITE_AUTH_URL: "https://auth.example.test", VITE_HOME_EXPERIENCE: "live" };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: "received" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderAt("/video-search");

    await user.type(screen.getByRole("textbox", { name: "Ask Panoptic" }), " Find me a flight to Montreal next Friday{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Get early access" });
    expect(within(dialog).queryByText(/Find me a flight to Montreal/)).toBeNull();
    expect(within(dialog).getByText(/We keep your email and what you asked only for this/)).toBeInTheDocument();

    await user.type(within(dialog).getByRole("textbox", { name: "Email" }), "ada@example.com");
    await user.click(within(dialog).getByRole("button", { name: /Get early access/ }));

    // The confirmation takes the form's place in the same dialog: it names the
    // dialog now, and the sent form is out of reach, not merely faded.
    const done = await screen.findByRole("dialog", { name: "You’re on the list." });
    expect(done).toBe(dialog);
    expect(within(dialog).queryByRole("textbox", { name: "Email" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Done" })).toHaveFocus();
    expect(document.querySelectorAll(`[id="${dialog.getAttribute("aria-labelledby")}"]`)).toHaveLength(1);

    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body).toEqual({ email: "ada@example.com", task: " Find me a flight to Montreal next Friday", source: "video-search:task-bar" });
  });

  it("does nothing with an empty bar", async () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "live" };
    const user = userEvent.setup();
    renderAt("/video-search");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("what the pages link to", () => {
  it("names only pages that exist, and keeps Contact as a form", () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "live" };
    renderAt("/video-search");
    for (const hidden of ["Research", "Video search", "Vision", "News", "Ask a video"]) {
      expect(screen.queryByText(hidden)).toBeNull();
    }
    const footer = screen.getByRole("navigation", { name: "Footer" });
    expect(within(footer).getByRole("link", { name: "Agentic web steering" })).toHaveAttribute("href", "/use-cases/agentic-web-steering");
    expect(within(footer).getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(within(footer).getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(within(footer).getByRole("button", { name: "Contact" })).toBeInTheDocument();
  });

  it("keeps the dormant pages out of search engines, and points Product at the dormant landing", async () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "live" };
    renderAt("/use-cases/agentic-web-steering");
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow"));
    const primary = screen.getAllByRole("navigation", { name: "Primary" })[0];
    expect(within(primary).getByRole("link", { name: "Product" })).toHaveAttribute("href", "/video-search");
    expect(within(primary).getByRole("link", { name: "Use Cases" })).toHaveAttribute("aria-current", "page");
  });

  it("lets search engines in, and points Product home, once the landing is the home page", async () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "video-search" };
    renderAt("/use-cases/agentic-web-steering");
    await waitFor(() => expect(document.title).toBe("Agentic web steering — Panoptic"));
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    const primary = screen.getAllByRole("navigation", { name: "Primary" })[0];
    expect(within(primary).getByRole("link", { name: "Product" })).toHaveAttribute("href", "/");
  });
});
