import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Combobox, type ComboboxOption } from "@/components/Combobox";

const options: ComboboxOption[] = [
  { value: "owner/alpha", label: "owner/alpha", keywords: ["owner", "alpha"] },
  { value: "owner/beta", label: "owner/beta", keywords: ["owner", "beta"] },
];

function Controlled({ initial = null as string | null }: { initial?: string | null }) {
  const [value, setValue] = useState(initial);
  return (
    <Combobox
      ariaLabel="Repository"
      options={options}
      value={value}
      onChange={setValue}
      placeholder="Select repository"
      searchPlaceholder="Search repositories…"
      emptyText="No matching repositories."
    />
  );
}

describe("Combobox", () => {
  it("shows the placeholder until a value is selected", () => {
    render(<Controlled />);
    expect(screen.getByRole("combobox", { name: "Repository" })).toHaveTextContent("Select repository");
  });

  it("opens on click and lists the provided options", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(screen.getByRole("combobox", { name: "Repository" }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "owner/alpha" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "owner/beta" })).toBeInTheDocument();
  });

  it("filters options by the search query, matching label and keywords", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(screen.getByRole("combobox", { name: "Repository" }));
    await user.type(screen.getByLabelText("Search repositories…"), "beta");

    expect(screen.queryByRole("option", { name: "owner/alpha" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "owner/beta" })).toBeInTheDocument();
  });

  it("selecting an option calls onChange with its value and closes the dropdown", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(screen.getByRole("combobox", { name: "Repository" }));
    await user.click(screen.getByRole("option", { name: "owner/beta" }));

    expect(screen.getByRole("combobox", { name: "Repository" })).toHaveTextContent("owner/beta");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("cannot be driven by free text — a query matching nothing offers no way to select it", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Combobox
        ariaLabel="Repository"
        options={options}
        value={null}
        onChange={onChange}
        emptyText="No matching repositories."
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Repository" }));
    const search = screen.getByRole("listbox").querySelector("input")!;
    await user.type(search, "some/repo-the-user-typed-by-hand");

    expect(screen.getByText("No matching repositories.")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    // Pressing Enter has nothing to submit — there's no free-text commit path.
    await user.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Controlled />
        <button type="button">outside</button>
      </div>,
    );

    await user.click(screen.getByRole("combobox", { name: "Repository" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("disables the trigger and shows a loading label while loading", () => {
    render(
      <Combobox
        ariaLabel="Branch"
        options={[]}
        value={null}
        onChange={() => {}}
        loading
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Branch" });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent("Loading…");
  });

  it("disables the trigger when disabled is set", () => {
    render(
      <Combobox
        ariaLabel="Branch"
        options={[]}
        value={null}
        onChange={() => {}}
        disabled
      />,
    );

    expect(screen.getByRole("combobox", { name: "Branch" })).toBeDisabled();
  });
});
