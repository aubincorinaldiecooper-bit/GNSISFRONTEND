import { useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlideMenu } from "../ui/GlideMenu";
import { studioButton } from "../ui/variants";

const EASE = [0.23, 1, 0.32, 1] as const;

export function StudioDropdown({
  label,
  eyebrow,
  children,
  triggerClassName,
}: {
  label: string;
  eyebrow: string;
  children: ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenu.Trigger
        className={cn(
          studioButton({ variant: "quiet", size: "sm" }),
          "data-[state=open]:bg-hover data-[state=open]:text-ink",
          triggerClassName,
        )}
      >
        {label}
        <ChevronDown
          aria-hidden
          className={cn("size-3.5 transition-transform duration-300 ease-out-strong", open && "rotate-180")}
        />
      </DropdownMenu.Trigger>
      <AnimatePresence>
        {open && (
          <DropdownMenu.Portal forceMount>
            <DropdownMenu.Content forceMount asChild align="start" sideOffset={10} collisionPadding={16}>
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -4, scale: 0.98, filter: "blur(2px)", transition: { duration: 0.14 } }}
                transition={{ duration: 0.26, ease: EASE }}
                style={{ transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)" }}
                className="z-50 w-[min(360px,calc(100vw-2rem))] rounded-window bg-surface p-1.5 font-studio shadow-overlay outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">
                  {eyebrow}
                </p>
                <GlideMenu>{children}</GlideMenu>
              </motion.div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        )}
      </AnimatePresence>
    </DropdownMenu.Root>
  );
}
