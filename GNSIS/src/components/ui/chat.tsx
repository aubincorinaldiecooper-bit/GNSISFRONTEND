// Source-derived sections of Beautiful UI ChatComposer.tsx, MIT © Shane Levine.
// Header → conversation (right user bubble / unboxed reply sections) → composer.
// No scripted messages, flavor tabs, fake actions or reply timers. See provenance.
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

export type ChatPanelProps = ComponentProps<"section"> & { header?: ReactNode }
export function ChatPanel({ header, children, className, "aria-label": label = "Chat", ...props }: ChatPanelProps) {
  return (
    <section aria-label={label} data-slot="chat-panel" className={cn("flex min-h-0 w-full flex-col self-start overflow-hidden rounded-window bg-surface shadow-card", className)} {...props}>
      {header && <div data-slot="chat-header" className="flex shrink-0 items-center justify-between border-b border-line p-1.5">{header}</div>}
      {children}
    </section>
  )
}

export type ChatMessageListProps = ComponentProps<"section"> & { spacing?: "compact" | "comfortable" }
export function ChatMessageList({ className, spacing = "compact", "aria-label": label = "Conversation", ...props }: ChatMessageListProps) {
  return <section data-slot="chat-message-list" role="log" aria-label={label} aria-live="polite" aria-relevant="additions text" aria-atomic={false} className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-3 pt-2.5 pb-1", spacing === "compact" ? "gap-2.5" : "gap-4", className)} {...props} />
}

export type ChatMessageProps = ComponentProps<"article"> & { speaker: "user" | "assistant"; avatar?: ReactNode }
export function ChatMessage({ speaker, avatar, children, className, "aria-label": label = speaker === "user" ? "Your message" : "Assistant message", ...props }: ChatMessageProps) {
  return (
    <article data-slot="chat-message" data-speaker={speaker} aria-label={label} className={cn("flex min-w-0 gap-2", speaker === "user" ? "justify-end pl-14" : "w-full flex-col", className)} {...props}>
      {avatar && <div className="shrink-0" aria-hidden="true">{avatar}</div>}
      {children}
    </article>
  )
}

export type ChatMessageBubbleProps = ComponentProps<"div"> & { tone?: "filled" | "subtle" | "plain"; metadata?: ReactNode }
export function ChatMessageBubble({ tone = "subtle", metadata, children, className, ...props }: ChatMessageBubbleProps) {
  return (
    <div data-slot="chat-message-bubble" data-tone={tone} className={cn("min-w-0 text-[13px] leading-[1.4] text-ink", tone !== "plain" && "rounded-xl bg-field px-3 py-1.5", className)} {...props}>
      <div className="break-words whitespace-pre-wrap">{children}</div>
      {metadata && <div className="mt-1.5 text-[12px] text-ink-2">{metadata}</div>}
    </div>
  )
}

/* The upstream Section — unboxed assistant step metadata followed by reply body.
 * Body can be rich caller data, not an embedded demo response. */
export type ChatReplyProps = ComponentProps<"div"> & {
  label?: string; sub?: string; time?: string; body?: ReactNode; resolving?: boolean
}
export function ChatReply({ label, sub, time, body, resolving, children, className, style, ...props }: ChatReplyProps) {
  return (
    <div data-slot="chat-reply" aria-busy={resolving || undefined} className={cn("flex w-full flex-col gap-1.5 transition-[opacity,filter,transform] duration-400", className)}
      style={{ opacity: resolving ? 0.55 : 1, filter: resolving ? "blur(0.5px)" : "blur(0)", transform: resolving ? "scale(0.985)" : "scale(1)", transformOrigin: "top left", transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)", animation: "fade-up 400ms cubic-bezier(0.23,1,0.32,1) both", ...style }} {...props}>
      {(label || sub || time) && <div className="flex flex-wrap items-center gap-1 text-[12px] leading-[1.3]">
        {label && <span className="font-medium text-ink">{label}</span>}
        {sub && <span className="text-ink-2">{sub}</span>}
        {time && <span className="text-ink">for {time}</span>}
      </div>}
      <div className="text-[13px] leading-normal text-ink">{body ?? children}</div>
    </div>
  )
}

export function ChatSystemMessage({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="chat-system-message" role="status" className={cn("py-2 text-center text-[12px] leading-normal text-ink-2", className)} {...props} />
}
