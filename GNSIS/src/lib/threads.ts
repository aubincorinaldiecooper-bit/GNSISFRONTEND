// Pure, deterministic helpers for conversational run threads. Kept out of the
// component file so they can be unit-tested directly and so App.tsx stays a
// components-only module (React Fast Refresh requirement).

// A thread's title, derived deterministically from its first instruction — never
// a model call. Sentence-cased first non-empty line, collapsed whitespace,
// truncated with an ellipsis.
export function threadTitle(firstInstruction: string): string {
  const firstLine =
    (firstInstruction || "")
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  const collapsed = firstLine.replace(/\s+/g, " ").trim();
  if (!collapsed) return "Untitled run";
  const cased = collapsed.charAt(0).toUpperCase() + collapsed.slice(1);
  const LIMIT = 72;
  return cased.length > LIMIT ? `${cased.slice(0, LIMIT - 1).trimEnd()}…` : cased;
}

// A quiet, deterministic relative time — "just now", "5 minutes ago",
// "2 hours ago", "yesterday", then a localized date — from an ISO timestamp.
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.round((now - then) / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return "yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// The full localized datetime, for the timestamp's hover tooltip.
export function fullDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}
