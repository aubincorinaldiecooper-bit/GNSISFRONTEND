// Draws its children at the design's pixel size and scales the result to
// whatever width the box has, so a small mock page keeps its composition at
// any screen width instead of reflowing. The scale is written straight to the
// element before paint; React never re-renders for it.

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function Canvas({
  width,
  height,
  className,
  label,
  children,
}: {
  /** The design's size of the drawing area, in CSS pixels. */
  width: number;
  height: number;
  className?: string;
  /** When set, the whole drawing is one image with this description. */
  label?: string;
  children: ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const box = outer.current;
    const drawing = inner.current;
    if (!box || !drawing) return;
    const apply = () => {
      const scale = box.clientWidth / width;
      drawing.style.transform = `scale(${scale > 0 ? scale : 1})`;
    };
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(apply);
    observer.observe(box);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={outer} className={className} role={label ? "img" : undefined} aria-label={label}>
      <div ref={inner} className="pn-canvas" style={{ width, height }} aria-hidden={label ? true : undefined}>
        {children}
      </div>
    </div>
  );
}
