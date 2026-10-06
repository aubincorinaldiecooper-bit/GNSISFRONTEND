// The mobile moments landing (pages/MomentsPage.tsx): its sample sources and
// the navigation rules, kept pure so they can be tested without a DOM.
//
// Vertical swipes change the video source; horizontal swipes change the
// matched moment inside the current source. Search and playback are
// simulated: every question answers from these three sample sources.

export interface Moment {
  /** Seconds into the original video. */
  start: number;
  end: number;
  title: string;
  /** One line on why this moment answers the question. */
  why: string;
  /** CSS object-position for the still, standing in for the matched frame. */
  position: string;
}

export interface Source {
  id: string;
  creator: string;
  initials: string;
  platform: string;
  name: string;
  image: string;
  /** Length of the original video, in seconds. */
  duration: number;
  moments: readonly Moment[];
}

export const DEFAULT_QUERY = "Show me quiet places to escape to";

export const SOURCES: readonly Source[] = [
  {
    id: "forest",
    creator: "Field notes",
    initials: "FN",
    platform: "YouTube",
    name: "A walk through the forest",
    image: "/images/panoptic/forest.jpg",
    duration: 244,
    moments: [
      { start: 42, end: 58, title: "Take the slower way.", why: "A shaded trail through the trees, rather than another busy street.", position: "35% 50%" },
      { start: 101, end: 116, title: "Look up. Stay a while.", why: "The canopy becomes the focus. A quieter perspective on the same trail.", position: "60% 20%" },
      { start: 183, end: 197, title: "Nothing on the agenda.", why: "A moment to stop, rather than a list of things to tick off.", position: "70% 70%" },
    ],
  },
  {
    id: "mountain",
    creator: "Outside hours",
    initials: "OH",
    platform: "Instagram",
    name: "Above the everyday",
    image: "/images/panoptic/mountain.jpg",
    duration: 92,
    moments: [
      { start: 12, end: 25, title: "A little more distance.", why: "Open ridgelines and cloud-covered peaks, with the city out of frame.", position: "45% 20%" },
      { start: 61, end: 76, title: "Room to breathe.", why: "The wide view is the point. No packed itinerary needed.", position: "60% 60%" },
    ],
  },
  {
    id: "woodland",
    creator: "Slow Sunday",
    initials: "SS",
    platform: "TikTok",
    name: "A woodland pause",
    image: "/images/panoptic/woodland.jpg",
    duration: 64,
    moments: [
      { start: 8, end: 21, title: "Let the world come to you.", why: "Wildlife in the trees. The kind of moment you miss when you rush.", position: "50% 65%" },
      { start: 37, end: 50, title: "Stay for the small things.", why: "A closer look at life along the edge of the woodland.", position: "40% 40%" },
    ],
  },
];

export type SwipeAxis = "source" | "moment";

/** What a finished drag means: a long enough (or fast enough) drag along its dominant axis, or nothing. */
export function swipeIntent(dx: number, dy: number, ms: number): { axis: SwipeAxis; step: 1 | -1 } | null {
  const vertical = Math.abs(dy) > Math.abs(dx);
  const distance = vertical ? dy : dx;
  const speed = Math.abs(distance) / Math.max(ms, 1);
  if (Math.abs(distance) < 48 && !(Math.abs(distance) > 22 && speed > 0.45)) return null;
  return { axis: vertical ? "source" : "moment", step: distance < 0 ? 1 : -1 };
}

/** The demo's only "search": a forest question drops the mountain source. */
export function filterSources(prompt: string): readonly Source[] {
  return /forest|woodland|trees/i.test(prompt) ? SOURCES.filter((s) => s.id !== "mountain") : [...SOURCES];
}

