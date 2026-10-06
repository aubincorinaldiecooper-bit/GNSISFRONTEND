import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

// jsdom has no media playback.
Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: () => Promise.resolve() });
Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: () => {} });

function mockMedia({ wide = false, reduced = false } = {}) {
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    matches: query === "(min-width: 900px)" ? wide : query === "(prefers-reduced-motion: reduce)" && reduced,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

beforeEach(() => mockMedia());

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.__GNSIS_CONFIG__;
  document.head.querySelectorAll('meta[name="robots"], meta[name="description"]').forEach((m) => m.remove());
});

function renderMoments() {
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
  return user;
}

async function openResults() {
  const user = renderMoments();
  const search = await screen.findByRole("textbox", { name: "What do you want to find?" });
  await user.click(search);
  await user.keyboard("{Enter}");
  const card = await screen.findByRole("article", { name: /Video moments/ });
  await waitFor(() => expect(card).toHaveClass("is-playing"));
  return { user, card };
}

async function openDesktopResults(query?: string) {
  mockMedia({ wide: true });
  const user = renderMoments();
  if (query) {
    const input = screen.getByRole("textbox", { name: "What do you want to find?" });
    await user.clear(input);
    await user.type(input, query);
  }
  const search = screen.getByRole("textbox", { name: "What do you want to find?" });
  await user.click(search);
  await user.keyboard("{Enter}");
  const grid = await screen.findByRole("group", { name: "Matching video previews" });
  const cards = within(grid).getAllByRole("button", { name: /^Watch / });
  return { user, grid, cards };
}

function swipe(target: HTMLElement, from: [number, number], to: [number, number]) {
  const base = { pointerId: 1, isPrimary: true, button: 0 };
  act(() => {
    fireEvent.pointerDown(target, { ...base, clientX: from[0], clientY: from[1] });
    fireEvent.pointerMove(target, { ...base, clientX: (from[0] + to[0]) / 2, clientY: (from[1] + to[1]) / 2 });
    fireEvent.pointerUp(target, { ...base, clientX: to[0], clientY: to[1] });
  });
}

function tap(target: HTMLElement) {
  const base = { pointerId: 1, isPrimary: true, button: 0, clientX: 160, clientY: 300 };
  act(() => {
    fireEvent.pointerDown(target, base);
    fireEvent.pointerUp(target, base);
  });
}

function pressedMoment(card: HTMLElement) {
  const bars = within(within(card).getByRole("group", { name: "Matched moments in this source" })).getAllByRole("button");
  return bars.findIndex((bar) => bar.getAttribute("aria-pressed") === "true");
}

