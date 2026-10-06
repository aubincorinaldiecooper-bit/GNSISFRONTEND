import { describe, expect, it } from "vitest";

import { SOURCES, filterSources, formatTime, initialMomentsState, momentsReducer, originalUrl, swipeIntent, type MomentsState, masonryColumns } from "./model";

function results(overrides: Partial<MomentsState> = {}): MomentsState {
  return { ...initialMomentsState(), screen: "results", ...overrides };
}

describe("swipeIntent", () => {
  it("reads a drag up as the next source and a drag down as the previous one", () => {
    expect(swipeIntent(5, -180, 300)).toEqual({ step: 1 });
    expect(swipeIntent(0, 120, 300)).toEqual({ step: -1 });
  });

  it("ignores sideways drags, since moments are tap-only", () => {
    expect(swipeIntent(-180, 10, 300)).toBeNull();
    expect(swipeIntent(90, 0, 300)).toBeNull();
  });

  it("ignores short slow drags but accepts a short flick", () => {
    expect(swipeIntent(0, -30, 400)).toBeNull();
    expect(swipeIntent(0, -30, 40)).toEqual({ step: 1 });
  });
});

describe("the demo search", () => {
  it("drops only the engine source for a food question and keeps all sources otherwise", () => {
    expect(SOURCES.map((s) => s.id)).toEqual(["trail", "kitchen", "engine", "louvre", "pancakes", "espresso"]);
    expect(filterSources("Something for breakfast").map((s) => s.id)).toEqual(["trail", "kitchen", "louvre", "pancakes", "espresso"]);
    expect(filterSources("anything").map((s) => s.id)).toEqual(["trail", "kitchen", "engine", "louvre", "pancakes", "espresso"]);
  });

  it("uses real kitchen, Louvre and espresso sample details", () => {
    expect(SOURCES[1]).toMatchObject({
      id: "kitchen",
      creator: "Home cooking",
      handle: "homecooking",
      initials: "HC",
      platform: "YouTube",
      name: "A slow Saturday lunch, start to finish",
      url: "https://www.youtube.com/watch?v=homecooking-lunch",
      clip: "kitchen",
      duration: 612,
      moments: [
        { start: 95, end: 110, title: "Cook something slow.", why: "Chopping vegetables for a long Saturday lunch.", at: 0, caption: "No timer today. It's done when it smells right." },
        { start: 340, end: 356, title: "Let it simmer.", why: "Everything into one pot, then leave it alone.", at: 4, caption: "Lid on, heat down, go read for an hour." },
      ],
    });
    expect(SOURCES[3]).toMatchObject({
      id: "louvre",
      creator: "Paris on foot",
      handle: "parisonfoot",
      initials: "PF",
      platform: "Instagram",
      name: "Walking into the Louvre before the crowds",
      url: "https://www.instagram.com/reel/parisonfoot-louvre/",
      clip: "louvre-4x5",
      duration: 48,
      moments: [
        { start: 6, end: 19, title: "Go early.", why: "Through the archway into an almost empty courtyard.", at: 0, caption: "Nine a.m. and we have the whole courtyard." },
        { start: 27, end: 40, title: "Take the long way round.", why: "A slow loop past the pyramid before going in.", at: 3.5, caption: "Walk the long way. The queue isn't going anywhere." },
      ],
    });
    expect(SOURCES[5]).toMatchObject({
      id: "espresso",
      creator: "Home barista",
      handle: "homebarista",
      initials: "HB",
      platform: "TikTok",
      name: "The perfect weekend espresso at home",
      url: "https://www.tiktok.com/@homebarista/video/espresso",
      clip: "espresso-1x1",
      duration: 37,
      moments: [
        { start: 4, end: 15, title: "Make the good coffee.", why: "Pulling a slow shot on a home espresso machine.", at: 0, caption: "Twenty-eight seconds. Don't rush the shot." },
        { start: 21, end: 32, title: "Sit down with it.", why: "Watching the crema settle before the first sip.", at: 2.7, caption: "Weekend rule: drink it sitting down." },
      ],
    });
  });

  it("formats timestamps as m:ss", () => {
    expect(formatTime(42)).toBe("0:42");
    expect(formatTime(183.9)).toBe("3:03");
  });

  it("goes through loading to results", () => {
    const loading = momentsReducer(initialMomentsState(), { type: "search", query: "  " });
    expect(loading).toMatchObject({ screen: "loading", query: "Ideas for a slow Saturday" });
    expect(momentsReducer(loading, { type: "loaded" }).screen).toBe("results");
  });
});

