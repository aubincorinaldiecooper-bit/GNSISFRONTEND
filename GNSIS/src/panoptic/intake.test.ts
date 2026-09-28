import { afterEach, describe, expect, it, vi } from "vitest";

import { looksLikeEmail, requestEarlyAccess, sendContactMessage } from "./intake";

afterEach(() => {
  delete window.__GNSIS_CONFIG__;
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: unknown = {}) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("sending the forms", () => {
  it("posts the sign-up, task exactly as typed, to the auth service without cookies", async () => {
    window.__GNSIS_CONFIG__ = { VITE_AUTH_URL: "https://auth.example.test/" };
    const fetchMock = stubFetch(201, { status: "received" });
    expect(await requestEarlyAccess("ada@example.com", "  a task  ", "video-search:task-bar")).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://auth.example.test/api/intake/early-access");
    expect(init.credentials).toBe("omit");
    expect(JSON.parse(String(init.body))).toEqual({ email: "ada@example.com", task: "  a task  ", source: "video-search:task-bar" });
  });

  it("says what went wrong in terms the form can show", async () => {
    window.__GNSIS_CONFIG__ = { VITE_AUTH_URL: "https://auth.example.test" };
    stubFetch(400, { field: "email" });
    expect(await sendContactMessage("x", "hi", "footer")).toEqual({ ok: false, reason: "invalid-email" });
    stubFetch(429);
    expect(await sendContactMessage("ada@example.com", "hi", "footer")).toEqual({ ok: false, reason: "too-many" });
    stubFetch(503);
    expect(await sendContactMessage("ada@example.com", "hi", "footer")).toEqual({ ok: false, reason: "unavailable" });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect(await sendContactMessage("ada@example.com", "hi", "footer")).toEqual({ ok: false, reason: "failed" });
  });

  it("does not pretend to send when there is nowhere to send to", async () => {
    window.__GNSIS_CONFIG__ = { VITE_AUTH_URL: "" };
    const fetchMock = stubFetch(201);
    expect(await requestEarlyAccess("ada@example.com", null, "video-search:nav")).toEqual({ ok: false, reason: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("checks an email loosely before sending", () => {
    expect(looksLikeEmail(" ada@example.com ")).toBe(true);
    expect(looksLikeEmail("ada@example")).toBe(false);
  });
});
