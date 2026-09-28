// One place for how Panoptic moves: small springs and quick fades, and none
// of it when the visitor has asked for reduced motion.

import { useReducedMotion, type Transition } from "motion/react";

export interface MotionPrefs {
  reduce: boolean;
  /** Presses, panels settling. */
  spring: Transition;
  /** Fades and small slides (the 200ms of the brief). */
  quick: Transition;
  /** Feedback while a control is held down. */
  tap: { scale: number } | undefined;
  /** How far an arrow slides on hover. */
  nudge: number;
}

export function useMotionPrefs(): MotionPrefs {
  const reduce = useReducedMotion() ?? false;
  return {
    reduce,
    spring: reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34, mass: 0.7 },
    quick: reduce ? { duration: 0 } : { duration: 0.2, ease: [0.2, 0, 0, 1] },
    tap: reduce ? undefined : { scale: 0.97 },
    nudge: reduce ? 0 : 4,
  };
}
