// The two forms' trip to the auth service (auth-service/src/intake.ts), which
// stores them in their own tables. Ordinary submissions omit credentials;
// developer-access requests include the Better Auth session so the service
// can require a linked GitHub identity.

import { authBaseUrl } from "@/lib/env";

export type IntakeResult =
  | { ok: true }
  | { ok: false; reason: "invalid-email" | "github-required" | "too-many" | "unavailable" | "failed" };

async function post(path: string, body: Record<string, unknown>, credentials: RequestCredentials = "omit"): Promise<IntakeResult> {
  const base = authBaseUrl();
  if (!base) return { ok: false, reason: "unavailable" };
  let res: Response;
  try {
    res = await fetch(`${base}/api/intake/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials,
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, reason: "failed" };
  }
  if (res.ok) return { ok: true };
  if (res.status === 429) return { ok: false, reason: "too-many" };
  if (res.status === 503) return { ok: false, reason: "unavailable" };
  if (res.status === 401 || res.status === 403) return { ok: false, reason: "github-required" };
  if (res.status === 400) {
    const detail = (await res.json().catch(() => null)) as { field?: string } | null;
    if (detail?.field === "email") return { ok: false, reason: "invalid-email" };
  }
  return { ok: false, reason: "failed" };
}

export function requestEarlyAccess(email: string, task: string | null, source: string): Promise<IntakeResult> {
  return post("early-access", { email, task, source });
}

export function requestDeveloperAccess(email: string, task: string | null, source: string): Promise<IntakeResult> {
  return post("developer-access", { email, task, source }, "include");
}

export function sendContactMessage(email: string, message: string, source: string): Promise<IntakeResult> {
  return post("contact", { email, message, source });
}

/** A loose check before sending; the service has the final word. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
