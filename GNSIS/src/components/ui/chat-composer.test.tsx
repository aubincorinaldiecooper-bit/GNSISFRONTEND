import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChatComposer } from "./chat-composer";

function Harness({ onSubmit, loading = false, hideSubmit = false }: { onSubmit: (value: string) => void; loading?: boolean; hideSubmit?: boolean }) {
  const [value, setValue] = useState("");
  return <ChatComposer value={value} onValueChange={setValue} onSubmit={onSubmit} label="Follow-up message" loading={loading} hideSubmit={hideSubmit} />;
}

describe("ChatComposer", () => {
  it("submits trimmed text on Enter and inserts a newline on Shift+Enter", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    const box = screen.getByLabelText("Follow-up message");
    await user.type(box, "first{Shift>}{Enter}{/Shift}second ");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(box).toHaveValue("first\nsecond ");

    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("first\nsecond");
    // The caller owns the draft; a submit never clears it on its own.
    expect(box).toHaveValue("first\nsecond ");
  });

  it("hides the submit button and still submits trimmed text on Enter", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} hideSubmit />);

    const box = screen.getByLabelText("Follow-up message");
    expect(screen.queryByRole("button")).toBeNull();
    await user.type(box, "  find a clip  ");
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("find a clip");
  });

  it("disables the send control while empty or loading", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Harness onSubmit={onSubmit} />);

    const send = screen.getByRole("button", { name: "Send message" });
    expect(send).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Follow-up message"), "hello");
    expect(send).toBeEnabled();

    rerender(<Harness onSubmit={onSubmit} loading />);
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(screen.getByLabelText("Follow-up message")).toBeDisabled();
  });

  it("keeps disabled and externally blocked drafts, and ignores repeated Enter", () => {
    const onSubmit = vi.fn();
    const onValueChange = vi.fn();
    const props = { value: "kept draft", onValueChange, onSubmit, label: "Message" };
    const { rerender } = render(<ChatComposer {...props} submitDisabled />);
    const box = screen.getByLabelText("Message");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(box).toHaveValue("kept draft");
    expect(box).toBeEnabled();

    rerender(<ChatComposer {...props} disabled />);
    expect(box).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();

    rerender(<ChatComposer {...props} />);
    fireEvent.keyDown(box, { key: "Enter", repeat: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("kept draft");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("rejects whitespace and respects caller keyboard handlers", () => {
    const onSubmit = vi.fn();
    const props = { value: "  \n  ", onValueChange: vi.fn(), onSubmit, label: "Message" };
    const { rerender } = render(<ChatComposer {...props} />);
    fireEvent.keyDown(screen.getByLabelText("Message"), { key: "Enter" });
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
    rerender(<ChatComposer {...props} value="hello" textareaProps={{ onKeyDown: (event) => event.preventDefault() }} />);
    fireEvent.keyDown(screen.getByLabelText("Message"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders real footer/model slots without fake default content", () => {
    render(<ChatComposer value="" onValueChange={vi.fn()} onSubmit={vi.fn()} label="Message" modelPicker={<button type="button">Model picker</button>} footer={<span>Demo only</span>} textareaProps={{ rows: 3, "aria-describedby": "notice" }} />);
    expect(screen.getByRole("button", { name: "Model picker" })).toBeVisible();
    expect(screen.getByText("Demo only")).toBeVisible();
    expect(screen.getByLabelText("Message")).toHaveAttribute("rows", "3");
    expect(screen.getByLabelText("Message")).toHaveValue("");
    expect(screen.queryByText(/mint chip|Flavors|Suppliers/)).not.toBeInTheDocument();
  });

  it("does not submit an Enter that commits an IME composition", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    const box = screen.getByLabelText("Follow-up message");
    await user.type(box, "日本");
    fireEvent.compositionStart(box);
    fireEvent.keyDown(box, { key: "Enter" });
    fireEvent.compositionEnd(box);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: "Enter", keyCode: 229 });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("日本");
  });

  it("renders the pill variant as one row with a leading slot and a round send", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <ChatComposer
        variant="pill"
        value="slow Saturday"
        onValueChange={() => {}}
        onSubmit={onSubmit}
        label="Search"
        submitLabel="Find"
        leading={<svg data-testid="leading" />}
      />,
    );
    const form = screen.getByRole("textbox", { name: "Search" }).closest("form");
    expect(form).toHaveAttribute("data-variant", "pill");
    expect(form?.firstElementChild?.nextElementSibling).toBe(screen.getByTestId("leading"));
    expect(form?.className).toMatch(/rounded-full/);
    await user.click(screen.getByRole("button", { name: "Find" }));
    expect(onSubmit).toHaveBeenCalledWith("slow Saturday");
  });
});
