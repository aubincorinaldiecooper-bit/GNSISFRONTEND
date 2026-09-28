// The two forms' trip to the auth service (auth-service/src/intake.ts), which
// stores them in their own tables. Plain fetch, no cookies: nothing about a
// visitor's session goes with a sign-up.

import { authBaseUrl } from "@/lib/env";

export type IntakeResult =
  | { ok: true }
  | { ok: false; reason: "invalid-email" | "too-many" | "unavailable" | "failed" };

async function post(path: string, body: Record<string, unknown>): Promise<IntakeResult> {
  const base = authBaseUrl();
  if (!base) return { ok: false, reason: "unavailable" };
  let res: Response;
  try {
    res = await fetch(`${base}/api/intake/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, reason: "failed" };
  }
  if (res.ok) return { ok: true };
  if (res.status === 429) return { ok: false, reason: "too-many" };
  if (res.status === 503) return { ok: false, reason: "unavailable" };
  if (res.status === 400) {
    const detail = (await res.json().catch(() => null)) as { field?: string } | null;
    if (detail?.field === "email") return { ok: false, reason: "invalid-email" };
  }
  return { ok: false, reason: "failed" };
}

export function requestEarlyAccess(email: string, task: string | null, source: string): Promise<IntakeResult> {
  return post("early-access", { email, task, source });
}

export function sendContactMessage(email: string, message: string, source: string): Promise<IntakeResult> {
  return post("contact", { email, message, source });
}

/** A loose check before sending; the service has the final word. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
