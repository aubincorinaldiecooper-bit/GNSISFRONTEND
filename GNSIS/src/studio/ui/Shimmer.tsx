// Adapted from Beautiful UI (MIT, © 2026 Shane Levine): see ./LICENSE-beautiful-ui.txt.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A label with light sweeping across it: the model is working. */
export function Shimmer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn("inline-block bg-clip-text text-transparent", className)}
      style={{
        backgroundImage: "linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)",
        backgroundSize: "200% 100%",
        animation: "bui-shimmer 1.8s linear infinite",
      }}
    >
      {children}
    </span>
  );
}
