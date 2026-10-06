// Adapted from Beautiful UI (MIT, © 2026 Shane Levine): see ./LICENSE-beautiful-ui.txt.

import { useEffect, useState } from "react";

/**
 * Reveals `text` a few characters at a time, like a token stream: the newest
 * characters resolve out of a soft blur and the caret blinks once it settles.
 * Remount (change `key`) to replay.
 */
export function StreamText({
  text,
  charsPerTick = 2,
  tickMs = 24,
  blurTail = 6,
  className,
}: {
  text: string;
  charsPerTick?: number;
  tickMs?: number;
  blurTail?: number;
  className?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let shown = 0;
    const id = window.setInterval(() => {
      shown = Math.min(shown + charsPerTick, text.length);
      setCount(shown);
      if (shown >= text.length) window.clearInterval(id);
    }, tickMs);
    return () => window.clearInterval(id);
  }, [text, charsPerTick, tickMs]);

  const streaming = count < text.length;
  const shown = text.slice(0, count);
  const split = streaming ? Math.max(0, shown.length - blurTail) : shown.length;

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {shown.slice(0, split)}
        {split < shown.length && <span className="bui-stream-tail">{shown.slice(split)}</span>}
        <span className={streaming ? "bui-stream-caret is-streaming" : "bui-stream-caret"} />
      </span>
    </span>
  );
}
