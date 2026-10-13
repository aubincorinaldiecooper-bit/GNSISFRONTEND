import type { ReactNode } from "react";
import { ArrowRight, CircleCheck, FileArchive, Folder, MousePointer2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { MAC_DOWNLOAD_URL } from "../config";

const APP_ICON = "/brand/gnsis-app-icon.png";

function Step({ n, art, children }: { n: number; art: ReactNode; children: ReactNode }) {
  return (
    <li className="flex flex-col">
      <div className="relative">
        <span className="absolute -left-2 -top-3 z-10 flex size-8 items-center justify-center rounded-full bg-signal-tint text-[14px] font-semibold text-signal-ink ring-4 ring-surface">
          {n}
        </span>
        <div aria-hidden className="flex h-40 items-center justify-center overflow-hidden rounded-[14px] ring-1 ring-line">
          {art}
        </div>
      </div>
      <p className="mt-4 text-center text-[14.5px] leading-snug text-ink-2">{children}</p>
    </li>
  );
}

const em = "font-medium text-signal-ink";

/** Shown once "Download for Mac" starts the DMG download: the three steps to install it. */
export function InstallDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-6 font-studio sm:max-w-3xl sm:p-10">
        <p className="flex items-center justify-center gap-1.5 text-[14px] font-medium text-[#0e9f6e]">
          <CircleCheck aria-hidden className="size-4" />
          Download started
        </p>
        <DialogTitle className="mt-2 text-center text-[26px] font-semibold tracking-[-0.02em] text-ink">How to install GNSIS</DialogTitle>
        <DialogDescription className="sr-only">Three steps to install GNSIS on your Mac.</DialogDescription>
        <ol className="mt-9 grid gap-8 sm:grid-cols-3 sm:gap-5">
          <Step
            n={1}
            art={
              <div className="flex size-full flex-col items-center justify-center gap-3 bg-[#0b1230]">
                <span className="rounded-[8px] bg-white/20 px-3 py-1 text-[15px] text-white">Downloads</span>
                <div className="relative flex items-center gap-3 rounded-[14px] bg-white/15 px-4 py-2.5">
                  <span className="size-9 rounded-[9px] bg-white/25" />
                  <span className="h-8 w-px bg-white/25" />
                  <FileArchive className="size-9 text-white" strokeWidth={1.5} />
                  <MousePointer2 className="absolute -bottom-2 right-3 size-5 fill-white text-[#0b1230]" />
                </div>
              </div>
            }
          >
            Open <span className={em}>GNSIS for Mac.dmg</span> from your <span className={em}>Downloads</span> folder
          </Step>
          <Step
            n={2}
            art={
              <div className="flex size-full items-center justify-center gap-3 bg-[#ececef]">
                <img src={APP_ICON} alt="" width={64} height={64} className="size-16 rounded-[14px] shadow-btn" />
                <ArrowRight className="size-5 text-ink-3" />
                <span className="flex size-16 flex-col items-center justify-center rounded-[14px] bg-[#7cb8f2]">
                  <Folder className="size-8 fill-white/70 text-white" strokeWidth={1.5} />
                </span>
              </div>
            }
          >
            Drag the <span className={em}>GNSIS icon</span> into your <span className={em}>Applications</span> folder
          </Step>
          <Step
            n={3}
            art={
              <div className="flex size-full flex-col bg-white text-left">
                <p className="border-b border-line py-2 pl-8 pr-3 text-[14px] font-medium text-ink">Applications</p>
                <span className="mx-3 my-2.5 h-2 w-24 rounded-full bg-[#e3e5ea]" />
                <span className="relative flex items-center gap-2 bg-[#1a6ef5] px-3 py-2 text-[14px] font-medium text-white">
                  <img src={APP_ICON} alt="" width={22} height={22} className="size-[22px] rounded-[5px]" />
                  GNSIS
                  <MousePointer2 className="absolute right-6 top-4 size-5 fill-black text-white" />
                </span>
                <span className="mx-3 my-2.5 h-2 w-20 rounded-full bg-[#e3e5ea]" />
                <span className="mx-3 h-2 w-28 rounded-full bg-[#e3e5ea]" />
              </div>
            }
          >
            Open <span className={em}>GNSIS</span> from your <span className={em}>Applications</span> folder
          </Step>
        </ol>
        <p className="mt-10 text-center text-[14px] text-ink-2">
          Problem?{" "}
          <a href={MAC_DOWNLOAD_URL} className="font-medium text-signal-ink underline underline-offset-4">
            Download again
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
