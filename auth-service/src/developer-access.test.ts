import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getSession: vi.fn(),
  listUserAccounts: vi.fn(),
  getAccessToken: vi.fn(),
}));

vi.mock("./auth.js", () => ({ auth: { api, handler: vi.fn() } }));

describe("developer identity boundary", () => {
  const transport = fetch;
  let server: Server;
  let base: string;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_DATABASE_URL", "");
    api.getSession.mockResolvedValue({ user: { id: "user-1", email: "google@example.com" } });
    api.listUserAccounts.mockResolvedValue([{ providerId: "github", accountId: "github-1" }]);
    api.getAccessToken.mockResolvedValue({ accessToken: "test-token" });
    ({ server } = await import("./server.js"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects an anonymous visitor", async () => {
    api.getSession.mockResolvedValue(null);
    const response = await transport(`${base}/api/accounts/developer-identity`);
    expect(response.status).toBe(401);
    expect(api.listUserAccounts).not.toHaveBeenCalled();
  });

  it.each(["google", "credential"])("rejects a %s-only consumer session", async (providerId) => {
    api.listUserAccounts.mockResolvedValue([{ providerId, accountId: "consumer-1" }]);
    const response = await transport(`${base}/api/accounts/developer-identity`);
    expect(response.status).toBe(403);
    expect(api.getAccessToken).not.toHaveBeenCalled();
  });

  it("uses GitHub's verified email rather than the consumer account email", async () => {
    const githubFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { email: "unverified@example.com", primary: false, verified: false },
      { email: "github@example.com", primary: true, verified: true },
    ]), { status: 200 }));
    vi.stubGlobal("fetch", githubFetch);

    const response = await transport(`${base}/api/accounts/developer-identity`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: "github@example.com" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(api.getAccessToken).toHaveBeenCalledWith(expect.objectContaining({
      body: { providerId: "github", accountId: "github-1" },
    }));
    expect(githubFetch.mock.calls[0][0]).toBe("https://api.github.com/user/emails");
  });

  it("does not accept an unverified GitHub email", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { email: "unverified@example.com", primary: true, verified: false },
    ]), { status: 200 })));
    const response = await transport(`${base}/api/accounts/developer-identity`);
    expect(response.status).toBe(403);
  });
});
