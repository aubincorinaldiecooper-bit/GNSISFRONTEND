import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CodeBlock } from "./code-block"

afterEach(() => vi.unstubAllGlobals())

describe("Beautiful CodeBlock controlled data", () => {
  it("renders no upstream demo code when data is absent", () => {
    const { container } = render(<CodeBlock />)
    expect(container.querySelectorAll("code")).toHaveLength(0)
    expect(screen.queryByText(/churn|flavor|pistachio/)).not.toBeInTheDocument()
  })

  it("derives highlighted lines from raw code and copies exact formatting", async () => {
    const code = 'export function realData() {\n  return "caller data";\n}\n'
    const writeText = vi.fn().mockResolvedValue(undefined)
    const onCopy = vi.fn<(text: string) => void>()
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    const { container } = render(<CodeBlock code={code} filename="real.ts" maxHeight={180} wrap={false} onCopy={onCopy} />)
    expect(container.querySelectorAll("code")).toHaveLength(4)
    expect(screen.getByRole("region", { name: "real.ts code" })).toHaveStyle({ maxHeight: "180px" })
    expect(container.querySelector("code")).toHaveClass("whitespace-pre")
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }))
    await waitFor(() => expect(onCopy).toHaveBeenCalledExactlyOnceWith(code))
    expect(writeText).toHaveBeenCalledExactlyOnceWith(code)
    expect(screen.getByRole("status")).toHaveTextContent("Code copied to clipboard.")
  })

  it("retains line input and reports failed copying without success callbacks", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"))
    const onCopy = vi.fn<(text: string) => void>()
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    render(<CodeBlock lines={["let first = 1;", "", "return first;"]} onCopy={onCopy} />)
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }))
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Could not copy code."))
    expect(writeText).toHaveBeenCalledWith("let first = 1;\n\nreturn first;")
    expect(onCopy).not.toHaveBeenCalled()
    expect(screen.queryByText("Copied")).not.toBeInTheDocument()
  })

  it("renders caller diff rows and accessible addition/removal stats", () => {
    render(<CodeBlock variant="Diff" diff={[
      { old: 1, cur: null, type: "del", pieces: [{ text: "old", change: "del" }] },
      { old: null, cur: 1, type: "add", pieces: [{ text: "new", change: "add" }] },
    ]} />)
    expect(screen.getByText("old")).toBeVisible()
    expect(screen.getByText("new")).toBeVisible()
    expect(screen.getByText("+1")).toBeVisible()
    expect(screen.getByText("-1")).toBeVisible()
  })
})
