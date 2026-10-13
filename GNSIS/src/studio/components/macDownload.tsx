import { useState, useSyncExternalStore } from "react";
import { InstallDialog } from "./InstallDialog";

/** Phones and tablets can't run the Mac app, so they get no download. iPadOS reports itself as a Mac with touch. */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const data = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (data?.mobile) return true;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

const noSubscribe = () => () => {};
export const useIsMobileDevice = () => useSyncExternalStore(noSubscribe, isMobileDevice, () => false);

/** Starts the DMG download and shows how to install it. */
export function useMacDownload() {
  const [open, setOpen] = useState(false);
  return { onClick: () => setOpen(true), dialog: <InstallDialog open={open} onOpenChange={setOpen} /> };
}
