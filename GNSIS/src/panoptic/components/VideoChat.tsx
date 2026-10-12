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
type Turn = { id: number; question: string; picks: Pick[]; pending: boolean };

const REPLY_DELAY = 700;

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

function asText(turn: Turn) {
  return turn.picks.map(({ source, moment }) => `${source.name} (${source.platform}, ${formatTime(moment.start)}): ${moment.why}`).join("\n");
}

export function VideoChat({
  query,
  list,
  showTitle = true,
  className,
}: {
  query: string;
  list: readonly Source[];
  showTitle?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>(() => [
    { id: 0, question: query, picks: pickMoments(query, list), pending: false },
  ]);
  const waiting = turns.some((t) => t.pending);

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(
      () => setTurns((current) => current.map((t) => (t.pending ? { ...t, pending: false } : t))),
      reduce ? 0 : REPLY_DELAY,
    );
    return () => clearTimeout(timer);
  }, [waiting, reduce]);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    setTurns((current) => [...current, { id: current.length, question: text, picks: pickMoments(text, list), pending: true }]);
    setDraft("");
  };

  return (
    <section
      aria-label="Ask about these videos"
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-background", className)}
    >
      {showTitle && <h2 className="px-4 pt-4 text-sm font-medium text-foreground">Ask about these videos</h2>}
      <MessageScroller label="Conversation about these videos" busy={waiting} className="min-h-0 flex-1" contentClassName="px-4 py-3">
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
                  {turn.pending ? (
                    <MessageTyping label="Finding moments" className="text-muted-foreground" />
                  ) : (
                    <StreamingResponse status="complete" copyText={asText(turn)} sources={asCitations(turn.picks)} announce={turn.id > 0}>
                      <p>{turn.id === 0 ? "Start with these moments:" : "These moments fit best:"}</p>
                      <ul>
                        {turn.picks.map(({ source, moment }) => (
                          <li key={`${source.id}-${moment.start}`}>
                            <a href={originalUrl(source, moment)} target="_blank" rel="noopener noreferrer">{source.name}</a>
                            {` at ${formatTime(moment.start)}. ${moment.why}`}
                          </li>
                        ))}
                      </ul>
                    </StreamingResponse>
                  )}
                </MessageContent>
              </Message>
            </Fragment>
          ))}
        </MessageGroup>
      </MessageScroller>
      <ChatComposer
        className="m-3 mt-0"
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
    </section>
  );
}