export function formatTime(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export type Screen = "home" | "loading" | "results";
export type Enter = "up" | "down" | "left" | "right";
export type Sheet = "source" | "help";

export interface MomentsState {
  screen: Screen;
  query: string;
  list: readonly Source[];
  source: number;
  moment: number;
  /** Seconds played into the current moment. */
  elapsed: number;
  playing: boolean;
  sheet: Sheet | null;
  /** `id` changes with every message, so the same text shown twice still restarts its timer. */
  toast: { text: string; id: number } | null;
  /** Which way the card last arrived from; `id` restarts the animation. */
  enter: { dir: Enter; id: number } | null;
}

export type MomentsAction =
  | { type: "search"; query: string }
  | { type: "refine"; query: string }
  | { type: "loaded" }
  | { type: "home" }
  | { type: "source"; step: number }
  | { type: "moment"; step: number }
  | { type: "toggle" }
  | { type: "playing"; playing: boolean }
  | { type: "tick"; seconds: number }
  | { type: "sheet"; sheet: Sheet | null }
  | { type: "dismissToast" };

export function initialMomentsState(): MomentsState {
  return {
    screen: "home",
    query: DEFAULT_QUERY,
    list: SOURCES,
    source: 0,
    moment: 0,
    elapsed: 0,
    playing: false,
    sheet: null,
    toast: null,
    enter: null,
  };
}

export function currentMoment(state: MomentsState): { source: Source; moment: Moment } {
  const source = state.list[state.source];
  return { source, moment: source.moments[state.moment] };
}

function withToast(state: MomentsState, text: string): MomentsState {
  return { ...state, toast: { text, id: (state.toast?.id ?? 0) + 1 } };
}

function arrive(state: MomentsState, dir: Enter): MomentsState["enter"] {
  return { dir, id: (state.enter?.id ?? 0) + 1 };
}

function search(state: MomentsState, query: string): MomentsState {
  return {
    ...state,
    screen: "loading",
    query: query.trim() || DEFAULT_QUERY,
    list: filterSources(query.trim() || DEFAULT_QUERY),
    source: 0,
    moment: 0,
    elapsed: 0,
    playing: false,
    sheet: null,
    enter: null,
  };
}

export function momentsReducer(state: MomentsState, action: MomentsAction): MomentsState {
  switch (action.type) {
    case "search":
      return search(state, action.query);
    case "refine": {
      if (!action.query.trim()) return withToast(state, "Ask a follow-up to keep exploring.");
      const next = search(state, action.query);
      return next.list.length === SOURCES.length ? withToast(next, "Demo: showing the same nature sample.") : next;
    }
    case "loaded":
      return state.screen === "loading" ? { ...state, screen: "results" } : state;
    case "home":
      return { ...state, screen: "home", playing: false, sheet: null };
    case "source": {
      const next = state.source + action.step;
      if (next < 0) return withToast(state, "This is the first source.");
      if (next >= state.list.length) return withToast(state, "You’ve reached the last source. Ask a follow-up.");
      return { ...state, source: next, moment: 0, elapsed: 0, playing: false, enter: arrive(state, action.step > 0 ? "up" : "down") };
    }
    case "moment": {
      const { source } = currentMoment(state);
      const next = state.moment + action.step;
      if (next < 0) return withToast(state, "First matched moment in this video.");
      if (next >= source.moments.length) return withToast(state, "Last matched moment. Swipe up for another source.");
      return { ...state, moment: next, elapsed: 0, playing: false, enter: arrive(state, action.step > 0 ? "left" : "right") };
    }
    case "toggle": {
      const { moment } = currentMoment(state);
      const finished = state.elapsed >= moment.end - moment.start;
      return { ...state, elapsed: finished ? 0 : state.elapsed, playing: !state.playing };
    }
    case "playing":
      return state.playing === action.playing ? state : { ...state, playing: action.playing };
    case "tick": {
      if (!state.playing || state.screen !== "results" || state.sheet) return state;
      const { source, moment } = currentMoment(state);
      const length = moment.end - moment.start;
      const elapsed = Math.min(length, state.elapsed + action.seconds);
      if (elapsed < length) return { ...state, elapsed };
      if (state.moment < source.moments.length - 1) {
        return { ...state, moment: state.moment + 1, elapsed: 0, playing: true, enter: arrive(state, "left") };
      }
      return withToast({ ...state, elapsed, playing: false }, "Matched moments complete. Swipe up for the next source.");
    }
    case "sheet":
      return { ...state, sheet: action.sheet, playing: action.sheet ? false : state.playing };
    case "dismissToast":
      return { ...state, toast: null };
  }
}
