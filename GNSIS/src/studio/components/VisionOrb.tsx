import { motion, useReducedMotion } from "motion/react";

const ORBIT = "M20,200 a180,92 0 1,0 360,0 a180,92 0 1,0 -360,0";
const INNER = "M70,200 a130,130 0 1,0 260,0 a130,130 0 1,0 -260,0";

/** Panoptic's emblem: a steady eye at the centre, its attention orbiting the page. */
export function VisionOrb() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[420px]">
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18),rgba(37,99,235,0.05)_45%,transparent_68%)]" />
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <radialGradient id="orb-core" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="55%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>
        </defs>
        <g transform="rotate(-14 200 200)">
          <path d={ORBIT} fill="none" stroke="#bfdbfe" strokeWidth="1" strokeDasharray="2 6" />
          <circle r="5" fill="#2563eb">
            {!reduce && <animateMotion dur="9s" repeatCount="indefinite" path={ORBIT} />}
          </circle>
        </g>
        <g transform="rotate(32 200 200)">
          <path d="M45,200 a155,64 0 1,0 310,0 a155,64 0 1,0 -310,0" fill="none" stroke="#dbeafe" strokeWidth="1" />
        </g>
        <path d={INNER} fill="none" stroke="#dbeafe" strokeWidth="1" />
        <circle r="3.5" fill="#60a5fa">
          {!reduce && <animateMotion dur="14s" repeatCount="indefinite" path={INNER} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />}
        </circle>
      </svg>
      <div className="absolute left-1/2 top-1/2 size-[18%] -translate-x-1/2 -translate-y-1/2">
        {!reduce &&
          [0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border border-blue-400/60"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{ duration: 3.2, repeat: Infinity, delay: i * 1.6, ease: "easeOut" }}
            />
          ))}
        <svg viewBox="0 0 100 100" className="relative size-full drop-shadow-[0_10px_24px_rgba(37,99,235,0.45)]">
          <circle cx="50" cy="50" r="48" fill="url(#orb-core)" />
          <circle cx="40" cy="38" r="10" fill="white" opacity="0.55" />
        </svg>
      </div>
    </div>
  );
}
