import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Download, Laptop, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAC_DOWNLOAD_URL } from "../config";
import { studioButton } from "../ui/variants";
import { useIsMobileDevice, useMacDownload } from "./macDownload";

/** What phones see in place of the download button. */
export function MacOnlyNote({ short = false, tone = "ink", className }: { short?: boolean; tone?: "ink" | "light"; className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 text-left text-[14px] leading-snug",
        !short && "max-w-sm rounded-[14px] px-4 py-3",
        !short && (tone === "light" ? "bg-white/15 ring-1 ring-white/25" : "bg-surface shadow-btn"),
        tone === "light" ? "text-white" : "text-ink-2",
        className,
      )}
    >
      <Laptop aria-hidden className="size-4 shrink-0" />
      {short ? "Available on Mac" : "GNSIS is for Mac. Open this page on your computer to download."}
    </p>
  );
}

const itemClass =
  "flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-[13.5px] text-ink outline-none data-[highlighted]:bg-hover data-[disabled]:cursor-default data-[disabled]:text-ink-3";

/** "Download for Mac" with a menu of the other platforms, Windows marked coming soon. */
export function DownloadMenu({ size = "sm", tone = "ink", className }: { size?: "sm" | "md" | "lg"; tone?: "ink" | "light"; className?: string }) {
  const filled = tone === "light" ? "bg-white text-[#0b1220] shadow-none hover:bg-white/90" : undefined;
  const mobile = useIsMobileDevice();
  const download = useMacDownload();
  if (mobile) return <MacOnlyNote short={size === "sm"} tone={tone} className={className} />;
  return (
    <div className={cn("inline-flex items-stretch", className)}>
      {download.dialog}
      <a
        href={MAC_DOWNLOAD_URL}
        onClick={download.onClick}
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
              <a href={MAC_DOWNLOAD_URL} onClick={download.onClick}>
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
