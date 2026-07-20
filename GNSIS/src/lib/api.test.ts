import { describe, it, expect } from "vitest";

import { parseError, ApiError, matchesGatewayRequest, type UsageEvent } from "@/lib/api";

function res(body: unknown, init?: ResponseInit): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), init);
}

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
