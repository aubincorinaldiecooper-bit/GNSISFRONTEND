import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Extra text matched by the search box (e.g. owner, full name). */
  keywords?: string[];
  /** Right-aligned secondary text (e.g. "private", the default branch). */
  hint?: ReactNode;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  ariaLabel: string;
  /** Optional leading icon rendered inside the trigger (e.g. a repo/branch glyph). */
  icon?: ReactNode;
}

/**
 * A small, self-contained searchable single-select. Deliberately does NOT use a
 * portal (Radix Popover) so it renders in the same DOM subtree — reliable to
 * drive in jsdom tests and simple to reason about. Filtering is local over the
 * provided options; callers load the options (enabled repos, branches, models).
 *
 * Because the dropdown is absolutely positioned (not a portal), no ANCESTOR may
 * clip it with `overflow-hidden` — the composer card is deliberately
 * `overflow-visible` for exactly this reason. The dropdown is at least the
 * trigger width, may grow to fit long option labels, is capped to the viewport,
 * and auto-anchors to the right edge when the trigger sits in the right half of
 * the screen so it never runs off-screen.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  disabled,
  loading,
  className,
  ariaLabel,
  icon,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [alignRight, setAlignRight] = useState(false);
  const [menuMaxWidth, setMenuMaxWidth] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${(o.keywords ?? []).join(" ")}`.toLowerCase().includes(q),
    );
  }, [options, query]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // When opening, anchor the dropdown to whichever edge keeps it on-screen and
  // cap its width to the space actually available from that edge, so a long
  // option label can widen the list on desktop but never pushes it off-screen
  // (which would cause horizontal scroll) on a narrow viewport. Uses
  // documentElement.clientWidth so the cap excludes any scrollbar.
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth || window.innerWidth || 0;
    if (vw <= 0) return;
    const margin = 12; // keep a gutter to the viewport edge
    const right = rect.left > vw * 0.5;
    setAlignRight(right);
    // Available room from the anchored edge to the viewport gutter. Cap the
    // menu at the smaller of the preferred 24rem and that room; min-w-full
    // still guarantees it is never narrower than the trigger itself. Floor to
    // avoid a sub-pixel rounding up that would nudge the edge off-screen.
    const available = right ? rect.right - margin : vw - rect.left - margin;
    setMenuMaxWidth(Math.floor(Math.min(384, available)));
  }, [open]);

  return (
    <div className="relative w-full min-w-0" ref={rootRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <Button variant="secondary"
        ref={triggerRef}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled || loading}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-9 w-full min-w-0 rounded-control px-3",
          className,
        )}
      >
        {icon ? (
          <span className="shrink-0 text-muted-foreground/70">{icon}</span>
        ) : null}
        <span className={cn("min-w-0 flex-1 truncate text-left", !selected && "text-muted-foreground")}>
          {loading ? "Loading…" : selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
      </Button>

      {open && !loading && (
        <div
          className={cn(
            "absolute z-50 mt-1 min-w-full w-max rounded-card bg-surface text-ink shadow-overlay",
            alignRight ? "right-0" : "left-0",
          )}
          style={{
            // Precise px cap once measured; the CSS min() is the pre-measure
            // fallback so the very first painted frame is never off-screen.
            maxWidth:
              menuMaxWidth !== null ? `${menuMaxWidth}px` : "min(24rem, calc(100vw - 1rem))",
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
              event.preventDefault();
              return;
            }
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            if ((event.key === "Home" || event.key === "End") && event.target instanceof HTMLInputElement) return;
            const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
            if (!items.length) return;
            event.preventDefault();
            const index = items.indexOf(document.activeElement as HTMLButtonElement);
            const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
              : event.key === "ArrowDown" ? (index + 1) % items.length : (index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length);
            items[next].focus();
          }}
        >
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="rounded-b-none"
          />
          <div className="max-h-56 overflow-auto py-1" role="listbox" id={listId} aria-label={`${ariaLabel} options`}>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">{emptyText}</div>
            ) : (
              filtered.map((o) => (
                <Button variant="quiet"
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={value === o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                    triggerRef.current?.focus();
                  }}
                  className="w-full justify-start rounded-chip px-3 py-1.5 text-left text-sm focus-visible:bg-hover"
                >
                  <Check aria-hidden="true" className={cn("h-4 w-4 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint ? (
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">{o.hint}</span>
                  ) : null}
                </Button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
