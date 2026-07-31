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
  | "blocked"
  | "failed"
  | "cancelled";

export interface JobRecord {
  id: string;
  repo: string;
  instruction: string;
  base_branch: string;
  engine: string;
  model: string | null;
  advisor_model: string | null;
  status: JobStatus;
  branch: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  usage: Record<string, number>;
  // Conversational run threads. `thread_id` groups the linked runs of one
  // conversation (equal to the root run's id); a run always belongs to a thread,
  // so when absent (older payloads) callers fall back to the run's own id.
  // `parent_job_id` is the run this one follows up on (null for the first run).
  thread_id?: string | null;
  parent_job_id?: string | null;
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

export interface RunReceipt {
  object: "receipt";
  run_id: string;
  execution_run_id: string | null;
  task: string;
  repository: string;
  status: string;
  execution_started?: boolean;
  model: string | null;
  advisor_model?: string | null;
  approval: { decision: string; approver: string; at: string } | null;
  pull_request: { number: number; url: string; branch: string } | null;
  files_changed: string[];
  tokens: { input: number; output: number; cached: number; reasoning: number } | null;
  tests: string | Record<string, unknown> | null;
  cost: {
    provider_cost: string;
    gnsis_service_fee?: string;
    total_billed?: string;
    currency: string;
    reconciliation_state?: string;
  } | null;
  failure_category: string | null;
  failure_message: string | null;
  timing?: {
    dispatched_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    duration_seconds: number | null;
  } | null;
  base_sha?: string | null;
  patch_hash?: string | null;
  policy?: Record<string, unknown> | null;
  intelligence?: {
    supplied: SuppliedIntelligence[];
    proposed: IntelligenceProposal[];
    approved: ApprovedIntelligence[];
  };
}

export interface RepositoryIntelligence {
  id: string;
  repository_id: string;
  content: string;
  type: string | null;
  status: "active";
  source_run_id: string | null;
  source_model: string | null;
  source_advisor_model: string | null;
  approval_id: string | number | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string | null;
}

export interface IntelligencePreview {
  memory_id: string;
  kind: string;
  content: string;
  selection_reason: string;
}

export interface IntelligenceProposal {
  id: string;
  content: string;
  kind: string;
  evidence?: Record<string, unknown>;
}

export interface SuppliedIntelligence {
  memory_id: string;
  kind: string | null;
  content: string | null;
  selected: true;
  delivered: boolean;
  source_run_id: string | null;
  source_model: string | null;
  source_advisor_model: string | null;
  approval_id: string | number | null;
  approved_by: string | null;
  approved_at: string | null;
  destination_run_id: string;
  destination_model: string | null;
}

export interface ApprovedIntelligence {
  memory_id: string;
  item_key: string | null;
  kind: string | null;
  approval_id: string | number | null;
  approved_by: string | null;
  approved_at: string | null;
  source_model: string | null;
  source_advisor_model: string | null;
}

export interface IntelligenceList<T> {
  object: "list";
  data: T[];
  has_more?: boolean;
  total?: number;
  total_available?: number;
  truncated?: boolean;
}

export interface IntelligenceApprovalSelection {
  proposal_id: string;
  selected?: boolean;
  content?: string;
  kind?: string;
}

/** One durable, backend-authored lifecycle fact for a run. */
export interface RunEvent {
  id: string;
  run_id: string;
  sequence: number;
  type: string;
  at: string;
  payload: {
    message?: string;
    stage?: string;
    execution_started?: boolean;
    model_called?: boolean;
    retryable?: boolean;
    next_action?: string | null;
    duration_seconds?: number | null;
    technical?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface RunEventList {
  object: "list";
  data: RunEvent[];
  has_more: boolean;
  total: number;
  limit: number;
  offset: number;
}

export interface CreateJobInput {
  repository_id: string;
  instruction: string;
  base_branch?: string;
  /** Required primary model id from the backend catalog. */
  model: string;
  /** Optional Advisor model. Omitted means no Advisor is pinned. */
  advisor_model?: string;
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

/** The public API's backend-assembled, immutable receipt for one run. */
export function getRunReceipt(runId: string): Promise<RunReceipt> {
  return request(`/v1/runs/${encodeURIComponent(runId)}/receipt`);
}

export function listRepositoryIntelligence(repositoryId: string, limit = 100, offset = 0): Promise<IntelligenceList<RepositoryIntelligence>> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return request(`/v1/repositories/${encodeURIComponent(repositoryId)}/intelligence?${query}`);
}

const MAX_REPOSITORY_INTELLIGENCE_PAGES = 100;

/** Load the complete ordered intelligence collection using backend pagination. */
export async function getAllRepositoryIntelligence(repositoryId: string, limit = 100): Promise<RepositoryIntelligence[]> {
  const intelligence: RepositoryIntelligence[] = [];
  const seen = new Set<string>();
  let offset = 0;
  for (let pageNumber = 0; pageNumber < MAX_REPOSITORY_INTELLIGENCE_PAGES; pageNumber += 1) {
    const page = await listRepositoryIntelligence(repositoryId, limit, offset);
    if (page.data.length === 0) break;
    let added = 0;
    for (const item of page.data) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      intelligence.push(item);
      added += 1;
    }
    if (!page.has_more || added === 0) break;
    offset += page.data.length;
  }
  return intelligence;
}

export function queryRepositoryIntelligence(repositoryId: string, task: string, limit = 5): Promise<IntelligenceList<IntelligencePreview>> {
  return request(`/v1/repositories/${encodeURIComponent(repositoryId)}/intelligence/query`, {
    method: "POST", body: JSON.stringify({ task, limit }),
  });
}

export function getRunIntelligenceProposals(runId: string): Promise<IntelligenceList<IntelligenceProposal>> {
  return request(`/v1/runs/${encodeURIComponent(runId)}/intelligence-proposals`);
}

export function approveRun(runId: string, intelligence: IntelligenceApprovalSelection[], note = ""): Promise<{ id: string; status: JobStatus }> {
  return request(`/v1/runs/${encodeURIComponent(runId)}/approve`, {
    method: "POST", body: JSON.stringify({ note, intelligence }),
  });
}

export function publishRun(runId: string): Promise<{ id: string; status: JobStatus }> {
  return request(`/v1/runs/${encodeURIComponent(runId)}/publish`, { method: "POST" });
}

export function rejectRun(runId: string, note = ""): Promise<{ id: string; status: JobStatus }> {
  return request(`/v1/runs/${encodeURIComponent(runId)}/reject`, {
    method: "POST", body: JSON.stringify({ note }),
  });
}

/** Structured lifecycle evidence; deliberately independent of the receipt. */
export function getRunEventsPage(runId: string, limit = 100, offset = 0): Promise<RunEventList> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return request(`/v1/runs/${encodeURIComponent(runId)}/events?${query.toString()}`);
}

const MAX_RUN_EVENT_PAGES = 100;

/** Fetch every lifecycle page beginning at a raw backend event offset. */
export async function getRunEventsSince(runId: string, offset: number, limit = 100): Promise<RunEvent[]> {
  const events: RunEvent[] = [];
  let nextOffset = offset;
  for (let pageNumber = 0; pageNumber < MAX_RUN_EVENT_PAGES; pageNumber += 1) {
    const page = await getRunEventsPage(runId, limit, nextOffset);
    events.push(...page.data);
    // An inconsistent empty page must not spin forever even if has_more is true.
    if (!page.has_more || page.data.length === 0) break;
    nextOffset += page.data.length;
  }
  return events;
}

/** Fetch the complete lifecycle history, including histories over 100 events. */
export function getAllRunEvents(runId: string, limit = 100): Promise<RunEvent[]> {
  return getRunEventsSince(runId, 0, limit);
}

/** Backwards-compatible page API. Prefer the explicit helpers above. */
export const getRunEvents = getRunEventsPage;

/**
 * Every run of the conversation `jobId` belongs to, oldest first. Opening any
 * run — including a `/runs/:jobId` deep link — resolves the whole thread; a
 * legacy run with no thread resolves to a single-run thread of just itself.
 */
export function getJobThread(jobId: string): Promise<JobRecord[]> {
  return request(`/jobs/${jobId}/thread`);
}

/**
 * Queue a new run linked into `parentJobId`'s conversation thread. The client
 * sends only the new instruction and, optionally, a primary-model override;
 * the backend resolves repository, Advisor, base branch, and the thread/parent
 * linkage authoritatively from the parent run. Omit both `instruction` and
 * `model` for Retry (failed) / Run-again (completed) — the backend reuses the
 * parent's instruction and model verbatim. An explicit `model` is validated
 * server-side against the same allowlist as a new run.
 */
export function followUpJob(parentJobId: string, instruction?: string, model?: string): Promise<JobRecord> {
  const payload: { instruction?: string; model?: string } = {};
  if (instruction != null) payload.instruction = instruction;
  if (model != null) payload.model = model;
  return request(`/jobs/${parentJobId}/follow-up`, { method: "POST", body: JSON.stringify(payload) });
}

/** Stop a run before it reaches a terminal state. Revokes its run token backend-side. */
export function cancelJob(jobId: string): Promise<JobRecord> {
  return request(`/jobs/${jobId}/cancel`, { method: "POST" });
}

const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set(["completed", "rejected", "blocked", "failed", "cancelled"]);

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
    // Repositories currently accessible through the GitHub App installation.
    // GitHub App access IS the permission — there is no second in-GNSIS
    // enablement layer, so no separate "enabled" counter.
    repository_count: number;
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
  // Mirrors GitHub App access after the last sync. The frontend never toggles
  // this — the field is exposed for legacy compatibility and diagnostics only,
  // never as a user permission surface.
  enabled: boolean;
  archived: boolean;
}

