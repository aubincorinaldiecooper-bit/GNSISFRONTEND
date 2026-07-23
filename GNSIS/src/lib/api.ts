// Typed client for the GNSIS backend (see gnsisbackend/src/gnsis/service/api.py).
//
// TWO distinct request paths, deliberately kept separate:
//   1. Authenticated DASHBOARD requests (this file) — carry the signed-in user's
//      short-lived Better Auth JWT (Authorization: Bearer <jwt>). Used for
//      identity, repositories, balances, usage, and virtual-key management.
//   2. GATEWAY requests (see lib/gateway.ts) — carry a user-created `gns_`
//      virtual key, NEVER the session JWT. Used only for POST /v1/chat/completions.
//
// The old permanent `VITE_API_KEY` bearer is GONE — a build-time shared secret
// must never sit in the browser bundle. Auth is now per-user and per-request.

import { apiBaseUrl, isApiConfigured } from "./env";
import { getBackendToken, emitUnauthorized } from "./authToken";

export { isApiConfigured };

// =============================================================================
// ERRORS
// =============================================================================

/**
 * Normalised backend error. Handles both FastAPI's `{detail}` shape and the
 * gateway's structured `{error:{code,message,request_id,details}}` shape.
 */
export class ApiError extends Error {
  status: number;
  code: string | null;
  requestId: string | null;
  details: unknown;

  constructor(
    status: number,
    message: string,
    opts?: { code?: string | null; requestId?: string | null; details?: unknown },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = opts?.code ?? null;
    this.requestId = opts?.requestId ?? null;
    this.details = opts?.details ?? null;
  }
}

interface StructuredError {
  detail?: string | { msg?: string }[];
  error?: { code?: string; message?: string; request_id?: string; details?: unknown };
}

/** Parse a non-OK Response body into an ApiError without throwing on non-JSON. */
export async function parseError(res: Response): Promise<ApiError> {
  const requestId = res.headers.get("X-Genesis-Request-Id");
  let body: StructuredError | null = null;
  try {
    body = (await res.json()) as StructuredError;
  } catch {
    return new ApiError(res.status, res.statusText || "Request failed", { requestId });
  }
  // Gateway structured error.
  if (body?.error && (body.error.message || body.error.code)) {
    return new ApiError(res.status, body.error.message || body.error.code || res.statusText, {
      code: body.error.code ?? null,
      requestId: body.error.request_id ?? requestId,
      details: body.error.details ?? null,
    });
  }
  // FastAPI HTTPException `detail` (string, or a validation array).
  let detail: string = res.statusText || "Request failed";
  if (typeof body?.detail === "string") detail = body.detail;
  else if (Array.isArray(body?.detail) && body.detail[0]?.msg) detail = body.detail[0].msg!;
  return new ApiError(res.status, detail, { requestId });
}

