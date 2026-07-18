// Typed client for the GNSIS backend job API (see gnsisbackend/src/gnsis/service/api.py).
// Base URL and optional shared-secret key are read from Vite env vars at build time.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

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
  status: JobStatus;
  branch: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  // Present once the engine reports token usage (not every engine does).
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
  repo: string;
  instruction: string;
  base_branch?: string;
  engine?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(0, "VITE_API_BASE_URL is not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function isApiConfigured(): boolean {
  return BASE_URL.length > 0;
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
  return request(`/jobs/${jobId}/approve`, {
    method: "POST",
    body: JSON.stringify({ actor, note }),
  });
}

export function rejectJob(jobId: string, note = "", actor = "human"): Promise<JobRecord> {
  return request(`/jobs/${jobId}/reject`, {
    method: "POST",
    body: JSON.stringify({ actor, note }),
  });
}

export const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set(["completed", "rejected", "failed"]);

export function isTerminalStatus(status: JobStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

// -- utility dashboard (see gnsisbackend docs/dashboard.md) --------------------
// Read-only, workspace-scoped views over metering (PR 1) + billing (PR 2). Money
// is returned as exact decimal strings — keep it as string until display, and
// format for the UI only (never parse into a binary float for arithmetic).

export interface DashboardOverview {
  workspace_id: string;
  currency: string;
  balance: string;
  available: string;
  on_hold: string;
  spent_30d: string;
  spent_total: string;
  usage_count: number;
  run_count: number;
  charge_count: number;
  last_activity_at: string | null;
  billing_enabled: boolean;
  refill_enabled: boolean;
}

export interface UsageLedgerItem {
  id: string;
  created_at: string;
  provider: string;
  model: string;
  engine: string | null;
  phase: string | null;
  run_id: string | null;
  repository_id: string | null;
  request_status: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  currency: string;
  upstream_cost: string;
  // From the immutable charge; null for failed / zero-cost calls.
  retail_cost: string | null;
  markup_rate: string | null;
  service_fee: string | null;
  billing_status: string | null;
}

export type TransactionType =
  | "top_up"
  | "usage_debit"
  | "refund"
  | "credit"
  | "adjustment";

export interface LedgerEntry {
  id: string;
  created_at: string;
  transaction_type: TransactionType;
  signed_amount: string;
  currency: string;
  reference: string | null;
}

export interface Paginated<T> {
  items: T[];
  limit: number;
  offset: number;
  total: number;
}

export interface RefillSession {
  url: string;
  session_id: string | null;
  amount_usd: string;
  currency: string;
}

export function getOverview(): Promise<DashboardOverview> {
  return request("/v1/dashboard/overview");
}

export function getUsageLedger(limit = 50, offset = 0): Promise<Paginated<UsageLedgerItem>> {
  return request(`/v1/dashboard/usage?limit=${limit}&offset=${offset}`);
}

export function getTransactions(limit = 50, offset = 0): Promise<Paginated<LedgerEntry>> {
  return request(`/v1/dashboard/transactions?limit=${limit}&offset=${offset}`);
}

/** Open a Stripe Checkout Session for a prepaid refill; returns the URL to redirect to. */
export function createRefill(amountUsd: string): Promise<RefillSession> {
  return request("/v1/billing/refill", {
    method: "POST",
    body: JSON.stringify({ amount_usd: amountUsd }),
  });
}

// -- wallet billing summary + Customer Portal ---------------------------------
// GNSIS owns the balances/spend; Stripe owns the card + invoices. Only safe card
// metadata (brand/last4/expiry) is ever returned.

export interface DefaultCard {
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
}

export interface BillingSummary {
  currency: string;
  balance: string;
  available: string;
  reserved: string;
  spent_this_month: string;
  has_customer: boolean;
  default_card: DefaultCard | null;
  refill_enabled: boolean;
  portal_available: boolean;
  tax_enabled: boolean;
}

export function getBillingSummary(): Promise<BillingSummary> {
  return request("/v1/billing/summary");
}

/** Open a Stripe Customer Portal session (payment methods, invoices, receipts). */
export function createPortalSession(): Promise<{ url: string }> {
  return request("/v1/billing/portal", { method: "POST" });
}

// -- virtual keys (customer-issued, LiteLLM budget-enforced) -------------------
// GNSIS returns the secret exactly once, at creation; afterwards only a display
// prefix is available.

export interface VirtualKey {
  id: string;
  workspace_id: string;
  user_id: string;
  key_alias: string;
  application_name: string | null;
  key_prefix: string;
  max_budget: string | null;
  budget_duration: string | null;
  models: string[];
  status: "active" | "revoked";
  created_at: string;
  revoked_at: string | null;
}

export interface VirtualKeyList {
  items: VirtualKey[];
  enabled: boolean;
}

export interface CreatedVirtualKey {
  key: string; // the secret — shown once, never returned again
  virtual_key: VirtualKey;
  warning: string;
}

export interface CreateKeyInput {
  key_alias: string;
  max_budget_usd?: string;
  budget_duration?: string;
  models?: string[];
}

export function listKeys(): Promise<VirtualKeyList> {
  return request("/v1/dashboard/keys");
}

export function createKey(input: CreateKeyInput): Promise<CreatedVirtualKey> {
  return request("/v1/dashboard/keys", { method: "POST", body: JSON.stringify(input) });
}

export function revokeKey(id: string): Promise<VirtualKey> {
  return request(`/v1/dashboard/keys/${id}`, { method: "DELETE" });
}
