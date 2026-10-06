// Utility glyphs come exclusively from Lucide. The containing control owns
// the accessible label; these glyphs remain decorative.
import { ArrowRight, Search, Menu, X, UserRound, ChevronLeft, Play, MousePointer2 } from "lucide-react";
import { motion } from "motion/react";
import type { ComponentProps } from "react";

const AnimatedArrow = motion.create(ArrowRight);
type IconProps = { size?: number; className?: string; strokeWidth?: number };
export function ArrowIcon({ size = 18, strokeWidth = 1.8, ...props }: ComponentProps<typeof AnimatedArrow>) {
  return <AnimatedArrow aria-hidden="true" size={size} strokeWidth={strokeWidth} {...props} />;
}
export function SearchIcon({ size = 28, strokeWidth = 1.5, ...props }: IconProps & { color?: string }) {
  return <Search aria-hidden="true" size={size} strokeWidth={strokeWidth} {...props} />;
}
export function MenuIcon() { return <Menu aria-hidden="true" size={20} strokeWidth={1.8} />; }
export function CloseIcon() { return <X aria-hidden="true" size={20} strokeWidth={1.8} />; }
export function AccountIcon() { return <UserRound aria-hidden="true" size={13} />; }
export function BackIcon() { return <ChevronLeft aria-hidden="true" size={13} />; }
export function PlayIcon() { return <Play aria-hidden="true" size={8} fill="currentColor" />; }
export function CursorIcon({ className }: { className?: string }) { return <MousePointer2 aria-hidden="true" size={30} className={className} fill="currentColor" />; }
export function ThenArrow() { return <ArrowRight aria-hidden="true" width={40} height={20} />; }
