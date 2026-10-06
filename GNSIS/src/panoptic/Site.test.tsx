import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    await user.click(within(done).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Ask Panoptic" })).toHaveFocus());
  });

  it("does nothing with an empty bar", async () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "live" };
    const user = userEvent.setup();
    renderAt("/video-search");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("uses the shared dialog's Tab trap, Escape dismissal and explicit return focus", async () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "live" };
    const user = userEvent.setup();
    renderAt("/video-search");
    const task = screen.getByRole("textbox", { name: "Ask Panoptic" });
    await user.type(task, "Find the summit{Enter}");
    const dialog = screen.getByRole("dialog", { name: "Get early access" });
    const email = within(dialog).getByRole("textbox", { name: "Email" });
    const close = within(dialog).getByRole("button", { name: "Close" });
    expect(email).toHaveFocus();
    await act(async () => { close.focus(); });
    await user.tab();
    expect(email).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(task).toHaveFocus();
    expect(task).toHaveValue("Find the summit");
  });

  it("guards pending intake requests and retains the email and exact task for retry", async () => {
    window.__GNSIS_CONFIG__ = { VITE_AUTH_URL: "https://auth.example.test", VITE_HOME_EXPERIENCE: "live" };
    let resolve!: (response: Response) => void;
    const fetchMock = vi.fn().mockReturnValueOnce(new Promise<Response>((done) => { resolve = done; })).mockResolvedValueOnce(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderAt("/video-search");
    await user.type(screen.getByRole("textbox", { name: "Ask Panoptic" }), " Exact task {Enter}");
    const dialog = screen.getByRole("dialog", { name: "Get early access" });
    const email = within(dialog).getByRole("textbox", { name: "Email" });
    await user.type(email, "ada@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Get early access" }));
    const form = dialog.querySelector("form")!;
    expect(form).toHaveAttribute("aria-busy", "true");
    fireEvent.submit(form);
    expect(fetchMock).toHaveBeenCalledOnce();
    await act(async () => resolve(new Response(null, { status: 429 })));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Too many tries");
    expect(email).toHaveValue("ada@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Get early access" }));
    expect(await screen.findByRole("dialog", { name: "You’re on the list." })).toBe(dialog);
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({ email: "ada@example.com", task: " Exact task ", source: "video-search:task-bar" });
    expect(request.credentials).toBe("omit");
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

  it("hands mobile navigation off to early access and returns to the menu trigger", async () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "live" };
    const user = userEvent.setup();
    renderAt("/video-search");
    const trigger = screen.getByRole("button", { name: "Open menu" });
    await user.click(trigger);
    const menu = screen.getByRole("dialog", { name: "Menu" });
    await user.click(within(menu).getByRole("button", { name: "Get early access" }));
    const intake = screen.getByRole("dialog", { name: "Get early access" });
    expect(within(intake).getByRole("textbox", { name: "Email" })).toHaveFocus();
    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
