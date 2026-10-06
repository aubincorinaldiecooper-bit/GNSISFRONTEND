import * as React from "react"

import { cn } from "@/lib/utils"

type TextareaProps = React.ComponentProps<"textarea"> & {
  variant?: "default" | "plain"
}

function Textarea({ className, variant = "default", ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-variant={variant}
      className={cn(
        "rounded-control border border-line bg-field text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 aria-invalid:border-red aria-invalid:ring-red/20",
        variant === "default" &&
          "flex min-h-16 w-full px-2.5 py-2 text-[13px] leading-[1.4] shadow-[0_1px_2px_rgba(0,0,0,0.035)] [field-sizing:content]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
export type { TextareaProps }
