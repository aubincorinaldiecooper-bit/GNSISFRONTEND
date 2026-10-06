import { motion, type HTMLMotionProps } from "motion/react";

const EASE = [0.23, 1, 0.32, 1] as const;

/** A section that rises out of a soft blur the first time it scrolls into view. */
export function RevealSection({ children, ...props }: HTMLMotionProps<"section">) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.8, ease: EASE }}
      {...props}
    >
      {children}
    </motion.section>
  );
}

/** Lines of a headline, each lifting in a beat after the last. */
export function RiseLines({ lines, delay = 0 }: { lines: readonly string[]; delay?: number }) {
  return (
    <>
      {lines.map((line, i) => (
        <motion.span
          key={line}
          className="block"
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: delay + i * 0.12, ease: EASE }}
        >
          {line}
        </motion.span>
      ))}
    </>
  );
}

export function Eyebrow({ children }: { children: string }) {
  return <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-ink-3">{children}</p>;
}
