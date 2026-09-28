// The primary pill: black on light, white on black, with the arrow that
// slides 4px when the pointer is over it.

import { motion } from "motion/react";
import type { MouseEvent, ReactNode } from "react";

import { useMotionPrefs } from "../motion";
import { ArrowIcon } from "./Icons";

export function Cta({
  children,
  onClick,
  inverse = false,
  large = false,
  arrow = true,
  type = "button",
  disabled,
  className,
  autoFocus,
  "aria-describedby": describedBy,
}: {
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  inverse?: boolean;
  large?: boolean;
  arrow?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  "aria-describedby"?: string;
}) {
  const m = useMotionPrefs();
  const classes = ["pn-cta", inverse && "pn-cta--inverse", large && "pn-cta--large", className].filter(Boolean).join(" ");
  return (
    <motion.button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-describedby={describedBy}
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : m.tap}
      transition={m.spring}
    >
      {children}
      {arrow && <ArrowIcon className="pn-arrow" variants={{ hover: { x: m.nudge } }} transition={m.quick} />}
    </motion.button>
  );
}
