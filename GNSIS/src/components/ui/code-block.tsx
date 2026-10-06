// Beautiful UI CodeBlock, MIT © 2026 Shane Levine. See THIRD_PARTY_NOTICES.md.
// Upstream highlighting, word diffs, gutters, header and wrapping are retained;
// demo defaults removed; Lucide, robust clipboard status and sizing added.
import { useEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react"
import { Check, ChevronDown, CodeXml, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CodePiece = { text: string; change?: "add" | "del" }
export type DiffRow = { old: number | null; cur: number | null; type: "ctx" | "add" | "del"; pieces: CodePiece[] }
export type CodeBlockLabels = { copy: string; copied: string }
const HATCH = "repeating-linear-gradient(45deg, var(--red) 0, var(--red) 1.5px, transparent 1.5px, transparent 3px)"
const KEYWORDS = new Set(["import", "from", "export", "default", "async", "function", "const", "let", "var", "await", "return", "if", "else", "for", "while", "new", "throw", "try", "catch", "null", "true", "false", "undefined"])
const TOKEN = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|\b\d+(?:\.\d+)?\b|\b(?:import|from|export|default|async|function|const|let|var|await|return|if|else|for|while|new|throw|try|catch|null|true|false|undefined)\b|[A-Za-z_$][\w$]*(?=\s*\())/g

function highlight(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let k = 0
  for (const m of text.matchAll(TOKEN)) {
    const idx = m.index ?? 0
    const t = m[0]
    if (idx > last) nodes.push(<span key={k++}>{text.slice(last, idx)}</span>)
    let color: string
    let weight: number | undefined
    if (/^["'`]/.test(t) || /^\d/.test(t)) color = "var(--orange)"
    else if (KEYWORDS.has(t)) color = "var(--accent-ink)"
    else { color = "var(--ink)"; weight = 500 }
    nodes.push(<span key={k++} style={{ color, fontWeight: weight }}>{t}</span>)
    last = idx + t.length
  }
  if (last < text.length) nodes.push(<span key={k++}>{text.slice(last)}</span>)
  return nodes
}

function Pieces({ pieces }: { pieces: CodePiece[] }) {
  return <>{pieces.map((p, i) => p.change ? (
    <span key={i} className="rounded-[3px]" style={{ background: `color-mix(in srgb, var(--${p.change === "add" ? "green" : "red"}) 18%, transparent)`, padding: "0 2px", margin: "0 -1px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{highlight(p.text)}</span>
  ) : <span key={i}>{highlight(p.text)}</span>)}</>
}

// The data-copy callback is not the figure's native clipboard event handler.
export type CodeBlockProps = Omit<ComponentProps<"figure">, "children" | "onCopy"> & {
  variant?: "Code" | "Diff"
  lines?: string[]
  code?: string
  diff?: DiffRow[]
  filename?: string
  language?: string
  labels?: Partial<CodeBlockLabels>
  onCopy?: (text: string) => void
  wrap?: boolean
  maxHeight?: CSSProperties["maxHeight"]
  collapsible?: boolean
  defaultExpanded?: boolean
  copyLabel?: string
}

export function CodeBlock({ variant = "Code", lines, code, diff = [], filename, language = "text", labels, onCopy, wrap = true, maxHeight = 320, collapsible = false, defaultExpanded = false, copyLabel = "Copy code", className, ...props }: CodeBlockProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle")
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const copyAttempt = useRef(0)
  useEffect(() => () => { clearTimeout(timeout.current); copyAttempt.current += 1 }, [])
  const isDiff = variant === "Diff"
  const text = { copy: "Copy", copied: "Copied", ...labels }
  const displayLines = lines ?? (code === undefined || code === "" ? [] : code.split("\n"))
  const raw = code ?? (isDiff ? diff.map((r) => `${r.type === "add" ? "+" : r.type === "del" ? "-" : " "}${r.pieces.map((p) => p.text).join("")}`).join("\n") : displayLines.join("\n"))
  const added = diff.filter((r) => r.type === "add").length
  const removed = diff.filter((r) => r.type === "del").length

  const copy = async () => {
    const attempt = ++copyAttempt.current
    clearTimeout(timeout.current)
    let succeeded = false
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable")
      await navigator.clipboard.writeText(raw)
      if (attempt !== copyAttempt.current) return
      setCopyState("copied")
      succeeded = true
    } catch {
      if (attempt !== copyAttempt.current) return
      setCopyState("error")
    }
    timeout.current = setTimeout(() => setCopyState("idle"), 1500)
    if (succeeded) onCopy?.(raw)
  }

  const codeClass = cn("pr-3 pl-1", wrap ? "break-words whitespace-pre-wrap" : "whitespace-pre")
  const content = (
    <div tabIndex={0} role="region" aria-label={`${filename ?? language} code`} className="overflow-auto py-3 font-mono text-[12.5px] leading-[1.65] text-ink-2" style={{ maxHeight }}>
      {isDiff ? <div className={cn("relative", !wrap && "w-max min-w-full")}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-5 w-px bg-line" />
        {diff.map((r, i) => {
          const add = r.type === "add"
          const del = r.type === "del"
          const num = del ? r.old : r.cur
          return <div key={i} className={`relative grid grid-cols-[20px_minmax(0,1fr)] items-start ${add ? "bg-green-tint" : del ? "bg-red-tint" : ""}`}>
            {(add || del) && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: add ? "var(--green)" : HATCH }} />}
            <span aria-hidden="true" className={`select-none text-center text-[11px] ${add ? "text-green" : del ? "text-red" : "text-ink-3"}`}>{num ?? ""}</span>
            <code className={codeClass}><span className="sr-only">{add ? "+ " : del ? "- " : ""}</span><Pieces pieces={r.pieces} /></code>
          </div>
        })}
      </div> : <div className={cn("relative", !wrap && "w-max min-w-full")}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-5 w-px bg-line" />
        {displayLines.map((line, i) => <div key={i} className="grid grid-cols-[20px_minmax(0,1fr)] items-start">
          <span aria-hidden="true" className="select-none text-center text-[11px] text-ink-3">{i + 1}</span>
          <code className={codeClass}>{highlight(line)}</code>
        </div>)}
      </div>}
    </div>
  )

  return (
    <figure data-slot="code-block" className={cn("m-0 min-w-0 w-full overflow-hidden rounded-card bg-surface shadow-card", className)} {...props}>
      <figcaption className="flex h-11 items-center gap-2 border-b border-line px-4 text-[12.5px]">
        <span className="inline-flex min-w-0 items-center gap-[7px]"><CodeXml className="size-[15px] shrink-0 text-ink-3" aria-hidden="true" /><span className="truncate font-mono leading-none text-ink">{filename ?? language}</span></span>
        {isDiff && <span className="ml-auto inline-flex items-center gap-2 font-mono text-[12px] leading-none tabular-nums"><span className="text-green">+{added}</span><span className="text-red">-{removed}</span></span>}
        <Button type="button" variant="quiet" size="xs" aria-label={copyLabel} onClick={() => void copy()} className={cn("-mr-1 ml-auto h-6 gap-1 rounded-chip px-1.5 text-[12px]", copyState === "copied" ? "text-green" : "text-ink-3 hover:text-ink")}>
          {copyState === "copied" ? <Check className="size-[11px]" aria-hidden="true" /> : <Copy className="size-[11px]" aria-hidden="true" />}
          {copyState === "copied" ? text.copied : text.copy}
        </Button>
      </figcaption>
      {collapsible ? <details open={defaultExpanded || undefined} className="group"><summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[12px] text-ink-2 [&::-webkit-details-marker]:hidden"><ChevronDown className="size-3.5 -rotate-90 transition-transform group-open:rotate-0" aria-hidden="true" />Code</summary>{content}</details> : content}
      <span className="sr-only" role="status">{copyState === "copied" ? "Code copied to clipboard." : copyState === "error" ? "Could not copy code. Select the code and copy it manually." : ""}</span>
    </figure>
  )
}

export default CodeBlock
