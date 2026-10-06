import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import type { ModelId } from "../models";
import { ModelGlyph } from "./Glyphs";

const EASE = [0.23, 1, 0.32, 1] as const;

type CommonProps = {
  modelId: ModelId;
  title: string;
  subtitle: string;
  index: number;
};

type Props = CommonProps & Omit<ComponentPropsWithoutRef<"a">, "href"> & { to: string };

const rowClass =
  "group relative z-10 flex items-center gap-3 rounded-control px-2.5 py-2.5 outline-none focus-visible:outline-none";
const rowArrow =
  "size-4 shrink-0 text-ink-3 opacity-0 -translate-x-1 transition-[opacity,transform] duration-200 ease-out-strong group-hover:opacity-100 group-hover:translate-x-0 group-data-[highlighted]:opacity-100 group-data-[highlighted]:translate-x-0";

export const StudioDropdownRow = forwardRef<HTMLAnchorElement, Props>(function StudioDropdownRow(
  { modelId, title, subtitle, index, to, ...rest },
  ref,
) {
  const content = (
    <motion.span
      className="flex min-w-0 flex-1 items-center gap-3"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.04 + index * 0.05, ease: EASE }}
    >
      <ModelGlyph
        id={modelId}
        className="size-10 rounded-card text-[15px] shadow-hairline transition-transform duration-300 ease-out-strong group-hover:scale-105 group-data-[highlighted]:scale-105"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-ink">{title}</span>
        <span className="block truncate text-[12.5px] text-ink-2">{subtitle}</span>
      </span>
      <ArrowRight aria-hidden className={rowArrow} />
    </motion.span>
  );

  return (
    <Link ref={ref} to={to} {...rest} data-menu-row className={rowClass}>
      {content}
    </Link>
  );
});
