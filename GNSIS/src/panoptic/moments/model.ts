// The mobile moments landing (pages/MomentsPage.tsx): its sample sources and
// the navigation rules, kept pure so they can be tested without a DOM.
//
// Vertical swipes change the video source; taps change the matched moment
// inside it, like Stories. Search results come from these sample sources.

export interface Moment {
  /** Seconds into the original video. */
  start: number;
  end: number;
  title: string;
  /** One line on why this moment answers the question. */
  why: string;
  /** Seconds into the sample clip where this moment's footage starts. */
  at: number;
  /** Spoken line, shown as closed captions when enabled. */
  caption?: string;
}

export interface Source {
  id: string;
  creator: string;
  initials: string;
  /** Creator's handle on that platform, without the @. */
  handle: string;
  platform: string;
  name: string;
  /** Where the original video lives on that platform. */
  url: string;
  /** Sample clip in /videos/panoptic/, without its extension. */
  clip: string;
  /** Length of the original video, in seconds. */
  duration: number;
  moments: readonly Moment[];
}

/** The original video, opened at the matched second where the platform allows it. */
export function originalUrl(source: Source, moment: Moment): string {
  if (source.platform !== "YouTube") return source.url;
  const url = new URL(source.url);
  url.searchParams.set("t", String(moment.start) + "s");
  return url.toString();
}

export const DEFAULT_QUERY = "Ideas for a slow Saturday";

export const SOURCES: readonly Source[] = [
  {
    id: "trail",
    creator: "Field notes",
    handle: "fieldnotes",
    initials: "FN",
    platform: "YouTube",
    name: "A slow walk through the bamboo",
    url: "https://www.youtube.com/watch?v=fieldnotes-bamboo",
    clip: "hero-a",
    duration: 244,
    moments: [
      { start: 42, end: 58, title: "Take the slower way.", why: "Looking up through the bamboo on a quiet trail.", at: 0, caption: "…listen to that. Just the wind and the river." },
      { start: 101, end: 116, title: "Look up. Stay a while.", why: "Sunlight through the canopy, with nowhere to be.", at: 2.7, caption: "We found this spot by accident — best kind of Saturday." },
      { start: 183, end: 197, title: "Nothing on the agenda.", why: "A slow stretch of path, far from the busy streets.", at: 5.3, caption: "No plans today. Just keep walking." },
    ],
  },
  {
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
  },
  {
    id: "engine",
    creator: "Outside hours",
    handle: "outsidehours",
    initials: "OH",
    platform: "Instagram",
    name: "Finally fixing the car myself",
    url: "https://www.instagram.com/reel/outsidehours-plugs/",
    clip: "hero-b",
    duration: 92,
    moments: [
      { start: 12, end: 25, title: "Do it yourself.", why: "Swapping the spark plugs, step by step.", at: 0, caption: "First thing — pull the boot, don't yank the plug." },
      { start: 61, end: 76, title: "Check your work.", why: "Checking each plug before it goes back in.", at: 4, caption: "Gap looks right. This one's going back in." },
    ],
  },
  {
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
  },
  {
    id: "pancakes",
    creator: "Slow Sunday",
    handle: "slowsunday",
    initials: "SS",
    platform: "TikTok",
    name: "Blueberry pancakes for a lazy morning",
    url: "https://www.tiktok.com/@slowsunday/video/pancakes",
    clip: "hero-c",
    duration: 64,
    moments: [
      { start: 8, end: 21, title: "Start with breakfast.", why: "Setting out everything for blueberry pancakes.", at: 0, caption: "Everything out on the counter first. Trust me." },
      { start: 37, end: 50, title: "No rush.", why: "Folding in the blueberries, one handful at a time.", at: 4, caption: "Fold them in gently so they don't bleed." },
    ],
  },
  {
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
  },
];

/**
 * What a finished drag means: a long enough (or fast enough) vertical drag
 * changes the source. Sideways drags mean nothing, since moments are tap-only.
 */
export function swipeIntent(dx: number, dy: number, ms: number): { step: 1 | -1 } | null {
  if (Math.abs(dx) >= Math.abs(dy)) return null;
  const speed = Math.abs(dy) / Math.max(ms, 1);
  if (Math.abs(dy) < 48 && !(Math.abs(dy) > 22 && speed > 0.45)) return null;
  return { step: dy < 0 ? 1 : -1 };
}

