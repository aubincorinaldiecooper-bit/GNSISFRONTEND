import { describe, expect, it } from "vitest";

import { SOURCES, filterSources, formatTime, initialMomentsState, momentsReducer, swipeIntent, type MomentsState } from "./model";

function results(overrides: Partial<MomentsState> = {}): MomentsState {
  return { ...initialMomentsState(), screen: "results", ...overrides };
}

describe("swipeIntent", () => {
  it("reads a drag up as the next source and a drag left as the next moment", () => {
    expect(swipeIntent(5, -180, 300)).toEqual({ axis: "source", step: 1 });
    expect(swipeIntent(0, 120, 300)).toEqual({ axis: "source", step: -1 });
    expect(swipeIntent(-180, 10, 300)).toEqual({ axis: "moment", step: 1 });
    expect(swipeIntent(90, 0, 300)).toEqual({ axis: "moment", step: -1 });
  });

  it("ignores short slow drags but accepts a short flick", () => {
    expect(swipeIntent(0, -30, 400)).toBeNull();
    expect(swipeIntent(0, -30, 40)).toEqual({ axis: "source", step: 1 });
  });
});

describe("the demo search", () => {
  it("drops the mountain source for a forest question and keeps all three otherwise", () => {
    expect(filterSources("Just the forests").map((s) => s.id)).toEqual(["forest", "woodland"]);
    expect(filterSources("anything").map((s) => s.id)).toEqual(SOURCES.map((s) => s.id));
  });

  it("formats timestamps as m:ss", () => {
    expect(formatTime(42)).toBe("0:42");
    expect(formatTime(183.9)).toBe("3:03");
  });

  it("goes through loading to results, and an empty follow-up only asks for one", () => {
    const loading = momentsReducer(initialMomentsState(), { type: "search", query: "  " });
    expect(loading).toMatchObject({ screen: "loading", query: "Show me quiet places to escape to" });
    expect(momentsReducer(loading, { type: "loaded" }).screen).toBe("results");
    const same = momentsReducer(results(), { type: "refine", query: " " });
    expect(same.screen).toBe("results");
    expect(same.toast?.text).toBe("Ask a follow-up to keep exploring.");
  });
});

describe("moving through sources and moments", () => {
  it("starts each new source at its first moment, and stops at both ends", () => {
    let state = results({ moment: 2 });
    state = momentsReducer(state, { type: "source", step: 1 });
    expect(state).toMatchObject({ source: 1, moment: 0, enter: { dir: "up" } });
    expect(momentsReducer(results(), { type: "source", step: -1 }).toast?.text).toBe("This is the first source.");
    const last = momentsReducer(results({ source: 2 }), { type: "source", step: 1 });
    expect(last.source).toBe(2);
    expect(last.toast?.text).toMatch(/last source/);
  });

  it("stays inside the current source's moments", () => {
    const next = momentsReducer(results(), { type: "moment", step: 1 });
    expect(next).toMatchObject({ source: 0, moment: 1, enter: { dir: "left" } });
    expect(momentsReducer(results(), { type: "moment", step: -1 }).moment).toBe(0);
    expect(momentsReducer(results({ moment: 2 }), { type: "moment", step: 1 }).toast?.text).toMatch(/Last matched moment/);
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

  it("does not play while a sheet is open", () => {
    const state = momentsReducer(momentsReducer(results(), { type: "toggle" }), { type: "sheet", sheet: "source" });
    expect(state.playing).toBe(false);
    expect(momentsReducer({ ...state, playing: true }, { type: "tick", seconds: 5 }).elapsed).toBe(0);
  });
});
