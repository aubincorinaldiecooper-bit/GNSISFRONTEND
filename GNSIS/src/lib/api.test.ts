import { beforeEach, describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({ apiBaseUrl: () => "https://api.example.test", isApiConfigured: () => true }));
vi.mock("@/lib/authToken", () => ({ getBackendToken: vi.fn(async () => "session-jwt"), emitUnauthorized: vi.fn() }));

import { parseError, ApiError, getRunReceipt, matchesGatewayRequest, type UsageEvent } from "@/lib/api";

function res(body: unknown, init?: ResponseInit): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), init);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getRunReceipt", () => {
  it("uses the public immutable-run endpoint with the authenticated API client and no legacy fallback", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(res({ object: "receipt", run_id: "run/immutable" }, { status: 200 }));

    await getRunReceipt("run/immutable");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/v1/runs/run%2Fimmutable/receipt",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer session-jwt" }) }),
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/jobs/"))).toBe(false);
  });
});

describe("parseError", () => {
  it("parses a FastAPI {detail} string", async () => {
    const err = await parseError(res({ detail: "not allowed" }, { status: 400 }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("not allowed");
  });

  it("parses a gateway structured {error:{...}} body", async () => {
    const err = await parseError(
      res(
        { error: { code: "invalid_key", message: "bad key", request_id: "req_1" } },
        { status: 401 },
      ),
    );
    expect(err.code).toBe("invalid_key");
    expect(err.message).toBe("bad key");
    expect(err.requestId).toBe("req_1");
  });

  it("parses a FastAPI validation array detail", async () => {
    const err = await parseError(res({ detail: [{ msg: "field required" }] }, { status: 422 }));
    expect(err.message).toBe("field required");
  });

  it("falls back cleanly for a non-JSON body", async () => {
    const err = await parseError(res("oops", { status: 500, statusText: "Server Error" }));
    expect(err.status).toBe(500);
    expect(err.message).toBe("Server Error");
  });

  it("prefers the X-Genesis-Request-Id header when the body has none", async () => {
    const err = await parseError(
      res({ detail: "boom" }, { status: 500, headers: { "X-Genesis-Request-Id": "req_hdr" } }),
    );
    expect(err.requestId).toBe("req_hdr");
  });
});

describe("matchesGatewayRequest", () => {
  const base = { litellm_request_id: "req_1", run_id: "run_1" } as UsageEvent;

  it("matches on request id", () => {
    expect(matchesGatewayRequest(base, "req_1", null)).toBe(true);
  });
  it("matches on run id", () => {
    expect(matchesGatewayRequest(base, null, "run_1")).toBe(true);
  });
  it("does not match a different request/run", () => {
    expect(matchesGatewayRequest(base, "other", "other")).toBe(false);
  });
});
