// The design's inline stroke icons. All decorative: the control that holds
// one carries the label.

import { motion, type SVGMotionProps } from "motion/react";

type IconProps = { size?: number; className?: string; strokeWidth?: number };

export function ArrowIcon({ size = 18, className, strokeWidth = 1.8, ...rest }: IconProps & SVGMotionProps<SVGSVGElement>) {
  return (
    <motion.svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </motion.svg>
  );
}

export function SearchIcon({ size = 28, className, strokeWidth = 1.5, color = "currentColor" }: IconProps & { color?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20 20" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 8h16" />
      <path d="M4 16h16" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function AccountIcon() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg aria-hidden="true" width="8" height="8" viewBox="0 0 16 16">
      <path d="M4 2.5v11l9.5-5.5z" fill="#000" />
    </svg>
  );
}

export function CursorIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="30" height="34" viewBox="0 0 26 30" className={className}>
      <path d="M2 2l20 12-9 2 5 10-4 2-5-10-7 6z" fill="#000" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function ThenArrow() {
  return (
    <svg aria-hidden="true" width="40" height="20" viewBox="0 0 40 20">
      <path d="M6 10h26" stroke="#000" strokeWidth="2" />
      <path d="M26 4l7 6-7 6" fill="none" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