// =============================================================================
// AUTHENTICATED REQUEST (session JWT, retry-once-on-401)
// =============================================================================

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBaseUrl();
  if (!base) throw new ApiError(0, "VITE_API_BASE_URL is not configured");

  const send = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${base}${path}`, { ...init, headers });
  };

  let res: Response;
  try {
    res = await send(await getBackendToken());
  } catch {
    throw new ApiError(0, "Network error reaching the GNSIS API.");
  }

  // One transparent refresh-and-retry on 401 (the 15-minute JWT may have just
  // expired; the session cookie can still mint a fresh one).
  if (res.status === 401) {
    const fresh = await getBackendToken(true);
    if (fresh) {
      try {
        res = await send(fresh);
      } catch {
        throw new ApiError(0, "Network error reaching the GNSIS API.");
      }
    }
    if (res.status === 401) {
      emitUnauthorized();
      throw await parseError(res);
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// =============================================================================
// JOBS (unchanged surface — the coding-agent flow must keep working)
// =============================================================================

export type JobStatus =
  | "queued"
  | "planning"
  | "patching"
  | "testing"
  | "summarizing"
  | "awaiting_approval"
  | "approved"
  | "publishing"
  | "completed"
  | "rejected"
  | "failed";

export interface JobRecord {
  id: string;
  repo: string;
  instruction: string;
  base_branch: string;
  engine: string;
  model: string | null;
  status: JobStatus;
  branch: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  usage: Record<string, number>;
}

export interface EngineInfo {
  id: string;
  label: string;
}

export interface LogRecord {
  phase: string;
  level: "info" | "warning" | "error";
  message: string;
  created_at: string;
}

export interface DiffRecord {
  patch: string;
  files_changed: string[];
}

export interface CreateJobInput {
  repository_id: string;
  instruction: string;
  base_branch?: string;
  /** OpenRouter model id from the backend catalog; omitted → server default. */
  model?: string;
}

export function health(): Promise<{ status: string }> {
  return request("/health");
}

export function listEngines(): Promise<EngineInfo[]> {
  return request("/engines");
}

export function createJob(input: CreateJobInput): Promise<JobRecord> {
  return request("/jobs", { method: "POST", body: JSON.stringify(input) });
}

export function listJobs(limit = 50): Promise<JobRecord[]> {
  return request(`/jobs?limit=${limit}`);
}

export function getJob(jobId: string): Promise<JobRecord> {
  return request(`/jobs/${jobId}`);
}

export function getJobLogs(jobId: string): Promise<LogRecord[]> {
  return request(`/jobs/${jobId}/logs`);
}

export function getJobDiff(jobId: string): Promise<DiffRecord | null> {
  return request<DiffRecord>(`/jobs/${jobId}/diff`).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
}

export function approveJob(jobId: string, note = "", actor = "human"): Promise<JobRecord> {
  return request(`/jobs/${jobId}/approve`, { method: "POST", body: JSON.stringify({ actor, note }) });
}

export function rejectJob(jobId: string, note = "", actor = "human"): Promise<JobRecord> {
  return request(`/jobs/${jobId}/reject`, { method: "POST", body: JSON.stringify({ actor, note }) });
}

export const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set(["completed", "rejected", "failed"]);

export function isTerminalStatus(status: JobStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

// =============================================================================
// IDENTITY — GET /v1/me
// =============================================================================

export interface MePayload {
  user: { id: string; email: string | null; name: string | null; avatar_url: string | null };
  workspace: { id: string; name: string };
  github: {
    connected: boolean;
    installation_count: number;
    repository_count: number;
    enabled_repository_count?: number;
  };
}

export function getMe(): Promise<MePayload> {
  return request("/v1/me");
}

// =============================================================================
// REPOSITORIES — GET /v1/repositories (bare list)
// =============================================================================

export interface RepositoryRecord {
  id: string;
  github_repository_id: number;
  owner: string;
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
  enabled: boolean;
  archived: boolean;
}

export interface ListRepositoriesOptions {
  /** Only repositories the user enabled in GNSIS (the New Run source). */
  enabledOnly?: boolean;
  /** Case-insensitive substring of full_name. */
  q?: string;
  limit?: number;
  offset?: number;
}

export function listRepositories(opts: ListRepositoriesOptions = {}): Promise<RepositoryRecord[]> {
  const p = new URLSearchParams();
  if (opts.enabledOnly) p.set("enabled_only", "true");
  if (opts.q) p.set("q", opts.q);
  if (opts.limit != null) p.set("limit", String(opts.limit));
  if (opts.offset != null) p.set("offset", String(opts.offset));
  const qs = p.toString();
  return request(`/v1/repositories${qs ? `?${qs}` : ""}`);
}

/** Enable or disable a repository for new runs (tenant-scoped, 404 if unknown). */
export function setRepositoryEnabled(repositoryId: string, enabled: boolean): Promise<RepositoryRecord> {
  return request(`/v1/repositories/${repositoryId}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export interface BranchInfo {
  name: string;
  is_default: boolean;
}

export interface BranchList {
  default_branch: string;
  branches: BranchInfo[];
}

/** Branches for a selected repository (server-side; the GitHub token never leaves the backend). */
export function listBranches(repositoryId: string, q = ""): Promise<BranchList> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return request(`/v1/repositories/${repositoryId}/branches${qs}`);
}

export function claimGitHubInstallation(installationId: number): Promise<void> {
  return request("/v1/github/installations/claim", {
    method: "POST",
    body: JSON.stringify({ installation_id: installationId }),
  });
}

