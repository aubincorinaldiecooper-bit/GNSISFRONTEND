// The design brief's optional "section scroll reveals": each section fades in
// and rises a little, once, the first time it scrolls into view. Visitors who
// have turned motion off see every section as it is, with nothing moving.

import { motion, type HTMLMotionProps } from "motion/react";

import { useMotionPrefs } from "../motion";

export function RevealSection(props: HTMLMotionProps<"section">) {
  const m = useMotionPrefs();
  return (
    <motion.section
      initial={m.reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={m.reduce ? { duration: 0 } : { duration: 0.6, ease: [0.2, 0, 0, 1] }}
      {...props}
    />
  );
}
