import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import StudioSite from "./Site";
import DevelopersPage from "./pages/DevelopersPage";
import { PATHS } from "@/panoptic/config";
import { STUDIO_PATHS } from "./config";

afterEach(() => {
  vi.unstubAllGlobals();
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
  it("submits the optional build description with the hero source", async () => {
    window.__GNSIS_CONFIG__ = { VITE_AUTH_URL: "https://auth.example.test" };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderPanoptic();
    await user.click(screen.getAllByRole("button", { name: "Request developer access" })[0]);

    const dialog = await screen.findByRole("dialog", { name: "Request developer access" });
    expect(within(dialog).getByRole("textbox", { name: "What will you build?" })).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox", { name: "Work email" }), "builder@example.com");
    await user.type(within(dialog).getByRole("textbox", { name: "What will you build?" }), "A browser agent");
    await user.click(within(dialog).getByRole("button", { name: "Request access" }));

    expect(await screen.findByText("We’ll write to builder@example.com when your key is ready.")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const request = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(request[0]).toBe("https://auth.example.test/api/intake/early-access");
    expect(JSON.parse(String(request[1].body))).toEqual({
      email: "builder@example.com",
      task: "A browser agent",
      source: "developers-panoptic:hero",
    });
  });

  it("links the header to Developers and the Panoptic video search", () => {
    renderPanoptic();

    const header = within(screen.getByRole("banner"));
    expect(header.getByRole("link", { name: "Developers" })).toHaveAttribute("href", STUDIO_PATHS.developers);
    expect(header.getByRole("link", { name: /Try Panoptic/ })).toHaveAttribute("href", PATHS.videoSearch);
    expect(header.queryByRole("button", { name: /Get started/ })).not.toBeInTheDocument();
  });
});
