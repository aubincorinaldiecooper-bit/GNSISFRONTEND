import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelId } from "../models";

/** Each model's mark: Panoptic's eye on night blue, GNSIS 1.0 on a warm sunrise. */
export function ModelGlyph({ id, className }: { id: ModelId; className?: string }) {
  if (id === "panoptic") {
    return (
      <span aria-hidden className={cn("relative flex shrink-0 items-center justify-center overflow-hidden bg-[#0b1220]", className)}>
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(59,130,246,0.6),transparent_62%)]" />
        <Eye className="relative size-[46%] text-white" strokeWidth={1.8} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_30%_25%,#ffe2b8,#ff9d63_48%,#ee6a3e)]",
        className,
      )}
    >
      <span className="relative text-[0.7em] font-semibold tracking-tight text-white">1.0</span>
    </span>
  );
}
