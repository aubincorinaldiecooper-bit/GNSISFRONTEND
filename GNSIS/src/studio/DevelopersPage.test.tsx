import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import StudioSite from "./Site";
import DevelopersPage from "./pages/DevelopersPage";
import { PATHS } from "@/panoptic/config";
import { STUDIO_PATHS } from "./config";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  social: vi.fn(),
  linkSocial: vi.fn(),
}));

vi.mock("@/lib/authClient", () => ({
  authClient: {
    getSession: auth.getSession,
    signIn: { social: auth.social },
    linkSocial: auth.linkSocial,
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  delete window.__GNSIS_CONFIG__;
});

function renderPanoptic() {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  return render(
    <MemoryRouter initialEntries={[STUDIO_PATHS.developersPanoptic]}>
      <Routes>
        <Route element={<StudioSite />}>
          <Route path={STUDIO_PATHS.developersPanoptic} element={<DevelopersPage modelId="panoptic" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("developer access request", () => {
  beforeEach(() => {
    window.__GNSIS_CONFIG__ = { VITE_AUTH_URL: "https://auth.example.test" };
    auth.getSession.mockResolvedValue({ data: { user: { id: "user-1", email: "builder@example.com" } }, error: null });
    auth.social.mockResolvedValue({ data: { url: "https://github.com/login" }, error: null });
    auth.linkSocial.mockResolvedValue({ data: { url: "https://github.com/login" }, error: null });
  });

  it("submits the optional build description with the hero source", async () => {
    window.__GNSIS_CONFIG__ = { VITE_AUTH_URL: "https://auth.example.test" };
    const fetchMock = vi.fn().mockImplementation(async (url) => String(url).endsWith("developer-identity")
      ? { ok: true, status: 200, json: async () => ({ email: "builder@example.com" }) }
      : { ok: true, status: 201 });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderPanoptic();
    await user.click(screen.getAllByRole("button", { name: "Request with GitHub" })[0]);

    const dialog = await screen.findByRole("dialog", { name: "Request developer access" });
    expect(within(dialog).getByRole("textbox", { name: "What will you build?" })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "GitHub email" })).toHaveValue("builder@example.com");
    expect(within(dialog).getByRole("textbox", { name: "GitHub email" })).toHaveAttribute("readonly");
    await user.type(within(dialog).getByRole("textbox", { name: "What will you build?" }), "A browser agent");
    await user.click(within(dialog).getByRole("button", { name: "Request access" }));

    expect(await screen.findByText("We’ll write to builder@example.com when your key is ready.")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const request = fetchMock.mock.calls[1] as [RequestInfo | URL, RequestInit];
    expect(request[0]).toBe("https://auth.example.test/api/intake/developer-access");
    expect(JSON.parse(String(request[1].body))).toEqual({
      email: "builder@example.com",
      task: "A browser agent",
      source: "developers-panoptic:hero",
    });
    expect(request[1].credentials).toBe("include");
  });

  it("starts GitHub sign-in before showing the developer request to a visitor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    auth.getSession.mockResolvedValue({ data: null, error: null });
    const user = userEvent.setup();
    renderPanoptic();

    await user.click(screen.getAllByRole("button", { name: "Request with GitHub" })[0]);

    await waitFor(() => expect(auth.social).toHaveBeenCalledWith(expect.objectContaining({
      provider: "github",
      callbackURL: expect.stringContaining("developerRequest=hero"),
    })));
    expect(screen.queryByRole("dialog", { name: "Request developer access" })).not.toBeInTheDocument();
  });

  it("asks a Google consumer to link GitHub before requesting developer access", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    const user = userEvent.setup();
    renderPanoptic();

    await user.click(screen.getAllByRole("button", { name: "Request with GitHub" })[1]);

    await waitFor(() => expect(auth.linkSocial).toHaveBeenCalledWith({
      provider: "github",
      callbackURL: expect.stringContaining("developerRequest=closing"),
    }));
    expect(auth.social).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Request developer access" })).not.toBeInTheDocument();
  });

  it("links the header to Developers and the Panoptic video search", () => {
    renderPanoptic();

    const header = within(screen.getByRole("banner"));
    expect(header.getByRole("link", { name: "Developers" })).toHaveAttribute("href", STUDIO_PATHS.developers);
    expect(header.getByRole("link", { name: /Try Panoptic/ })).toHaveAttribute("href", PATHS.videoSearch);
    expect(header.queryByRole("button", { name: /Get started/ })).not.toBeInTheDocument();
  });
});
