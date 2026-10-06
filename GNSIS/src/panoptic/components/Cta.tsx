// Preserve the call-to-action API and motion; Beautiful UI owns the control.
import { motion } from "motion/react";
import type { MouseEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useMotionPrefs } from "../motion";
import { ArrowIcon } from "./Icons";

const AnimatedButton = motion.create(Button);
export function Cta({ children, onClick, inverse = false, large = false, arrow = true, type = "button", disabled, className, autoFocus, "aria-describedby": describedBy }: {
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
  return <AnimatedButton variant={inverse ? "secondary" : "primary"} size={large ? "lg" : "md"} type={type} className={className}
    onClick={onClick} disabled={disabled} autoFocus={autoFocus} aria-describedby={describedBy}
    whileHover={disabled ? undefined : "hover"} whileTap={disabled ? undefined : m.tap} transition={m.spring}>
    {children}{arrow && <ArrowIcon className="pn-arrow" variants={{ hover: { x: m.nudge } }} transition={m.quick} />}
  </AnimatedButton>;
}
