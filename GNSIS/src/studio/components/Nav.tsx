import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { PATHS } from "@/panoptic/config";
import { studioHomePath } from "../config";
import { useEarlyAccess } from "../earlyAccess";
import { buttonArrow, studioButton } from "../ui/variants";
import { DevelopersMenu } from "./DevelopersMenu";
import { ModelsMenu } from "./ModelsMenu";

/** The studio header: wordmark, model/developer menus, the Panoptic app, and Get started. */
export function StudioNav({ source }: { source: string }) {
  const { open } = useEarlyAccess();
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
            <DevelopersMenu />
            <Link to={PATHS.videoSearch} className={cn(studioButton({ variant: "quiet", size: "sm" }), "px-2 sm:px-3.5")}>
              Panoptic
            </Link>
            <Link to={PATHS.webSteering} className={cn(studioButton({ variant: "quiet", size: "sm" }), "hidden sm:inline-flex")}>
              Use cases
            </Link>
          </nav>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => open(source)}
          className={cn(studioButton({ variant: "primary", size: "sm" }), "hidden sm:inline-flex")}
        >
          Get started
          <ArrowRight aria-hidden className={buttonArrow} />
        </motion.button>
      </div>
    </header>
  );
}
