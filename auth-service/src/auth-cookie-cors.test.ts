import { afterEach, describe, expect, it, vi } from "vitest";

const productionEnv = {
  NODE_ENV: "production",
  AUTH_DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
  BETTER_AUTH_SECRET: "test-secret-with-enough-entropy-for-vitest",
  BETTER_AUTH_URL: "https://auth-production.up.railway.app",
  GITHUB_CLIENT_ID: "github-client-id",
  GITHUB_CLIENT_SECRET: "github-client-secret",
  GNSIS_FRONTEND_URL: "https://frontend-production.up.railway.app",
  GNSIS_API_AUDIENCE: "gnsis-api",
  GNSIS_AUTH_INTERNAL_SECRET: "internal-secret",
  VITEST: "true",
};

const developmentEnv = {
  NODE_ENV: "development",
  AUTH_DATABASE_URL: "",
  BETTER_AUTH_SECRET: "dev-only-insecure-secret-with-enough-length",
  BETTER_AUTH_URL: "http://localhost:3001",
  GITHUB_CLIENT_ID: "github-client-id",
  GITHUB_CLIENT_SECRET: "github-client-secret",
  GNSIS_FRONTEND_URL: "http://localhost:5173",
  GNSIS_API_AUDIENCE: "gnsis-api",
  GNSIS_AUTH_INTERNAL_SECRET: "internal-secret",
  VITEST: "true",
};

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

async function importAuthWithEnv(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }

  return import("./auth.js");
}

async function importServerWithEnv(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }

  return import("./server.js");
}

describe("Better Auth cookie attributes", () => {
  it("uses SameSite=None for production session cookies", async () => {
    const { auth } = await importAuthWithEnv(productionEnv);

    expect(auth.options.advanced?.defaultCookieAttributes?.sameSite).toBe("none");
  });

  it("keeps production cookies secure and HTTP-only", async () => {
    const { auth } = await importAuthWithEnv(productionEnv);

    expect(auth.options.advanced?.defaultCookieAttributes?.secure).toBe(true);
    expect(auth.options.advanced?.defaultCookieAttributes?.httpOnly).toBe(true);
    expect(auth.options.advanced?.useSecureCookies).toBe(true);
  });

  it("keeps SameSite=Lax and non-secure cookies for development", async () => {
    const { auth } = await importAuthWithEnv(developmentEnv);

    expect(auth.options.advanced?.defaultCookieAttributes?.sameSite).toBe("lax");
    expect(auth.options.advanced?.defaultCookieAttributes?.secure).toBe(false);
    expect(auth.options.advanced?.useSecureCookies).toBe(false);
  });
});

describe("credentialed CORS", () => {
  async function requestWithServer(origin: string, method = "GET") {
    const { server } = await importServerWithEnv(productionEnv);

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected server to listen on a TCP address");
    }

    try {
      return await fetch(`http://127.0.0.1:${address.port}/health`, {
        method,
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "Content-Type, Authorization",
        },
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }

  it("credentialed CORS allows only the configured frontend origin", async () => {
    const response = await requestWithServer(productionEnv.GNSIS_FRONTEND_URL);

    expect(response.headers.get("access-control-allow-origin")).toBe(
      productionEnv.GNSIS_FRONTEND_URL,
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("does not approve credentials for an unknown origin", async () => {
    const response = await requestWithServer("https://evil.example");

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });

  it("accepts preflight from the configured frontend origin", async () => {
    const response = await requestWithServer(productionEnv.GNSIS_FRONTEND_URL, "OPTIONS");

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      productionEnv.GNSIS_FRONTEND_URL,
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("rejects preflight from an untrusted origin", async () => {
    const response = await requestWithServer("https://evil.example", "OPTIONS");

    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });
});
