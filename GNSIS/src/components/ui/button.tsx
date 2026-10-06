// Beautiful UI Button, MIT © 2026 Shane Levine. Pinned source/adaptations:
// THIRD_PARTY_NOTICES.md. Canonical variants and geometry remain upstream.
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const filledShadow = "shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
const canonicalVariants = {
  primary: `bg-ink text-canvas hover:opacity-90 dark:bg-ink dark:text-canvas ${filledShadow}`,
  secondary: "bg-surface text-ink shadow-btn hover:bg-inset aria-expanded:bg-hover",
  ghost: "bg-hover-2 text-ink hover:bg-line-strong",
  accent: `bg-accent text-white hover:bg-accent-ink ${filledShadow}`,
  success: `bg-green text-white hover:brightness-95 ${filledShadow}`,
  quiet: "text-ink hover:bg-hover",
}
const canonicalSizes = {
  xs: "h-7 rounded-full px-2.5 text-[12px] font-normal leading-none gap-1",
  sm: "h-[27px] px-3 text-[13px] leading-none rounded-full gap-1.5",
  md: "px-4 py-[9px] text-sm leading-none rounded-full gap-2",
}

/* Pill-shaped by default — upstream's core button style. Explicit symmetric
 * padding, not a fixed height, keeps top/bottom spacing equal. Legacy names
 * map to this same implementation; prefer primary/secondary/quiet + xs/sm/md. */
export const buttonVariants = cva(
  `inline-flex items-center justify-center font-medium select-none
   transition-[transform,background-color,opacity] duration-150 ease-out
   active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none
   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
   [&_svg]:shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4`,
  {
    variants: {
      variant: {
        ...canonicalVariants,
        default: canonicalVariants.primary,
        outline: canonicalVariants.secondary,
        destructive: `bg-red text-white hover:brightness-95 ${filledShadow}`,
        link: `${canonicalVariants.quiet} underline-offset-4 hover:underline`,
        // Compatibility only: no unthemed second palette.
        plain: canonicalVariants.quiet,
      },
      size: {
        ...canonicalSizes,
        default: canonicalSizes.md,
        icon: "size-9 rounded-control p-0 gap-0",
        lg: "px-6 py-3 text-sm leading-none rounded-full gap-2",
        plain: canonicalSizes.md,
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
)

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, asChild = false, type, ...props }, ref
) {
  const Comp = asChild ? Slot : "button"
  return <Comp ref={ref} type={type ?? (asChild ? undefined : "button")} data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />
})
