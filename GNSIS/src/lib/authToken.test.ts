import { describe, it, expect, vi, afterEach } from "vitest";

import {
  onUnauthorized,
  emitUnauthorized,
  getBackendToken,
  clearBackendToken,
} from "@/lib/authToken";

describe("authToken unauthorized bus (session expiry signal)", () => {
  it("notifies listeners and can unsubscribe", () => {
    const cb = vi.fn();
    const off = onUnauthorized(cb);
    emitUnauthorized();
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    emitUnauthorized();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("keeps notifying other listeners if one throws", () => {
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    const off1 = onUnauthorized(bad);
    const off2 = onUnauthorized(good);
    expect(() => emitUnauthorized()).not.toThrow();
    expect(good).toHaveBeenCalled();
    off1();
    off2();
  });
});

describe("getBackendToken / clearBackendToken (sign-out race)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearBackendToken();
  });

  it("discards an in-flight exchange that resolves after clearBackendToken", async () => {
    vi.stubEnv("VITE_AUTH_URL", "https://auth.test");
    let resolveFetch: (r: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve))),
    );

    const pending = getBackendToken(true); // starts the in-flight token exchange
    clearBackendToken(); // sign-out races in and invalidates it
    // The exchange resolves with a valid token minted for the PREVIOUS user.
    resolveFetch(new Response(JSON.stringify({ token: "stale.jwt.token" }), { status: 200 }));

    await expect(pending).resolves.toBeNull(); // result discarded, never returned
  });

  it("does not serve a stale token to the next request after sign-out", async () => {
    vi.stubEnv("VITE_AUTH_URL", "https://auth.test");
    let resolveFirst: (r: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => new Promise<Response>((r) => (resolveFirst = r)))
        .mockImplementation(async () => new Response(null, { status: 401 })), // session now dead
    );

    const pending = getBackendToken(true);
    clearBackendToken();
    resolveFirst(new Response(JSON.stringify({ token: "stale.jwt.token" }), { status: 200 }));
    await pending;

    // A fresh call with the (now invalid) session must get null — proving the
    // stale token was never written to the cache.
    await expect(getBackendToken()).resolves.toBeNull();
  });
});
