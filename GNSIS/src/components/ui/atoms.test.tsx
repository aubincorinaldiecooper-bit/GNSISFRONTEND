import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingState } from "./loading-state";
import { StatusPill } from "./status-pill";

describe("StatusPill", () => {
  it("keeps upstream tone classes and can drop the dot", () => {
    const { container, rerender } = render(<StatusPill tone="green">Live</StatusPill>);
    const pill = screen.getByText("Live");
    expect(pill.className).toContain("bg-green-tint text-green");
    expect(pill.querySelector("[aria-hidden]")).not.toBeNull();
    rerender(<StatusPill dot={false}>Best match</StatusPill>);
    expect(container.querySelector("[aria-hidden]")).toBeNull();
    expect(screen.getByText("Best match").className).toContain("bg-inset text-ink-2");
  });
});

describe("LoadingState", () => {
  it("can hide the visible label without removing the status announcement", () => {
    render(<LoadingState label="Finding your moments" hideLabel elapsed={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Finding your moments");
    expect(screen.getByText("Finding your moments")).toHaveClass("sr-only");
    expect(screen.getByRole("status").querySelectorAll("[aria-hidden] > span")).toHaveLength(9);
  });

  it("is a status region with the caller's label and an optional timer", () => {
    const { rerender } = render(<LoadingState label="Finding your moments" elapsed={false} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Finding your moments");
    expect(status.querySelector(".font-mono")).toBeNull();
    expect(status.querySelectorAll("[aria-hidden] > span")).toHaveLength(9);
    rerender(<LoadingState label="Working" variant="Orbit" />);
    expect(screen.getByRole("status").querySelector(".font-mono")).toHaveTextContent(/s$/);
  });
});
