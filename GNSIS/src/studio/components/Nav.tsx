import { useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { studioHomePath } from "../config";
import { EarlyAccessButton } from "./EarlyAccessButton";

/** The studio header: logo and Request early access. */
/** `onSky` lightens the header while it sits over the home page's blue sky. */
export function StudioNav({ onSky = false }: { onSky?: boolean }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));
  const light = onSky && !scrolled;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled
          ? "bg-[color-mix(in_oklab,var(--page)_78%,transparent)] shadow-[0_1px_0_var(--line)] backdrop-blur-xl backdrop-saturate-150"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-8">
        <div className="flex items-center gap-1 sm:gap-6">
          <Link
            to={studioHomePath()}
            className={cn("flex items-center gap-2 rounded-chip text-[17px] font-semibold tracking-[0.06em] transition-colors focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--signal)]", light ? "text-white" : "text-ink")}
          >
            <img src="/brand/gnsis-mark.png" alt="" width={26} height={26} className={cn("size-[26px] transition-[filter]", light && "invert")} />
            <span className="hidden sm:inline">GNSIS</span>
          </Link>
        </div>
        <EarlyAccessButton source="home:nav" size="sm" tone={light ? "light" : "ink"} />
      </div>
    </header>
  );
}
