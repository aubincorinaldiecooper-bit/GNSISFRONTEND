import { createContext, useContext } from "react";
import type { ModelId } from "./models";

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
