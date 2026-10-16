import { createContext, useContext } from "react";
import type { IntakeResult } from "@/panoptic/intake";
import type { ModelId } from "./models";

export type Failure = Extract<IntakeResult, { ok: false }>["reason"];

export const FAILURE_COPY: Record<Failure, string> = {
  "invalid-email": "That email doesn’t look right. Check it and try again.",
  "github-required": "Reconnect GitHub to send this developer request.",
  "too-many": "Too many tries just now. Give it a minute.",
  unavailable: "Sign-ups are closed for a moment. Please try again soon.",
  failed: "Something went wrong sending that. Please try again.",
};

export interface EarlyAccess {
  /** Opens the early-access form; `source` is recorded with the sign-up. */
  open: (source: string, developerModel?: ModelId, verifiedEmail?: string) => void;
}

export const EarlyAccessContext = createContext<EarlyAccess | null>(null);

export function useEarlyAccess(): EarlyAccess {
  const value = useContext(EarlyAccessContext);
  if (!value) throw new Error("useEarlyAccess must be used inside <StudioSite>");
  return value;
}