/** The only "search" rule: a food question drops the engine source. */
export function filterSources(prompt: string): readonly Source[] {
  return /food|cook|breakfast|bake|recipe/i.test(prompt) ? SOURCES.filter((s) => s.id !== "engine") : [...SOURCES];
}

export function formatTime(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export type Screen = "home" | "loading" | "results";
export type Enter = "up" | "down" | "left" | "right";

export interface MomentsState {
  screen: Screen;
  query: string;
  list: readonly Source[];
  source: number;
  moment: number;
  /** Seconds played into the current moment. */
  elapsed: number;
  playing: boolean;
  /** `id` changes with every message, so the same text shown twice still restarts its timer. */
  toast: { text: string; id: number } | null;
  /** Which way the card last arrived from; `id` restarts the animation. */
  enter: { dir: Enter; id: number } | null;
}

export type MomentsAction =
  | { type: "search"; query: string }
  | { type: "loaded" }
  | { type: "home" }
  | { type: "source"; step: number }
  | { type: "moment"; step: number }
  | { type: "toggle" }
  | { type: "playing"; playing: boolean }
  | { type: "tick"; seconds: number }
  | { type: "notify"; text: string }
  | { type: "seek"; seconds: number }
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
    enter: null,
    toast: null,
  };
}

export function momentsReducer(state: MomentsState, action: MomentsAction): MomentsState {
  switch (action.type) {
    case "search":
      return search(state, action.query);
    case "loaded":
      return state.screen === "loading" ? { ...state, screen: "results" } : state;
    case "home":
      return { ...state, screen: "home", playing: false, toast: null };
    case "source": {
      const next = state.source + action.step;
      if (next < 0) return withToast(state, "This is the first source.");
      if (next >= state.list.length) return withToast(state, "You’ve reached the last source. Ask a follow-up.");
      return { ...state, source: next, moment: 0, elapsed: 0, enter: arrive(state, action.step > 0 ? "up" : "down") };
    }
    case "moment": {
      const { source } = currentMoment(state);
      const next = state.moment + action.step;
      if (next < 0) return withToast(state, "First matched moment in this video.");
      if (next >= source.moments.length) return withToast(state, "Last matched moment. Swipe up for another source.");
      return { ...state, moment: next, elapsed: 0, enter: arrive(state, action.step > 0 ? "left" : "right") };
    }
    case "toggle": {
      const { moment } = currentMoment(state);
      const finished = state.elapsed >= moment.end - moment.start;
      return { ...state, elapsed: finished ? 0 : state.elapsed, playing: !state.playing };
    }
    case "playing":
      return state.playing === action.playing ? state : { ...state, playing: action.playing };
    case "tick": {
      if (!state.playing || state.screen !== "results") return state;
      const { source, moment } = currentMoment(state);
      const length = moment.end - moment.start;
      const elapsed = Math.min(length, state.elapsed + action.seconds);
      if (elapsed < length) return { ...state, elapsed };
      if (state.moment < source.moments.length - 1) {
        return { ...state, moment: state.moment + 1, elapsed: 0, playing: true, enter: arrive(state, "left") };
      }
      return withToast({ ...state, elapsed, playing: false }, "Matched moments complete. Swipe up for the next source.");
    }
    case "seek": {
      const { moment } = currentMoment(state);
      return { ...state, elapsed: Math.max(0, Math.min(moment.end - moment.start, action.seconds)) };
    }
    case "notify":
      return withToast(state, action.text);
    case "dismissToast":
      return { ...state, toast: null };
  }
}

/**
 * Column index for each tile, in relevance order: every tile goes to the
 * shortest column so far, heights taken from width/height ratios (a column of
 * equal widths grows by 1/ratio). Ties go left, so the first row fills in order.
 */
export function masonryColumns(ratios: readonly number[], columns: number): number[] {
  const count = Math.max(1, Math.floor(columns));
  const heights = new Array<number>(count).fill(0);
  return ratios.map((ratio) => {
    let column = 0;
    for (let c = 1; c < count; c++) if (heights[c] < heights[column]) column = c;
    heights[column] += 1 / (ratio > 0 ? ratio : 1);
    return column;
  });
}
