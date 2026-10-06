import { useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { PATHS } from "@/panoptic/config";
import { STUDIO_PATHS, studioHomePath } from "../config";
import { buttonArrow, studioButton } from "../ui/variants";
import { ModelsMenu } from "./ModelsMenu";

/** The studio header: wordmark, Models menu, Developers, and the Try Panoptic button. */
export function StudioNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

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
            className="rounded-chip text-[17px] font-semibold tracking-[0.06em] text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--signal)]"
          >
            GNSIS
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-0 sm:gap-0.5">
            <ModelsMenu />
            <Link to={STUDIO_PATHS.developers} className={cn(studioButton({ variant: "quiet", size: "sm" }), "px-2 sm:px-3.5")}>
              Developers
            </Link>
          </nav>
        </div>
        <Link to={PATHS.videoSearch} className={cn(studioButton({ variant: "primary", size: "sm" }), "px-3 sm:px-3.5")}>
          Try Panoptic
          <ArrowRight aria-hidden className={buttonArrow} />
        </Link>
      </div>
    </header>
  );
}
