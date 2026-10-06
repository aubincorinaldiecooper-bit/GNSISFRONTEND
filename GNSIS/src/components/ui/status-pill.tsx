// Beautiful UI StatusPill, MIT © 2026 Shane Levine. Upstream classes and
// tones unchanged; see THIRD_PARTY_NOTICES.md.
import type { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const statusPillVariants = cva(
  "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium leading-none",
  {
    variants: {
      tone: {
        green: "bg-green-tint text-green",
        orange: "bg-orange-tint text-orange",
        red: "bg-red-tint text-red",
        accent: "bg-accent-tint text-accent-ink",
        neutral: "bg-inset text-ink-2",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
)

type StatusPillTone = NonNullable<VariantProps<typeof statusPillVariants>["tone"]>

const dotColor: Record<StatusPillTone, string> = {
  green: "bg-green",
  orange: "bg-orange",
  red: "bg-red",
  accent: "bg-accent",
  neutral: "bg-ink-3",
}

function StatusPill({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: StatusPillTone
  children: ReactNode
  dot?: boolean
  className?: string
}) {
  return (
    <span data-slot="status-pill" className={cn(statusPillVariants({ tone }), className)}>
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", dotColor[tone])} />}
      {children}
    </span>
  )
}

export { StatusPill, statusPillVariants }
export type { StatusPillTone }
