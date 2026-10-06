import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Navigate, Route, Routes, useLocation } from "react-router";

import StudioSite from "./Site";
import HomePage from "./pages/HomePage";
import DevelopersPage from "./pages/DevelopersPage";
import { homeExperience } from "@/lib/env";
import { studioHomePath, STUDIO_PATHS } from "./config";

vi.mock("./pages/HomePage", () => ({
  default: () => <h1>Studio home stub</h1>,
}));

afterEach(() => {
  delete window.__GNSIS_CONFIG__;
});

function CurrentPath() {
  const { pathname } = useLocation();
  return <output data-testid="current-path">{pathname}</output>;
}

function renderAt(path: string) {
  const studioIsHome = homeExperience() === "studio";
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CurrentPath />
      <Routes>
        <Route element={<StudioSite />}>
          {studioIsHome && <Route index element={<HomePage />} />}
          <Route
            path={STUDIO_PATHS.home}
            element={studioIsHome ? <Navigate to="/" replace /> : <HomePage />}
          />
          <Route path={STUDIO_PATHS.models} element={<p>Models page</p>} />
          <Route path={STUDIO_PATHS.developersPanoptic} element={<DevelopersPage modelId="panoptic" />} />
          <Route path={STUDIO_PATHS.developersGnsis01} element={<Navigate to={STUDIO_PATHS.developersPanoptic} replace />} />
        </Route>
        <Route path="*" element={<p>Not found</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Studio home routing", () => {
  it("renders the lab home at / in studio mode", () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "studio" };
    renderAt("/");
    expect(screen.getByRole("heading", { name: "Studio home stub" })).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/");
  });

  it("redirects /lab to the studio home at / in studio mode", () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "studio" };
    renderAt(STUDIO_PATHS.home);
    expect(screen.getByRole("heading", { name: "Studio home stub" })).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/");
  });

  it("keeps /lab as the Studio home path in other modes", () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "live" };
    expect(studioHomePath()).toBe(STUDIO_PATHS.home);
    renderAt(STUDIO_PATHS.home);
    expect(screen.getByRole("heading", { name: "Studio home stub" })).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent(STUDIO_PATHS.home);
  });

  it("uses / as the Studio home path in studio mode", () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "studio" };
    expect(studioHomePath()).toBe("/");
  });

  it("renders the Panoptic developer page at its stable route", () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "live" };
    renderAt(STUDIO_PATHS.developersPanoptic);
    expect(screen.getByRole("heading", { name: "Build with Panoptic." })).toBeInTheDocument();
  });

  it("sends the hidden GNSIS 1.0 developer route to Panoptic", () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "live" };
    renderAt(STUDIO_PATHS.developersGnsis01);
    expect(screen.getByRole("heading", { name: "Build with Panoptic." })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Developer pages" })).not.toBeInTheDocument();
  });
});