export interface ListRepositoriesOptions {
  /** Case-insensitive substring of full_name. */
  q?: string;
  limit?: number;
  offset?: number;
}

export function listRepositories(opts: ListRepositoriesOptions = {}): Promise<RepositoryRecord[]> {
  const p = new URLSearchParams();
  if (opts.q) p.set("q", opts.q);
  if (opts.limit != null) p.set("limit", String(opts.limit));
  if (opts.offset != null) p.set("offset", String(opts.offset));
  const qs = p.toString();
  return request(`/v1/repositories${qs ? `?${qs}` : ""}`);
}

const MAX_REPOSITORY_PAGES = 100;

/** Fetch all repositories without losing the backend's ordering. */
export async function getAllRepositories(limit = 100): Promise<RepositoryRecord[]> {
  const repositories: RepositoryRecord[] = [];
  const seen = new Set<string>();
  let offset = 0;
  for (let page = 0; page < MAX_REPOSITORY_PAGES; page += 1) {
    const result = await listRepositories({ limit, offset });
    if (result.length === 0) break;
    let added = 0;
    for (const repository of result) {
      if (seen.has(repository.id)) continue;
      seen.add(repository.id);
      repositories.push(repository);
      added += 1;
    }
    if (added === 0 || result.length < limit) break;
    offset += result.length;
  }
  return repositories;
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
