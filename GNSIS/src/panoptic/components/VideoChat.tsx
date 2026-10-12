// Follow-up questions about the current results, built from beUI's Message,
// MessageBubble, MessageScroller and StreamingResponse. Answers are composed
// from the matched moments' own descriptions; there is no model behind it yet.
import { Fragment, useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Message, MessageContent, MessageGroup, MessageTyping } from "@/components/agents/message";
import { MessageBubble, MessageBubbleContent } from "@/components/agents/message-bubble";
import { MessageScroller } from "@/components/agents/message-scroller";
import { StreamingResponse } from "@/components/agents/streaming-response";
import type { CitationItem } from "@/components/agents/citations";
import { ChatComposer } from "@/components/ui/chat-composer";
import { cn } from "@/lib/utils";
import { formatTime, originalUrl, type Moment, type Source } from "../moments/model";

type Pick = { source: Source; moment: Moment };
type Status = "pending" | "streaming" | "complete";
type Turn = { id: number; question: string; picks: Pick[]; status: Status; shown: number };
/** One word of an answer: which block it belongs to, and the link it sits in. */
type Piece = { block: number; text: string; href?: string };

const THINK_DELAY = 450;
const TICK = 40;
const WORDS_PER_TICK = 3;

function pickMoments(question: string, list: readonly Source[], count = 3): Pick[] {
  const tokens = question.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  const scored = list.flatMap((source) =>
    source.moments.map((moment) => {
      const text = `${source.name} ${moment.title} ${moment.why} ${moment.caption ?? ""}`.toLowerCase();
      return { source, moment, score: tokens.filter((t) => text.includes(t)).length };
    }),
  );
  scored.sort((a, b) => b.score - a.score);
  const picks: Pick[] = [];
  for (const item of scored) {
    if (picks.some((p) => p.source.id === item.source.id)) continue;
    picks.push(item);
    if (picks.length === count) break;
  }
  return picks;
}

function asCitations(picks: Pick[]): CitationItem[] {
  return picks.map(({ source, moment }) => ({
    id: `${source.id}-${moment.start}`,
    title: source.name,
    domain: `${source.platform} · ${formatTime(moment.start)}`,
    url: originalUrl(source, moment),
  }));
}

function intro(turn: Turn) {
  return turn.id === 0 ? "Start with these moments:" : "These moments fit best:";
}

function asText(turn: Turn) {
  return [intro(turn), ...turn.picks.map(({ source, moment }) => `${source.name} (${source.platform}, ${formatTime(moment.start)}): ${moment.why}`)].join("\n");
}

function asPieces(turn: Turn): Piece[] {
  const words = (block: number, text: string, href?: string) =>
    text.split(" ").filter(Boolean).map((word) => ({ block, text: word, href }));
  return [
    ...words(0, intro(turn)),
    ...turn.picks.flatMap(({ source, moment }, i) => [
      ...words(i + 1, source.name, originalUrl(source, moment)),
      ...words(i + 1, `at ${formatTime(moment.start)}. ${moment.why}`),
    ]),
  ];
}

/** Renders the first `shown` words, keeping each link's words inside one anchor. */
function Answer({ pieces, shown }: { pieces: Piece[]; shown: number }) {
  const blocks = new Map<number, Piece[][]>();
  for (const piece of pieces.slice(0, shown)) {
    const runs = blocks.get(piece.block) ?? [];
    const last = runs[runs.length - 1];
    if (last && last[0].href === piece.href) last.push(piece);
    else runs.push([piece]);
    blocks.set(piece.block, runs);
  }
  const render = (runs: Piece[][]) =>
    runs.map((run, i) => {
      const text = run.map((p) => p.text).join(" ");
      const spaced = i > 0 ? ` ${text}` : text;
      return run[0].href ? (
        <Fragment key={i}>{i > 0 && " "}<a href={run[0].href} target="_blank" rel="noopener noreferrer">{text}</a></Fragment>
      ) : <Fragment key={i}>{spaced}</Fragment>;
    });
  const items = [...blocks.entries()].filter(([block]) => block > 0);
  return (
    <>
      {blocks.has(0) && <p>{render(blocks.get(0)!)}</p>}
      {items.length > 0 && <ul>{items.map(([block, runs]) => <li key={block}>{render(runs)}</li>)}</ul>}
    </>
  );
}

export function VideoChat({
  query,
  list,
  className,
}: {
  query: string;
  list: readonly Source[];
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>(() => [
    { id: 0, question: query, picks: pickMoments(query, list), status: "streaming", shown: 0 },
  ]);
  const active = turns.find((t) => t.status !== "complete");
  const waiting = active !== undefined;

  // Reveal the active answer a few words at a time, after a short "thinking" beat.
  useEffect(() => {
    if (!active) return;
    const total = asPieces(active).length;
    const timer = setTimeout(
      () =>
        setTurns((current) =>
          current.map((t) => {
            if (t.id !== active.id) return t;
            if (reduce) return { ...t, status: "complete", shown: total };
            if (t.status === "pending") return { ...t, status: "streaming" };
            const shown = Math.min(total, t.shown + WORDS_PER_TICK);
            return { ...t, shown, status: shown >= total ? "complete" : "streaming" };
          }),
        ),
      reduce ? 0 : active.status === "pending" ? THINK_DELAY : TICK,
    );
    return () => clearTimeout(timer);
  }, [active, reduce]);

  const retry = (id: number) =>
    setTurns((current) => current.map((t) => (t.id === id ? { ...t, status: "streaming", shown: 0 } : t)));

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    setTurns((current) => [...current, { id: current.length, question: text, picks: pickMoments(text, list), status: "pending", shown: 0 }]);
    setDraft("");
  };

  return (
    <section
      aria-label="Ask about these videos"
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background", className)}
    >
      <MessageScroller
        label="Conversation about these videos"
        busy={waiting}
        className="min-h-0 flex-1"
        viewportClassName="px-3 py-4"
        contentClassName="min-h-full"
      >
        <MessageGroup spacing="default">
          {turns.map((turn) => (
            <Fragment key={turn.id}>
              <Message from="user" animateIn={turn.id > 0}>
                <MessageContent>
                  <MessageBubble variant="solid" animateIn={turn.id > 0}>
                    <MessageBubbleContent>{turn.question}</MessageBubbleContent>
                  </MessageBubble>
                </MessageContent>
              </Message>
              <Message from="assistant">
                <MessageContent>
                  {turn.status === "pending" ? (
                    <MessageTyping label="Finding moments" className="text-muted-foreground" />
                  ) : (
                    <StreamingResponse
                      status={turn.status}
                      copyText={asText(turn)}
                      onRetry={waiting ? undefined : () => retry(turn.id)}
                      sources={asCitations(turn.picks)}
                      announce={turn.id > 0}
                    >
                      <Answer pieces={asPieces(turn)} shown={turn.shown} />
                    </StreamingResponse>
                  )}
                </MessageContent>
              </Message>
            </Fragment>
          ))}
        </MessageGroup>
      </MessageScroller>
      <div className="shrink-0 border-t border-border/60 p-2">
        <ChatComposer
        className="border-0 bg-muted shadow-none focus-within:border-transparent"
        variant="pill"
        value={draft}
        onValueChange={setDraft}
        onSubmit={ask}
        label="Ask a follow-up"
        placeholder="Ask a follow-up…"
        submitLabel="Send question"
        disabled={waiting}
        textareaProps={{ rows: 1, autoComplete: "off", enterKeyHint: "send" }}
        />
      </div>
    </section>
  );
}
