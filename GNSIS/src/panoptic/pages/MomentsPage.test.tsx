import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import PanopticSite from "../Site";
import MomentsPage from "./MomentsPage";

// jsdom has no PointerEvent, so fireEvent.pointer* would drop the coordinates
// and pointer fields the swipe handler reads.
if (!("PointerEvent" in window)) {
  class PointerEventStandIn extends MouseEvent {
    readonly pointerId: number;
    readonly isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  Object.defineProperty(window, "PointerEvent", { value: PointerEventStandIn, configurable: true });
}

afterEach(() => {
  delete window.__GNSIS_CONFIG__;
  document.head.querySelectorAll('meta[name="robots"], meta[name="description"]').forEach((m) => m.remove());
});

async function openResults() {
  window.__GNSIS_CONFIG__ = { VITE_HOME_EXPERIENCE: "live" };
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/video-search"]}>
      <Routes>
        <Route element={<PanopticSite />}>
          <Route path="/video-search" element={<MomentsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole("button", { name: "Find moments" }));
  const card = await screen.findByRole("article", { name: /Video moments/ });
  return { user, card };
}

function swipe(target: HTMLElement, from: [number, number], to: [number, number]) {
  const base = { pointerId: 1, isPrimary: true, button: 0 };
  act(() => {
    fireEvent.pointerDown(target, { ...base, clientX: from[0], clientY: from[1] });
    fireEvent.pointerMove(target, { ...base, clientX: (from[0] + to[0]) / 2, clientY: (from[1] + to[1]) / 2 });
    fireEvent.pointerUp(target, { ...base, clientX: to[0], clientY: to[1] });
  });
}

function pressedMoment(card: HTMLElement) {
  const bars = within(within(card).getByRole("group", { name: "Matched moments in this source" })).getAllByRole("button");
  return bars.findIndex((bar) => bar.getAttribute("aria-pressed") === "true");
}

describe("the Video Search landing", () => {
  it("is kept out of search engines while the Panoptic pages are dormant", async () => {
    await openResults();
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  });

  it("swipes up for the next source and left for the next moment in it", async () => {
    const { card } = await openResults();
    expect(within(card).getByText("Field notes")).toBeInTheDocument();

    swipe(card, [160, 370], [160, 190]);
    expect(within(card).getByText("Outside hours")).toBeInTheDocument();
    expect(pressedMoment(card)).toBe(0);

    swipe(card, [270, 300], [90, 300]);
    expect(within(card).getByText("Outside hours")).toBeInTheDocument();
    expect(pressedMoment(card)).toBe(1);
    expect(within(card).getByText("1:01–1:16")).toBeInTheDocument();

    swipe(card, [160, 190], [160, 370]);
    expect(within(card).getByText("Field notes")).toBeInTheDocument();
  });

  it("swipes even when the drag starts on the play button, which a tap still presses", async () => {
    const { user, card } = await openResults();
    const play = within(card).getByRole("button", { name: "Play preview" });
    swipe(play, [160, 370], [160, 190]);
    expect(within(card).getByText("Outside hours")).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "Play preview" }));
    expect(within(card).getByRole("button", { name: "Pause preview" })).toBeInTheDocument();
  });

  it("ignores a short drag, and moves with the keyboard too", async () => {
    const { user, card } = await openResults();
    swipe(card, [160, 300], [160, 280]);
    expect(within(card).getByText("Field notes")).toBeInTheDocument();

    card.focus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(within(card).getByText("Slow Sunday")).toBeInTheDocument();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("status")).toHaveTextContent("You’ve reached the last source.");
  });

  it("shows the original source for the current moment, and returns focus when closed", async () => {
    const { user, card } = await openResults();
    await user.click(within(card).getByRole("button", { name: "Moment 3: 3:03 to 3:17" }));
    const sourceButton = within(card).getByRole("button", { name: "Reference original video source" });
    await user.click(sourceButton);

    const sheet = screen.getByRole("dialog", { name: "A walk through the forest" });
    expect(within(sheet).getByText("YouTube")).toBeInTheDocument();
    expect(within(sheet).getByText("3:03–3:17")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Close details" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sourceButton).toHaveFocus();
  });
});