describe("the Video Search landing", () => {
  it("shows a mobile video skeleton with an animation-only loader", () => {
    renderMoments();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "What do you want to find?" }), { key: "Enter" });
    const loading = document.querySelector(".pv-loading:not([hidden])") as HTMLElement;
    expect(loading.querySelector(".pv-loading-skeleton")).not.toBeNull();
    expect(loading.querySelector(".pv-question-skeleton")).not.toBeNull();
    expect(within(loading).getByRole("status")).toHaveClass("pv-mobile-loader");
    expect(within(loading).getByText("Finding your moments")).toHaveClass("sr-only");
    expect(within(loading).queryByText("Ideas for a slow Saturday")).toBeNull();
  });

  it("keeps the plain mobile query editable without a search icon", async () => {
    const { user } = await openResults();
    const query = screen.getByRole("button", { name: "Edit search: Ideas for a slow Saturday" });
    expect(query).toHaveTextContent("Ideas for a slow Saturday");
    expect(query.querySelector("svg")).toBeNull();
    await user.click(query);
    expect(screen.getByRole("textbox", { name: "What do you want to find?" })).toHaveValue("Ideas for a slow Saturday");
  });

  it("keeps the vertical feed below 900px, rather than rendering desktop cards", async () => {
    const { card } = await openResults();
    expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 900px)");
    expect(screen.getByTestId("mobile-video-feed")).toContainElement(card);
    expect(screen.queryByRole("group", { name: "Matching video previews" })).toBeNull();
  });

  it("keeps the mobile feed still under reduced motion until explicit playback", async () => {
    mockMedia({ reduced: true });
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    const user = renderMoments();
    const search = screen.getByRole("textbox", { name: "What do you want to find?" });
    await user.click(search);
    await user.keyboard("{Enter}");
    const card = await screen.findByRole("article", { name: /Video moments/ });
    expect(card).not.toHaveClass("is-playing");
    expect(play).not.toHaveBeenCalled();
    tap(card);
    expect(card).toHaveClass("is-playing");
    expect(play).toHaveBeenCalledOnce();
  });

  it("is kept out of search engines while the Panoptic pages are dormant", async () => {
    await openResults();
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  });

  it("swipes up for the next source, ignores sideways drags, and moves between moments by tapping", async () => {
    const { user, card } = await openResults();
    expect(within(card).getByText("fieldnotes")).toBeInTheDocument();

    swipe(card, [160, 370], [160, 190]);
    expect(within(card).getByText("homecooking")).toBeInTheDocument();
    expect(pressedMoment(card)).toBe(0);

    swipe(card, [270, 300], [90, 300]);
    expect(pressedMoment(card)).toBe(0);
    await user.click(within(card).getByRole("button", { name: "Moment 2: 5:40 to 5:56" }));
    expect(pressedMoment(card)).toBe(1);
    expect(within(card).getByRole("slider", { name: "Scrub through this clip" })).toHaveAttribute("aria-valuetext", "0:00 of 0:16");

    swipe(card, [160, 190], [160, 370]);
    expect(within(card).getByText("fieldnotes")).toBeInTheDocument();
  });

  it("plays on its own, and a tap in the middle pauses and resumes", async () => {
    const { card } = await openResults();
    await waitFor(() => expect(card).toHaveClass("is-playing"));
    tap(card);
    expect(card).not.toHaveClass("is-playing");
    tap(card);
    expect(card).toHaveClass("is-playing");
  });

  it("reveals mobile context on interaction and fades it after inactivity, without hiding spoken CC", async () => {
    const { card } = await openResults();
    expect(card).not.toHaveClass("is-engaged");
    expect(card.querySelector(".pv-video-footer")?.firstElementChild).toHaveClass("pv-cc");
    vi.useFakeTimers();
    try {
      fireEvent.pointerDown(within(card).getByRole("button", { name: "Sound" }), { isPrimary: true, button: 0 });
      expect(card).toHaveClass("is-engaged");
      act(() => vi.advanceTimersByTime(3000));
      expect(card).not.toHaveClass("is-engaged");
      expect(card.querySelector(".pv-cc")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("scrubs the clip with the single bar under the caption", async () => {
    const { card } = await openResults();
    tap(card);
    const bar = within(card).getByRole("slider", { name: "Scrub through this clip" });
    fireEvent.change(bar, { target: { value: "8" } });
    expect(bar).toHaveValue("8");
    expect(bar).toHaveAttribute("aria-valuetext", "0:08 of 0:16");
  });

  it("shows only a timestamp while dragging the scrubber, without navigating the feed", async () => {
    const { card } = await openResults();
    const video = card.querySelector("video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 16 });
    const pause = vi.spyOn(video, "pause");
    const play = vi.spyOn(video, "play");
    const bar = within(card).getByRole("slider", { name: "Scrub through this clip" });
    const pointer = { pointerId: 1, isPrimary: true, button: 0 };
    expect(card.querySelector(".pv-scrub-time")).toBeNull();
    expect(card.querySelector(".pv-time")).toBeNull();

    fireEvent.pointerDown(bar, { ...pointer, clientX: 30, clientY: 500 });
    expect(pause).toHaveBeenCalledOnce();
    fireEvent.change(bar, { target: { value: "8" } });
    fireEvent.pointerMove(bar, { ...pointer, clientX: 60, clientY: 260 });
    expect(card.querySelector(".pv-scrub-time")).toHaveTextContent("0:08 / 0:16");
    expect(card.querySelector(".pv-timeline")?.firstElementChild).toHaveClass("pv-scrub-time");
    expect(card.querySelector(".pv-timeline")?.lastElementChild).toHaveClass("pv-scrub-row");
    expect(bar).toHaveAttribute("aria-valuetext", "0:08 of 0:16");
    expect(video.currentTime).toBe(8);
    expect(within(card).getByText("fieldnotes")).toBeInTheDocument();
    expect(pressedMoment(card)).toBe(0);
    expect(card).not.toHaveClass("is-dragging");
    expect(card.querySelector(".pv-scrub-time img")).toBeNull();

    fireEvent.pointerUp(bar, pointer);
    expect(card.querySelector(".pv-scrub-time")).toBeNull();
    expect(play).toHaveBeenCalledOnce();
    expect(within(card).getByText("fieldnotes")).toBeInTheDocument();
  });

  it.each(["pointerCancel", "lostPointerCapture"] as const)("hides the timestamp on %s and leaves paused video paused", async (event) => {
    const { card } = await openResults();
    tap(card);
    const video = card.querySelector("video") as HTMLVideoElement;
    const play = vi.spyOn(video, "play");
    const bar = within(card).getByRole("slider", { name: "Scrub through this clip" });
    fireEvent.pointerDown(bar, { pointerId: 1, isPrimary: true, button: 0 });
    expect(card.querySelector(".pv-scrub-time")).not.toBeNull();
    fireEvent[event](bar, { pointerId: 1 });
    expect(card.querySelector(".pv-scrub-time")).toBeNull();
    expect(card).not.toHaveClass("is-playing");
    expect(play).not.toHaveBeenCalled();
  });

  it("shows the timestamp for keyboard scrubbing, not idle focus, and clears it on keyup or blur", async () => {
    const { card } = await openResults();
    const bar = within(card).getByRole("slider", { name: "Scrub through this clip" });
    bar.focus();
    expect(card.querySelector(".pv-scrub-time")).toBeNull();
    fireEvent.keyDown(bar, { key: "ArrowRight" });
    fireEvent.change(bar, { target: { value: "8" } });
    expect(card.querySelector(".pv-scrub-time")).toHaveTextContent("0:08 / 0:16");
    expect(pressedMoment(card)).toBe(0);
    fireEvent.keyUp(bar, { key: "ArrowRight" });
    expect(card.querySelector(".pv-scrub-time")).toBeNull();
    fireEvent.keyDown(bar, { key: "End" });
    expect(card.querySelector(".pv-scrub-time")).not.toBeNull();
    fireEvent.blur(bar);
    expect(card.querySelector(".pv-scrub-time")).toBeNull();
  });

  it("turns captions and sound on and off, and keeps the choice across sources", async () => {
    const { user, card } = await openResults();
    const caption = () => card.querySelector(".pv-cc");
    const video = () => card.querySelector("video") as HTMLVideoElement;
    expect(within(card).getByRole("button", { name: "Captions" })).toHaveAttribute("aria-pressed", "true");
    const controls = within(card).getByRole("group", { name: "Video settings" });
    expect(within(controls).getAllByRole("button")).toHaveLength(2);
    expect(card.querySelector(".pv-creator .pv-media-controls")).toBeNull();
    expect(screen.queryByRole("button", { name: "How to navigate" })).toBeNull();
    expect(within(card).queryByRole("button", { name: /Save|Share|Ask/ })).toBeNull();
    expect(video().muted).toBe(true);

    await user.click(within(card).getByRole("button", { name: "Captions" }));
    await user.click(within(card).getByRole("button", { name: "Sound" }));
    expect(caption()).toBeNull();
    expect(video().muted).toBe(false);

    swipe(card, [160, 370], [160, 190]);
    expect(within(card).getByText("homecooking")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Captions" })).toHaveAttribute("aria-pressed", "false");
    expect(within(card).getByRole("button", { name: "Sound" })).toHaveAttribute("aria-pressed", "true");
    expect(caption()).toBeNull();
    expect(video().muted).toBe(false);
  });

  it("links the source line straight to the original, and still swipes from it", async () => {
    const { card } = await openResults();
    const sourceLine = card.querySelector(".pv-creator") as HTMLElement;
    const link = within(sourceLine).getByRole("link", { name: "Open the original on YouTube" });
    expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=fieldnotes-bamboo&t=42s");
    expect(link).toHaveAttribute("target", "_blank");
    swipe(sourceLine, [160, 370], [160, 190]);
    expect(within(card).getByText("homecooking")).toBeInTheDocument();
    expect(within(sourceLine).getByRole("link", { name: "Open the original on YouTube" }))
      .toHaveAttribute("href", "https://www.youtube.com/watch?v=homecooking-lunch&t=95s");
  });

  it("offers one way to search from the home screen", async () => {
    renderMoments();
    expect(await screen.findByRole("textbox", { name: "What do you want to find?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Find moments" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Try it" })).toBeNull();
    expect(screen.queryByText("Search across video")).toBeNull();
  });

  it("has no chat, source sheet or match description on the phone", async () => {
    const { user, card } = await openResults();
    expect(screen.queryByRole("button", { name: /Back to search|New search/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Panoptic home" }));
    expect(screen.getByRole("textbox", { name: "What do you want to find?" })).toHaveValue("Ideas for a slow Saturday");
    await user.click(screen.getByRole("textbox", { name: "What do you want to find?" }));
    await user.keyboard("{Enter}");
    await screen.findByRole("article", { name: /Video moments/ });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /Ask|Send question|Original source/ })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(card.querySelector("#pv-relevance")).toBeNull();
    expect(screen.queryByText(/demo|simulated|prototype|fictional/i)).toBeNull();
  });

  it("ignores a short drag, and moves with the keyboard too", async () => {
    const { user, card } = await openResults();
    swipe(card, [160, 300], [160, 280]);
    expect(within(card).getByText("fieldnotes")).toBeInTheDocument();

    card.focus();
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(within(card).getByText("homebarista")).toBeInTheDocument();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("status")).toHaveTextContent("You’ve reached the last source.");
  });

});

describe("desktop Beautiful video results", () => {
  it("shows masonry loading skeletons without a separate loader", () => {
    mockMedia({ wide: true });
    renderMoments();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "What do you want to find?" }), { key: "Enter" });
    const loading = document.querySelector(".pv-desktop-loading:not([hidden])") as HTMLElement;
    expect(loading.querySelectorAll(".pv-skeleton-card")).toHaveLength(3);
    expect(loading.querySelector('[data-slot="loading-state"]')).toBeNull();
  });

  it("uses cached video metadata for the initial preview ratios", async () => {
    const properties = [
      [HTMLMediaElement.prototype, "readyState"],
      [HTMLMediaElement.prototype, "videoWidth"],
      [HTMLMediaElement.prototype, "videoHeight"],
      [HTMLVideoElement.prototype, "videoWidth"],
      [HTMLVideoElement.prototype, "videoHeight"],
    ] as const;
    const originalDescriptors = properties.map(([prototype, property]) => [
      prototype,
      property,
      Object.getOwnPropertyDescriptor(prototype, property),
    ] as const);

    try {
      Object.defineProperty(HTMLMediaElement.prototype, "readyState", { configurable: true, value: 1 });
      Object.defineProperty(HTMLMediaElement.prototype, "videoWidth", { configurable: true, value: 1600 });
      Object.defineProperty(HTMLMediaElement.prototype, "videoHeight", { configurable: true, value: 900 });
      Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, value: 1600 });
      Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, value: 900 });

      const { grid } = await openDesktopResults();
      expect(grid.querySelector(".pv-preview-card")).toHaveStyle({ "--pv-ratio": "1.7777777777777777" });
    } finally {
      for (const [prototype, property, descriptor] of originalDescriptors) {
        if (descriptor) Object.defineProperty(prototype, property, descriptor);
        else Reflect.deleteProperty(prototype, property);
      }
    }
  });

  it("renders source-labelled playable bento cards, not a mobile feed", async () => {
    const { grid, cards } = await openDesktopResults();
    expect(grid).toHaveAttribute("data-count", "6");
    expect(cards).toHaveLength(6);
    expect(screen.queryByText("Best match")).toBeNull();
    const arrows = within(grid).getAllByRole("link", { name: /^Open the original on / });
    expect(arrows).toHaveLength(6);
    expect(arrows[0]).toHaveAttribute("target", "_blank");
    expect(arrows[0].getAttribute("href")).toMatch(/[?&]t=\d+s$/);
    expect(screen.queryByTestId("mobile-video-feed")).toBeNull();
    expect(screen.queryByRole("article", { name: /Video moments/ })).toBeNull();
    expect(screen.getByRole("heading", { name: "Ideas for a slow Saturday" })).toBeInTheDocument();
    for (const card of cards) {
      expect(card).toHaveAttribute("data-slot", "button");
      expect(card).toHaveAttribute("aria-haspopup", "dialog");
      expect(card.querySelector("video")).toHaveAttribute("preload", "metadata");
      expect((card.querySelector("video") as HTMLVideoElement).muted).toBe(true);
    }
    const caption = within(cards[5].closest("article") as HTMLElement).getByRole("link", { name: "Open the original on TikTok" });
    expect(caption).toHaveTextContent("TikTok · homebarista");
    expect(caption.querySelector(".lucide-video")).not.toBeNull();
    expect(within(cards[4]).queryByText("Swapping the spark plugs, step by step.")).toBeNull();
  });

  it("opens one themed modal with portrait player and controls, without desktop chat, and returns focus", async () => {
    const { user, cards } = await openDesktopResults();
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    await user.click(cards[0]);
    const dialog = screen.getByRole("dialog", { name: "A slow walk through the bamboo" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(dialog).toHaveClass("dark", "pv-player-dialog");
    expect(document.body).toHaveAttribute("data-scroll-locked");
    expect(within(dialog).getByRole("slider", { name: "Scrub through this clip" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Captions" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByRole("button", { name: "Sound" })).toHaveAttribute("aria-pressed", "false");
    expect(dialog.querySelector('[data-slot="chat-panel"]')).toBeNull();
    expect(dialog.querySelector('[data-slot="chat-composer"]')).toBeNull();
    expect(within(dialog).queryByRole("log", { name: "Conversation" })).toBeNull();
    expect(within(dialog).queryByRole("textbox")).toBeNull();
    const player = within(dialog).getByRole("article", { name: /Video moments/ });
    expect(play.mock.contexts).toContain(player.querySelector("video"));
    expect(player.querySelector(".pv-cc")).toHaveTextContent("…listen to that.");
    expect(dialog.querySelector("#pv-relevance")).toBeNull();
    expect(dialog.querySelector(".pv-moment-buttons")).toBeNull();
    expect(dialog.querySelector(".pv-player-header")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /Save|Share|How to navigate|Original source|matched moment/ })).toBeNull();
    expect(within(dialog).getByText(/Matched video from YouTube/)).toHaveClass("pv-sr");
    expect(within(dialog).queryByText(/demo|simulated|prototype|fictional/i)).toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(cards[0]).toHaveFocus();
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
  });

  it("supports Enter/Space cards, traps focus, and closes with the close control", async () => {
    const { user, cards } = await openDesktopResults();
    cards[2].focus();
    await user.keyboard("{Enter}");
    let dialog = screen.getByRole("dialog", { name: "A slow Saturday lunch, start to finish" });
    const close = within(dialog).getByRole("button", { name: "Close player" });
    expect(dialog.querySelector(".pv-player-column .pv-player-close")).toBeNull();
    const first = within(dialog).getByRole("article", { name: /Video moments/ });
    close.focus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.click(close);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(cards[2]).toHaveFocus();
    cards[4].focus();
    await user.keyboard(" ");
    dialog = screen.getByRole("dialog", { name: "Finally fixing the car myself" });
    expect(within(within(dialog).getByRole("article", { name: /Video moments/ })).getByText("outsidehours")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(cards[4]).toHaveFocus();
  });

  it("dismisses on the backdrop without navigating away from the contextual grid", async () => {
    const { user, cards, grid } = await openDesktopResults();
    await user.click(cards[0]);
    const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement;
    expect(overlay).toHaveClass("pv-modal-overlay");
    await user.click(overlay);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(grid).toBeInTheDocument();
    expect(cards[0]).toHaveFocus();
  });

  it("pauses grid previews for the modal and restores only the intentional preview", async () => {
    const { user, cards } = await openDesktopResults();
    const first = cards[0].querySelector("video") as HTMLVideoElement;
    const second = cards[4].querySelector("video") as HTMLVideoElement;
    const firstPause = vi.spyOn(first, "pause");
    const firstPlay = vi.spyOn(first, "play");
    const secondPlay = vi.spyOn(second, "play");
    fireEvent.pointerEnter(cards[4]);
    expect(firstPause).toHaveBeenCalled();
    expect(secondPlay).toHaveBeenCalledOnce();
    const secondPause = vi.spyOn(second, "pause");
    await user.click(cards[4]);
    expect(secondPause).toHaveBeenCalled();
    secondPlay.mockClear();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(secondPlay).toHaveBeenCalledOnce());
    expect(firstPlay).not.toHaveBeenCalled();
  });

  it("plays only visible active previews and pauses them offscreen", async () => {
    const observations = new Map<Element, (visible: boolean) => void>();
    class Observer {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        observations.set(target, (visible) => this.callback([
          { target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 } as IntersectionObserverEntry,
        ], this as unknown as IntersectionObserver));
      }
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", Observer);
    const { cards } = await openDesktopResults();
    const first = cards[0].querySelector("video") as HTMLVideoElement;
    const play = vi.spyOn(first, "play");
    const pause = vi.spyOn(first, "pause");
    expect(play).not.toHaveBeenCalled();
    act(() => observations.get(first)?.(true));
    expect(play).toHaveBeenCalledOnce();
    act(() => observations.get(first)?.(false));
    expect(pause).toHaveBeenCalled();
    act(() => observations.get(first)?.(true));
    play.mockClear();
    pause.mockClear();
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    expect(pause).toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    expect(play).toHaveBeenCalledOnce();
  });

  it("respects reduced motion but keeps explicit playback available", async () => {
    mockMedia({ wide: true, reduced: true });
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    const user = renderMoments();
    await user.click(screen.getByRole("textbox", { name: "What do you want to find?" }));
    await user.keyboard("{Enter}");
    const grid = await screen.findByRole("group", { name: "Matching video previews" });
    const card = within(grid).getAllByRole("button", { name: /^Watch / })[0];
    expect(play).not.toHaveBeenCalled();
    await user.click(card);
    const dialog = screen.getByRole("dialog", { name: "A slow walk through the bamboo" });
    expect(play).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Play video" }));
    expect(play).toHaveBeenCalledOnce();
  });

  it("handles blocked autoplay without losing the poster or explicit playback control", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("Autoplay is blocked", "NotAllowedError"),
    );
    const { user, cards } = await openDesktopResults();
    expect(cards[0].querySelector("video")).toHaveAttribute("poster", "/videos/panoptic/hero-a.jpg");
    await user.click(cards[0]);
    const dialog = screen.getByRole("dialog", { name: "A slow walk through the bamboo" });
    const control = await within(dialog).findByRole("button", { name: "Play video" });
    const player = within(dialog).getByRole("article", { name: /Video moments/ });
    expect(player).not.toHaveClass("is-playing");
    play.mockResolvedValue(undefined);
    await user.click(control);
    expect(player).toHaveClass("is-playing");
  });

  it("keeps desktop tap-middle pause, transient scrub time and CC/sound persistence", async () => {
    const { user, cards } = await openDesktopResults();
    await user.click(cards[0]);
    let dialog = screen.getByRole("dialog", { name: "A slow walk through the bamboo" });
    const player = within(dialog).getByRole("article", { name: /Video moments/ });
    await waitFor(() => expect(player).toHaveClass("is-playing"));
    tap(player);
    expect(player).not.toHaveClass("is-playing");
    tap(player);
    expect(player).toHaveClass("is-playing");
    const bar = within(dialog).getByRole("slider", { name: "Scrub through this clip" });
    fireEvent.pointerDown(bar, { pointerId: 1, isPrimary: true, button: 0 });
    fireEvent.change(bar, { target: { value: "8" } });
    expect(dialog.querySelector(".pv-scrub-time")).toHaveTextContent("0:08 / 0:16");
    fireEvent.pointerUp(bar, { pointerId: 1 });
    expect(dialog.querySelector(".pv-scrub-time")).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "Captions" }));
    await user.click(within(dialog).getByRole("button", { name: "Sound" }));
    await user.keyboard("{Escape}");
    await user.click(cards[4]);
    dialog = screen.getByRole("dialog", { name: "Finally fixing the car myself" });
    expect(within(dialog).getByRole("button", { name: "Captions" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dialog).getByRole("button", { name: "Sound" })).toHaveAttribute("aria-pressed", "true");
    expect(dialog.querySelector(".pv-cc")).toBeNull();
  });

  it("filters food results and keeps query editing controlled", async () => {
    const { user, grid, cards } = await openDesktopResults("Breakfast ideas");
    expect(cards).toHaveLength(5);
    expect(grid).toHaveAttribute("data-count", "5");
    expect(within(grid).queryByText("outsidehours")).toBeNull();
    expect(within(grid).getByRole("button", { name: /Watch A slow Saturday lunch, start to finish/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Breakfast ideas" })).toBeInTheDocument();
    const search = screen.getByRole("textbox", { name: "Search again" });
    expect(search).toHaveValue("");
    expect(screen.queryByRole("button", { name: /New search|Search videos/ })).toBeNull();
    await user.type(search, "A slow Saturday{Enter}");
    await screen.findByRole("heading", { name: "A slow Saturday" });
    expect(search).toHaveValue("");
    expect(await screen.findByRole("group", { name: "Matching video previews" })).toHaveAttribute("data-count", "6");
    expect(grid.querySelector(".pv-preview-play")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Panoptic home" }));
    const input = screen.getByRole("textbox", { name: "What do you want to find?" });
    expect(input).toHaveValue("A slow Saturday");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("data-slot", "textarea");
  });

  it("shows no prototype instructions or demo notes around the results", async () => {
    await openDesktopResults();
    expect(screen.queryByText(/Select a video to watch and ask/)).toBeNull();
    expect(screen.queryByText(/Fictional creators and stock footage/)).toBeNull();
    expect(screen.queryByRole("button", { name: /demo/i })).toBeNull();
    expect(screen.queryByText(/\d+ videos/)).toBeNull();
    expect(screen.queryByText(/demo|simulated|prototype|fictional/i)).toBeNull();
  });
});
