// Beautiful UI LoadingState, MIT © 2026 Shane Levine. The Drive, Dots and
// Orbit loaders, shimmer label and elapsed timer are upstream; the gallery's
// "Surfer" meme-video variant is not vendored. See THIRD_PARTY_NOTICES.md.
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3
  return (c + Math.abs(r - 1)) * 90
})

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3]
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i)
  return k === -1 ? null : k * 110
})

const PATTERNS = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
} satisfies Record<string, { delays: (number | null)[]; dur: number; round: boolean }>

type LoadingVariant = keyof typeof PATTERNS

function LoaderGrid({ delays, dur, round }: { delays: (number | null)[]; dur: number; round: boolean }) {
  return (
    <span aria-hidden="true" className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]">
      {delays.map((delay, index) => (
        <span
          key={index}
          className={cn("size-[4px] bg-ink", round ? "rounded-full" : "rounded-[1px]")}
          style={{
            opacity: delay === null ? 0.07 : 0.15,
            animation: delay === null ? "none" : `pixel-on ${dur}ms ease-in-out ${delay}ms infinite`,
          }}
        />
      ))}
    </span>
  )
}

function useElapsed() {
  const [ds, setDs] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100)
    return () => clearInterval(t)
  }, [])
  const total = ds / 10
  if (total < 60) return `${total.toFixed(1)}s`
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`
}

function Elapsed() {
  const elapsed = useElapsed()
  return <span className="font-mono text-[12px] text-ink-3 tabular-nums">{elapsed}</span>
}

function LoadingState({
  label,
  variant = "Drive",
  elapsed = true,
  hideLabel = false,
  className,
}: {
  label: string
  variant?: LoadingVariant
  /** Upstream always shows the timer; callers may hide it. */
  elapsed?: boolean
  hideLabel?: boolean
  className?: string
}) {
  const { delays, dur, round } = PATTERNS[variant]
  return (
    <div role="status" data-slot="loading-state" className={cn("flex w-fit items-center gap-2.5", className)}>
      <LoaderGrid delays={delays} dur={dur} round={round} />
      <span
        className={cn("bg-clip-text text-[13px] font-medium text-transparent", hideLabel && "sr-only")}
        style={{
          backgroundImage: "linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)",
          backgroundSize: "200% 100%",
          animation: "shimmer-text 1.4s linear infinite",
        }}
      >
        {label}
      </span>
      {elapsed && <Elapsed />}
    </div>
  )
}

export { LoadingState }
export type { LoadingVariant }
