import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiBaseUrl,
  authBaseUrl,
  githubAppSlug,
  integrationLabEnabled,
  usingDeprecatedApiUrl,
} from "./env";

afterEach(() => {
  window.__GNSIS_CONFIG__ = undefined;
  vi.unstubAllEnvs();
});

describe("public runtime configuration", () => {
  it("prefers runtime Railway values over build-time Vite values", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://build-api.example.test");
    vi.stubEnv("VITE_AUTH_URL", "https://build-auth.example.test");
    vi.stubEnv("VITE_GITHUB_APP_SLUG", "build-app");
    vi.stubEnv("VITE_ENABLE_INTEGRATION_LAB", "false");

    window.__GNSIS_CONFIG__ = {
      VITE_API_BASE_URL: "https://runtime-api.example.test/",
      VITE_AUTH_URL: "https://runtime-auth.example.test/",
      VITE_GITHUB_APP_SLUG: "runtime-app",
      VITE_ENABLE_INTEGRATION_LAB: "true",
    };

    expect(apiBaseUrl()).toBe("https://runtime-api.example.test");
    expect(authBaseUrl()).toBe("https://runtime-auth.example.test");
    expect(githubAppSlug()).toBe("runtime-app");
    expect(integrationLabEnabled()).toBe(true);
  });

  it("still supports deprecated runtime VITE_API_URL fallback", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_API_URL", "https://build-api.example.test");

    window.__GNSIS_CONFIG__ = {
      VITE_API_BASE_URL: "",
      VITE_API_URL: "https://runtime-api.example.test/",
    };

    expect(apiBaseUrl()).toBe("https://runtime-api.example.test");
    expect(usingDeprecatedApiUrl()).toBe(true);
  });
});
