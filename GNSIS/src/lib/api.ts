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
