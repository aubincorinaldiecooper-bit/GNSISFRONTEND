import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { STUDIO_PATHS } from "../config";
import { LISTED_MODELS } from "../models";
import { StudioDropdown } from "./StudioDropdown";
import { StudioDropdownRow } from "./StudioDropdownRow";

const rowClass =
  "group relative z-10 flex items-center gap-3 rounded-control px-2.5 py-2.5 outline-none focus-visible:outline-none";

const rowArrow =
  "size-4 shrink-0 text-ink-3 opacity-0 -translate-x-1 transition-[opacity,transform] duration-200 ease-out-strong group-hover:opacity-100 group-hover:translate-x-0 group-data-[highlighted]:opacity-100 group-data-[highlighted]:translate-x-0";

/** "Models" in the nav: a dropdown to every model, rows sharing one gliding highlight. */
export function ModelsMenu() {
  return (
    <StudioDropdown label="Models" eyebrow="GNSIS models" triggerClassName="px-2 sm:px-3.5">
      {LISTED_MODELS.map((model, index) => (
        <DropdownMenu.Item key={model.id} asChild>
          <StudioDropdownRow
            modelId={model.id}
            title={model.name}
            subtitle={model.tagline}
            index={index}
            to={model.href}
          />
        </DropdownMenu.Item>
      ))}
      <div aria-hidden className="mx-2.5 my-1 h-px bg-line" />
      <DropdownMenu.Item asChild>
        <Link to={STUDIO_PATHS.models} data-menu-row className={cn(rowClass, "py-2 text-[13px] text-ink-2 data-[highlighted]:text-ink")}>
          <LayoutGrid aria-hidden className="size-4 text-ink-3" />
          <span className="flex-1">All models</span>
          <ArrowRight aria-hidden className={rowArrow} />
        </Link>
      </DropdownMenu.Item>
    </StudioDropdown>
  );
}
