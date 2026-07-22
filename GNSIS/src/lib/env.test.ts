import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiBaseUrl,
  authBaseUrl,
  githubAppSlug,
  integrationLabEnabled,
  isApiConfigured,
  usingDeprecatedApiUrl,
} from "@/lib/env";

// env.ts resolves each public variable from window.__GNSIS_CONFIG__ (runtime,
// injected by /env.js) first, falling back to import.meta.env (build-time).
// These tests pin the precedence rule, the absent-vs-empty distinction, the
// deprecated-var fallback, and that values are returned verbatim (the container
// entrypoint is responsible for JSON-encoding them safely — see the Docker smoke
// test in CI).

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.__GNSIS_CONFIG__;
});

describe("runtime vs build-time precedence", () => {
  it("prefers a runtime value over the build-time bundle", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://build.example");
    window.__GNSIS_CONFIG__ = { VITE_API_BASE_URL: "https://runtime.example" };
    expect(apiBaseUrl()).toBe("https://runtime.example");
  });

  it("falls back to build-time when the key is ABSENT from the runtime config", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://build.example");
    window.__GNSIS_CONFIG__ = {}; // key not present
    expect(apiBaseUrl()).toBe("https://build.example");
  });

  it("an explicitly EMPTY runtime value overrides build-time (present key wins)", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://build.example");
    vi.stubEnv("VITE_API_URL", ""); // no deprecated fallback available either
    window.__GNSIS_CONFIG__ = { VITE_API_BASE_URL: "" };
    // The operator set the var to "" on purpose: it must not silently revert to
    // the baked-in build value.
    expect(apiBaseUrl()).toBe("");
    expect(isApiConfigured()).toBe(false);
  });

  it("uses build-time when there is no runtime config object at all", () => {
    vi.stubEnv("VITE_AUTH_URL", "https://auth.build");
    // window.__GNSIS_CONFIG__ left undefined
    expect(authBaseUrl()).toBe("https://auth.build");
  });
});

describe("deprecated VITE_API_URL fallback", () => {
  it("uses VITE_API_URL only when VITE_API_BASE_URL is unset", () => {
    window.__GNSIS_CONFIG__ = { VITE_API_URL: "https://old.example/" };
    expect(apiBaseUrl()).toBe("https://old.example");
    expect(usingDeprecatedApiUrl()).toBe(true);
  });

  it("prefers the canonical var when both are present", () => {
    window.__GNSIS_CONFIG__ = {
      VITE_API_BASE_URL: "https://new.example",
      VITE_API_URL: "https://old.example",
    };
    expect(apiBaseUrl()).toBe("https://new.example");
    expect(usingDeprecatedApiUrl()).toBe(false);
  });
});

describe("value integrity (unsafe characters survive as-is)", () => {
  it("returns values containing quotes, backslashes, tabs and newlines verbatim", () => {
    const weird = 'slug-with-"quotes"-and\\-backslash\tand\nnewline';
    window.__GNSIS_CONFIG__ = { VITE_GITHUB_APP_SLUG: weird };
    expect(githubAppSlug()).toBe(weird);
  });
});

describe("trailing slash handling", () => {
  it("trims one or more trailing slashes from URLs", () => {
    window.__GNSIS_CONFIG__ = { VITE_API_BASE_URL: "https://x.example///" };
    expect(apiBaseUrl()).toBe("https://x.example");
  });
});

describe("integration lab flag", () => {
  it("defaults ON when unset and can be disabled at runtime", () => {
    expect(integrationLabEnabled()).toBe(true);
    window.__GNSIS_CONFIG__ = { VITE_ENABLE_INTEGRATION_LAB: "false" };
    expect(integrationLabEnabled()).toBe(false);
  });
});
