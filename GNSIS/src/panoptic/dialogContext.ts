// Opening the two forms from anywhere on a Panoptic page.

import { createContext, useContext } from "react";

export interface EarlyAccessRequest {
  /** The task typed into the bar, exactly as typed. Absent from a plain button. */
  task?: string | null;
  /** "page:control", recorded with the sign-up. */
  source: string;
  /** Where focus goes when the form closes, if not where it came from. */
  returnFocus?: HTMLElement | null;
}

export interface Dialogs {
  openEarlyAccess(request: EarlyAccessRequest): void;
  openContact(source: string, returnFocus?: HTMLElement | null): void;
}

export const DialogsContext = createContext<Dialogs | null>(null);

export function useDialogs(): Dialogs {
  const dialogs = useContext(DialogsContext);
  if (!dialogs) throw new Error("useDialogs must be used inside the Panoptic site");
  return dialogs;
}
