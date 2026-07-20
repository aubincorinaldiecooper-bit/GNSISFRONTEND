// GATEWAY request path — POST /v1/chat/completions.
//
// This path authenticates with a user-created `gns_` virtual key, and NOTHING
// else. It never carries the signed-in user's session JWT, and it never touches
// the dashboard request helper. Keeping it isolated means the virtual key can't
// leak onto normal application requests.
//
// The Authorization header and the full key are never returned, logged, or
// surfaced by anything in this module.

import { apiBaseUrl } from "./env";

export type GatewayErrorKind =
  | "invalid_request"
  | "invalid_key"
  | "insufficient_balance"
  | "spending_limit"
  | "model_not_permitted"
  | "provider_not_permitted"
  | "upstream_failure"
  | "gateway_not_configured"
  | "cors_failure"
  | "network_failure"
  | "unknown";

export interface GatewayUsage {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  cached_tokens: number | null;
  reasoning_tokens: number | null;
}

export interface GatewaySuccess {
  ok: true;
  httpStatus: number;
  requestId: string | null;
  runId: string | null;
  durationMs: number;
  model: string | null;
  providerResponseId: string | null;
  content: string;
  finishReason: string | null;
  usage: GatewayUsage;
  raw: unknown;
}

export interface GatewayFailure {
  ok: false;
  kind: GatewayErrorKind;
  httpStatus: number | null;
  requestId: string | null;
  runId: string | null;
  durationMs: number;
  message: string;
  code: string | null;
}

export type GatewayResult = GatewaySuccess | GatewayFailure;

export interface GatewayRequestInput {
  /** The gns_ / gns_test_ secret. Held only for this call. */
  key: string;
  model: string;
  prompt: string;
  maxTokens?: number;
  runId: string;
}

function mapErrorKind(status: number, code: string | null): GatewayErrorKind {
  switch (code) {
    case "invalid_request":
      return "invalid_request";
    case "missing_credential":
    case "invalid_key":
      return "invalid_key";
    case "insufficient_balance":
      return "insufficient_balance";
    case "spending_limit_exceeded":
      return "spending_limit";
    case "model_not_allowed":
      return "model_not_permitted";
    case "provider_not_allowed":
      return "provider_not_permitted";
    case "provider_error":
      return "upstream_failure";
    default:
      break;
  }
  if (status === 401) return "invalid_key";
  if (status === 400 || status === 422) return "invalid_request";
  if (status === 402) return "insufficient_balance";
  if (status === 403) return "model_not_permitted";
  if (status === 502 || status === 503 || status === 504) return "upstream_failure";
  return "unknown";
}

interface ChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
}

interface ChatResponse {
  id?: string;
  model?: string;
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: ChatUsage;
}

function extractUsage(usage: ChatUsage | undefined): GatewayUsage {
  if (!usage) {
    return { input_tokens: null, output_tokens: null, total_tokens: null, cached_tokens: null, reasoning_tokens: null };
  }
  const input = usage.prompt_tokens ?? null;
  const output = usage.completion_tokens ?? null;
  const total = usage.total_tokens ?? (input != null && output != null ? input + output : null);
  return {
    input_tokens: input,
    output_tokens: output,
    total_tokens: total,
    cached_tokens: usage.prompt_tokens_details?.cached_tokens ?? null,
    reasoning_tokens: usage.completion_tokens_details?.reasoning_tokens ?? null,
  };
}

/**
 * Send a single non-streaming chat completion through the GNSIS gateway using a
 * gns_ virtual key. Returns a fully structured success or failure — never throws
 * for an HTTP error, so the UI can render each failure category deliberately.
 */
export async function sendGatewayChat(input: GatewayRequestInput): Promise<GatewayResult> {
  const base = apiBaseUrl();
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);

  if (!base) {
    return {
      ok: false,
      kind: "gateway_not_configured",
      httpStatus: null,
      requestId: null,
      runId: input.runId,
      durationMs: 0,
      message: "The GNSIS API base URL is not configured (VITE_API_BASE_URL).",
      code: null,
    };
  }

  const body: Record<string, unknown> = {
    model: input.model,
    messages: [{ role: "user", content: input.prompt }],
  };
  if (input.maxTokens && input.maxTokens > 0) body.max_tokens = input.maxTokens;

  let res: Response;
  try {
    res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        // The ONLY place the gns_ secret is used. Never logged or surfaced.
        Authorization: `Bearer ${input.key}`,
        "Content-Type": "application/json",
        "X-Genesis-Run-Id": input.runId,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // fetch() rejects for network AND CORS/preflight failures indistinguishably;
    // both are surfaced honestly here rather than pretending the request ran.
    return {
      ok: false,
      kind: "network_failure",
      httpStatus: null,
      requestId: null,
      runId: input.runId,
      durationMs: elapsed(),
      message:
        "Could not reach the gateway. This is usually a network error or a missing CORS allowance on the backend for this origin.",
      code: null,
    };
  }

  const requestId = res.headers.get("X-Genesis-Request-Id");
  const runId = res.headers.get("X-Genesis-Run-Id") ?? input.runId;
  const durationMs = elapsed();

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const err = (payload as { error?: { code?: string; message?: string } } | null)?.error;
    const code = err?.code ?? null;
    return {
      ok: false,
      kind: mapErrorKind(res.status, code),
      httpStatus: res.status,
      requestId,
      runId,
      durationMs,
      message: err?.message ?? `Gateway returned HTTP ${res.status}.`,
      code,
    };
  }

  const data = (payload ?? {}) as ChatResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  return {
    ok: true,
    httpStatus: res.status,
    requestId,
    runId,
    durationMs,
    model: data.model ?? null,
    providerResponseId: data.id ?? null,
    content,
    finishReason: data.choices?.[0]?.finish_reason ?? null,
    usage: extractUsage(data.usage),
    raw: payload,
  };
}

/** A short, unguessable run id for one smoke-test call. */
export function newSmokeRunId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 18);
  return `frontend_smoke_${rand}`;
}