// =============================================================================
// MODELS — GET /v1/models (server-controlled OpenRouter allowlist)
// =============================================================================

export interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  default: boolean;
  description?: string;
  speed_tier?: string;
  cost_tier?: string;
  context_window?: number;
}

export function listModels(): Promise<{ items: ModelInfo[] }> {
  return request("/v1/models");
}

// =============================================================================
// BALANCES — GET /v1/balances (money as exact decimal strings)
// =============================================================================

export interface Balances {
  workspace_id: string;
  currency: string;
  balance: string;
  available: string;
  reserved: string;
}

export function getBalances(): Promise<Balances> {
  return request("/v1/balances");
}

// =============================================================================
// USAGE EVENTS — GET /v1/usage-events
// =============================================================================

export interface UsageEvent {
  id: string;
  litellm_request_id: string; // == the gateway's X-Genesis-Request-Id
  workspace_id: string;
  user_id: string;
  run_id: string | null; // == the X-Genesis-Run-Id we send
  virtual_key_id: string | null;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  reasoning_tokens: number;
  duration_ms: number;
  request_status: string;
  upstream_cost: string;
  currency: string;
  provider_request_id: string | null;
  genesis_calculated_cost: string | null;
  cost_source: string;
  reconciliation_state: string;
  reconciliation_reason: string | null;
  created_at: string;
}

export function listUsageEvents(limit = 50): Promise<{ items: UsageEvent[] }> {
  return request(`/v1/usage-events?limit=${limit}`);
}

/**
 * True when a usage event corresponds to a specific gateway request. The gateway
 * stores its `X-Genesis-Request-Id` as the event's `litellm_request_id` and the
 * `X-Genesis-Run-Id` as `run_id`, so either identifies the event.
 */
export function matchesGatewayRequest(
  event: UsageEvent,
  requestId: string | null,
  runId: string | null,
): boolean {
  return Boolean(
    (requestId && event.litellm_request_id === requestId) || (runId && event.run_id === runId),
  );
}

// =============================================================================
// CANONICAL gns_ VIRTUAL KEYS — /v1/virtual-keys
// The secret is returned exactly once (create / rotate); afterwards only the
// non-secret `key_prefix` is available.
// =============================================================================

export type VirtualKeyStatus = "active" | "disabled" | "rotated";
export type VirtualKeyMode = "live" | "test";

export interface VirtualKey {
  id: string;
  key_prefix: string;
  mode: VirtualKeyMode;
  name: string;
  status: VirtualKeyStatus;
  workspace_id: string;
  project_id: string | null;
  environment_id: string | null;
  user_id: string | null;
  team_id: string | null;
  allowed_providers: string[];
  allowed_models: string[];
  soft_limit: string | null;
  hard_limit: string | null;
  per_run_limit: string | null;
  daily_limit: string | null;
  monthly_limit: string | null;
  expires_at: string | null;
  rotated_to: string | null;
  metadata: Record<string, unknown> | null;
  last_used_at: string | null;
  created_at: string;
  disabled_at: string | null;
}

export interface CreatedVirtualKey {
  key: string; // the secret — shown once, never returned again
  virtual_key: VirtualKey;
  warning: string;
}

export interface CreateKeyInput {
  name: string;
  mode?: VirtualKeyMode;
  allowed_models?: string[];
  allowed_providers?: string[];
  soft_limit?: string;
  hard_limit?: string;
  daily_limit?: string;
  monthly_limit?: string;
}

export function listKeys(): Promise<{ items: VirtualKey[] }> {
  return request("/v1/virtual-keys");
}

export function createKey(input: CreateKeyInput): Promise<CreatedVirtualKey> {
  return request("/v1/virtual-keys", { method: "POST", body: JSON.stringify(input) });
}

export function rotateKey(id: string): Promise<CreatedVirtualKey> {
  return request(`/v1/virtual-keys/${id}/rotate`, { method: "POST" });
}

export function disableKey(id: string): Promise<VirtualKey> {
  return request(`/v1/virtual-keys/${id}/disable`, { method: "POST" });
}
