// Adapted from Beautiful UI (MIT, © 2026 Shane Levine): see ./LICENSE-beautiful-ui.txt.

import { cva, type VariantProps } from "class-variance-authority";

const filledShadow = "shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]";

/** Pill buttons: the studio's core control. Usable on <button>, <a> and <Link>. */
export const studioButton = cva(
  `group/button inline-flex items-center justify-center font-medium select-none whitespace-nowrap
   transition-[transform,background-color,opacity,box-shadow,color] duration-150 ease-out
   active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none
   focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--page),0_0_0_4px_var(--signal)]`,
  {
    variants: {
      variant: {
        primary: `bg-ink text-page hover:opacity-90 ${filledShadow}`,
        secondary: "bg-surface text-ink shadow-btn hover:bg-inset aria-expanded:bg-hover",
        accent: `bg-signal text-white hover:bg-signal-ink ${filledShadow}`,
        quiet: "text-ink-2 hover:bg-hover hover:text-ink",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px] leading-none rounded-full gap-1.5",
        md: "h-10 px-4 text-sm leading-none rounded-full gap-2",
        lg: "h-12 px-6 text-[15px] leading-none rounded-full gap-2",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type StudioButtonProps = VariantProps<typeof studioButton>;

/** The arrow inside a button nudges forward on hover. */
export const buttonArrow = "size-4 transition-transform duration-200 ease-out-strong group-hover/button:translate-x-0.5";