describe("moving through sources and moments", () => {
  it("starts each new source at its first moment, and stops at both ends", () => {
    let state = results({ moment: 2 });
    state = momentsReducer(state, { type: "source", step: 1 });
    expect(state).toMatchObject({ source: 1, moment: 0, enter: { dir: "up" } });
    expect(momentsReducer(results(), { type: "source", step: -1 }).toast?.text).toBe("This is the first source.");
    const last = momentsReducer(results({ source: SOURCES.length - 1 }), { type: "source", step: 1 });
    expect(last.source).toBe(SOURCES.length - 1);
    expect(last.toast?.text).toMatch(/last source/);
    expect(momentsReducer(results({ playing: true }), { type: "source", step: 1 }).playing).toBe(true);
  });

  it("stays inside the current source's moments", () => {
    const next = momentsReducer(results(), { type: "moment", step: 1 });
    expect(next).toMatchObject({ source: 0, moment: 1, enter: { dir: "left" } });
    expect(momentsReducer(results(), { type: "moment", step: -1 }).moment).toBe(0);
    expect(momentsReducer(results({ moment: 2 }), { type: "moment", step: 1 }).toast?.text).toMatch(/Last matched moment/);
  });

  it("scrubs within the current moment's clip", () => {
    expect(momentsReducer(results(), { type: "seek", seconds: 7 }).elapsed).toBe(7);
    expect(momentsReducer(results(), { type: "seek", seconds: 99 }).elapsed).toBe(16);
    expect(momentsReducer(results(), { type: "seek", seconds: -3 }).elapsed).toBe(0);
  });

  it("plays a moment through, rolls on to the next, and stops after the last", () => {
    let state = momentsReducer(results(), { type: "toggle" });
    state = momentsReducer(state, { type: "tick", seconds: 10 });
    expect(state).toMatchObject({ moment: 0, elapsed: 10, playing: true });
    state = momentsReducer(state, { type: "tick", seconds: 10 });
    expect(state).toMatchObject({ moment: 1, elapsed: 0, playing: true });
    state = momentsReducer({ ...state, moment: 2 }, { type: "tick", seconds: 60 });
    expect(state).toMatchObject({ moment: 2, playing: false });
    expect(state.toast?.text).toMatch(/complete/);
  });

});

describe("originalUrl", () => {
  it("opens YouTube at the matched second and other platforms at the video", () => {
    const [trail, , engine] = SOURCES;
    expect(originalUrl(trail, trail.moments[1])).toBe("https://www.youtube.com/watch?v=fieldnotes-bamboo&t=101s");
    expect(originalUrl(engine, engine.moments[0])).toBe(engine.url);
  });

});

describe("toasts", () => {
  it("drops a boundary message when the screen changes", () => {
    let state: MomentsState = { ...initialMomentsState(), screen: "results" };
    state = momentsReducer(state, { type: "source", step: -1 });
    expect(state.toast?.text).toBe("This is the first source.");
    expect(momentsReducer(state, { type: "home" }).toast).toBeNull();
    expect(momentsReducer(state, { type: "search", query: "forest" }).toast).toBeNull();
  });
});

describe("masonryColumns", () => {
  it("fills the first row left to right, then the shortest column", () => {
    expect(masonryColumns([9 / 16, 16 / 9, 9 / 16, 1], 3)).toEqual([0, 1, 2, 1]);
  });
  it("never uses more columns than asked", () => {
    expect(Math.max(...masonryColumns([1, 1, 1, 1, 1], 2))).toBe(1);
    expect(masonryColumns([], 3)).toEqual([]);
  });
});
