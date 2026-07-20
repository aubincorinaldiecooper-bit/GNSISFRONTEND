// Shared, truthful connection-state derivation used by Settings and the
// Integration Lab. The point is to NEVER collapse distinct realities ("we
// haven't checked", "the backend is down", "the session expired") into a single
// misleading "Disconnected".

import type { AuthStatus, BackendState } from "./session";

export type ConnTone = "ok" | "warn" | "error" | "checking" | "muted";

export interface ConnState {
  label: string;
  tone: ConnTone;
}

/** Backend reachability + session-acceptance, as distinct states. */
export function backendConnection(status: AuthStatus, backendState: BackendState): ConnState {
  if (status === "loading") return { label: "Checking…", tone: "checking" };
  if (status === "unauthenticated") return { label: "Signed out", tone: "muted" };
  switch (backendState) {
    case "checking":
      return { label: "Checking…", tone: "checking" };
    case "ok":
      return { label: "Connected", tone: "ok" };
    case "unauthorized":
      return { label: "Session expired", tone: "error" };
    case "unavailable":
      return { label: "Backend unavailable", tone: "error" };
    case "idle":
    default:
      return { label: "Not checked", tone: "muted" };
  }
}

/** GitHub App connection, given a resolved `/v1/me`. */
export function githubConnection(
  backendState: BackendState,
  connected: boolean | undefined,
): ConnState {
  if (backendState === "checking") return { label: "Checking…", tone: "checking" };
  if (backendState === "unauthorized") return { label: "Session expired", tone: "error" };
  if (backendState === "unavailable") return { label: "Can't check", tone: "error" };
  if (backendState !== "ok") return { label: "Not checked", tone: "muted" };
  return connected
    ? { label: "Connected", tone: "ok" }
    : { label: "Not connected", tone: "warn" };
}

export const toneClasses: Record<ConnTone, string> = {
  ok: "text-emerald-600",
  warn: "text-amber-600",
  error: "text-red-600",
  checking: "text-blue-600",
  muted: "text-muted-foreground",
};

export const toneDotClasses: Record<ConnTone, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  error: "bg-red-500",
  checking: "bg-blue-500",
  muted: "bg-muted-foreground/40",
};
