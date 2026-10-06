import * as React from "react"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input"> & {
  variant?: "default" | "plain"
}

function Input({ className, type, variant = "default", ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(
        "rounded-control border border-line bg-field text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 aria-invalid:border-red aria-invalid:ring-red/20",
        variant === "default" &&
          "flex h-9 w-full min-w-0 px-2.5 py-2 text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.035)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-ink file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
export type { InputProps }
