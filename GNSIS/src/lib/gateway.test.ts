import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { sendGatewayChat, newSmokeRunId } from "@/lib/gateway";

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "https://api.test");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

interface Captured {
  url: string;
  init: RequestInit;
}

function mockFetch(handler: (url: string, init: RequestInit) => Response) {
  const captured: { value: Captured | null } = { value: null };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      captured.value = { url, init };
      return handler(url, init);
    }),
  );
  return captured;
}

describe("sendGatewayChat", () => {
  it("sends the gns_ key as Bearer + X-Genesis-Run-Id and captures the request id", async () => {
    const captured = mockFetch(
      () =>
        new Response(
          JSON.stringify({
            id: "prov_1",
            model: "anthropic/claude-opus-4.8",
            choices: [{ message: { content: "GNSIS integration test passed" }, finish_reason: "stop" }],
            usage: { prompt_tokens: 8, completion_tokens: 6, total_tokens: 14 },
          }),
          {
            status: 200,
            headers: { "X-Genesis-Request-Id": "req_abc", "X-Genesis-Run-Id": "frontend_smoke_1" },
          },
        ),
    );

    const result = await sendGatewayChat({
      key: "gns_test_secret_value",
      model: "anthropic/claude-opus-4.8",
      prompt: "hi",
      runId: "frontend_smoke_1",
    });

    const headers = captured.value!.init.headers as Record<string, string>;
    expect(captured.value!.url).toBe("https://api.test/v1/chat/completions");
    expect(headers.Authorization).toBe("Bearer gns_test_secret_value");
    expect(headers["X-Genesis-Run-Id"]).toBe("frontend_smoke_1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.requestId).toBe("req_abc");
      expect(result.runId).toBe("frontend_smoke_1");
      expect(result.providerResponseId).toBe("prov_1");
      expect(result.content).toBe("GNSIS integration test passed");
      expect(result.usage.total_tokens).toBe(14);
      expect(result.finishReason).toBe("stop");
    }
  });

  it("maps structured gateway errors to failure kinds", async () => {
    const cases: Array<[number, string, string]> = [
      [402, "spending_limit_exceeded", "spending_limit"],
      [402, "insufficient_balance", "insufficient_balance"],
      [403, "model_not_allowed", "model_not_permitted"],
      [401, "invalid_key", "invalid_key"],
      [502, "provider_error", "upstream_failure"],
    ];
    for (const [status, code, kind] of cases) {
      mockFetch(
        () =>
          new Response(JSON.stringify({ error: { code, message: code, request_id: "req_x" } }), {
            status,
            headers: { "X-Genesis-Request-Id": "req_x" },
          }),
      );
      const result = await sendGatewayChat({ key: "gns_test_x", model: "m", prompt: "p", runId: "r" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.kind).toBe(kind);
        expect(result.requestId).toBe("req_x");
      }
    }
  });

  it("returns network_failure when fetch rejects (network / CORS)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const result = await sendGatewayChat({ key: "k", model: "m", prompt: "p", runId: "r" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("network_failure");
  });

  it("reports gateway_not_configured when the API base URL is unset", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const result = await sendGatewayChat({ key: "k", model: "m", prompt: "p", runId: "r" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("gateway_not_configured");
  });

  it("newSmokeRunId is prefixed for attribution", () => {
    expect(newSmokeRunId()).toMatch(/^frontend_smoke_/);
  });
});
