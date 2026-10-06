// Adapted from Beautiful UI (MIT, © 2026 Shane Levine): see ./LICENSE-beautiful-ui.txt.

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlideMenuProps {
  children: ReactNode;
  className?: string;
  highlightClassName?: string;
  rowSelector?: string;
}

/** One hover layer that glides between the menu's rows, following pointer and keyboard focus. */
export function GlideMenu({
  children,
  className,
  highlightClassName = "inset-x-0 rounded-control bg-hover",
  rowSelector = "[data-menu-row]",
}: GlideMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  const [visible, setVisible] = useState(false);

  const moveTo = (target: EventTarget | null) => {
    const container = ref.current;
    if (!(target instanceof Element) || !container) return;
    const row = target.closest(rowSelector);
    if (!(row instanceof HTMLElement) || !container.contains(row)) return;
    const containerRect = container.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    setBox({ top: rowRect.top - containerRect.top, height: rowRect.height });
    setVisible(true);
  };

  return (
    <div
      ref={ref}
      onMouseOver={(event) => moveTo(event.target)}
      onMouseLeave={() => setVisible(false)}
      onFocusCapture={(event) => moveTo(event.target)}
      onBlurCapture={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !ref.current?.contains(next)) setVisible(false);
      }}
      className={cn("relative", className)}
    >
      <span
        aria-hidden
        className={cn("pointer-events-none absolute", highlightClassName)}
        style={{
          top: box?.top ?? 0,
          height: box?.height ?? 0,
          opacity: box && visible ? 1 : 0,
          transition:
            "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
        }}
      />
      {children}
    </div>
  );
}
