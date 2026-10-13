import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Download, Laptop, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAC_DOWNLOAD_URL } from "../config";
import { studioButton } from "../ui/variants";

const itemClass =
  "flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-[13.5px] text-ink outline-none data-[highlighted]:bg-hover data-[disabled]:cursor-default data-[disabled]:text-ink-3";

/** "Download for Mac" with a menu of the other platforms, Windows marked coming soon. */
export function DownloadMenu({ size = "sm", tone = "ink", className }: { size?: "sm" | "md" | "lg"; tone?: "ink" | "light"; className?: string }) {
  const filled = tone === "light" ? "bg-white text-[#0b1220] shadow-none hover:bg-white/90" : undefined;
  return (
    <div className={cn("inline-flex items-stretch", className)}>
      <a
        href={MAC_DOWNLOAD_URL}
        className={cn(studioButton({ variant: "primary", size }), filled, "rounded-r-none pr-3")}
      >
        <Download aria-hidden className="size-4" />
        Download for Mac
      </a>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          aria-label="Other platforms"
          className={cn(
            studioButton({ variant: "primary", size }),
            filled,
            "rounded-l-none border-l px-2.5",
            tone === "light" ? "border-[#0b1220]/12" : "border-white/15",
          )}
        >
          <ChevronDown aria-hidden className="size-3.5" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            collisionPadding={16}
            className="z-50 w-60 rounded-window bg-surface p-1.5 font-studio shadow-overlay outline-none"
          >
            <DropdownMenu.Item asChild className={itemClass}>
              <a href={MAC_DOWNLOAD_URL}>
                <Laptop aria-hidden className="size-4 text-ink-2" />
                <span className="flex-1">macOS</span>
                <Download aria-hidden className="size-3.5 text-ink-3" />
              </a>
            </DropdownMenu.Item>
            <DropdownMenu.Item disabled className={itemClass}>
              <Monitor aria-hidden className="size-4" />
              <span className="flex-1">Windows</span>
              <span className="text-[12px]">Coming soon</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
