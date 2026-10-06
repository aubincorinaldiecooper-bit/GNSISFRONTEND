// @vitest-environment node
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"
import { describe, expect, it } from "vitest"

const root = fileURLToPath(new URL("../../../", import.meta.url))

describe("Beautiful UI Tailwind v4 foundation", () => {
  it("compiles actual application CSS with upstream and migration utilities", async () => {
    const path = `${root}src/index.css`
    const css = readFileSync(path, "utf8") + '\n@source inline("bg-background text-foreground border-border bg-muted rounded-control rounded-card rounded-window shadow-card shadow-overlay bg-accent text-accent-ink");'
    const result = await postcss([tailwind({ base: root })]).process(css, { from: path })
    expect(result.warnings()).toHaveLength(0)
    expect(result.css).toContain("background-color: var(--page)")
    expect(result.css).toContain("color: var(--ink)")
    expect(result.css).toContain("border-color: var(--line)")
    expect(result.css).toContain("background-color: var(--field)")
    expect(result.css).toContain("background-color: var(--accent)")
    expect(result.css).toContain("--radius-control: 8px")
    expect(result.css).toContain("--radius-card: 10px")
    expect(result.css).toContain("--radius-window: 14px")
    expect(result.css).toContain("--shadow-card:")
    expect(result.css).toContain("@keyframes fade-up")
    expect(result.css).toContain("@keyframes pop-in")
    expect(result.css).toContain("prefers-reduced-motion")
    expect(result.css).not.toContain("hsl(var(--accent))")
  })
})
