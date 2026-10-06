import { afterEach, describe, expect, it } from "vitest";

import { isDormant, landingPath, PATHS } from "./config";

afterEach(() => {
  delete window.__GNSIS_CONFIG__;
});

describe("where the landing lives", () => {
  it("is dormant at /video-search while the live page is the home page", () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "live" };
    expect(isDormant()).toBe(true);
    expect(landingPath()).toBe(PATHS.videoSearch);
  });

  it("is the home page once the operator switches to video-search", () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "video-search" };
    expect(isDormant()).toBe(false);
    expect(landingPath()).toBe("/");
  });

  it("stays dormant outside live mode while keeping its stable path in studio mode", () => {
    window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "studio" };
    expect(isDormant()).toBe(false);
    expect(landingPath()).toBe(PATHS.videoSearch);
  });
});
