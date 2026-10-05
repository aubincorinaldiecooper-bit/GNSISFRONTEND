// The Video Search landing (/video-search, or / once it is the home page):
// Panoptic as a phone app. Ask, then
// swipe up and down between video sources and left and right between the
// matched moments inside each one. Search, playback and source links are
// simulated (see ../moments/model.ts).

import "../moments/moments.css";

import { useEffect, useReducer, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

import {
  DEFAULT_QUERY,
  currentMoment,
  formatTime,
  initialMomentsState,
  momentsReducer,
  swipeIntent,
  type MomentsAction,
  type Sheet,
} from "../moments/model";
import { LANDING_META } from "../pageMeta";
import { usePageMeta } from "../usePageMeta";

const SUGGESTIONS = [
  { label: "A quieter weekend ↗", prompt: DEFAULT_QUERY },
  { label: "Into the forest ↗", prompt: "Just the forests" },
];

const HELP = [
  "Swipe ↑ / ↓: change video source",
  "Swipe ← / → or tap edges: change matched moment",
  "Tap a top bar: jump to that moment",
  "Tap ▶: preview the highlighted range",
  "Tap ↗: inspect the original source reference",
];

const KEY_MOVES: Record<string, MomentsAction> = {
  ArrowUp: { type: "source", step: 1 },
  ArrowDown: { type: "source", step: -1 },
  ArrowLeft: { type: "moment", step: -1 },
  ArrowRight: { type: "moment", step: 1 },
};

interface Gesture {
  x: number;
  y: number;
  time: number;
  id: number;
  wasPlaying: boolean;
  /** Began on a button: a tap stays that button's click; only a real drag swipes. */
  onButton: boolean;
  captured: boolean;
}

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

export default function MomentsPage() {
  usePageMeta(LANDING_META.title, LANDING_META.description);
  const [state, dispatch] = useReducer(momentsReducer, undefined, initialMomentsState);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [followUp, setFollowUp] = useState("");
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [settledEnter, setSettledEnter] = useState(0);
  const gesture = useRef<Gesture | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const queryRef = useRef<HTMLTextAreaElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const previousScreen = useRef(state.screen);

  const { source, moment } = currentMoment(state);
  const length = moment.end - moment.start;
  const before = state.list[state.source - 1];
  const after = state.list[state.source + 1];
  const range = `${formatTime(moment.start)}–${formatTime(moment.end)}`;
  const sheetOpen = state.sheet !== null;
  const ticking = state.playing && state.screen === "results" && !sheetOpen;
  const enterClass = state.enter && state.enter.id !== settledEnter ? ` pv-enter-${state.enter.dir}` : "";

  useEffect(() => {
    if (state.screen !== "loading") return;
    const timer = setTimeout(() => dispatch({ type: "loaded" }), 750);
    return () => clearTimeout(timer);
  }, [state.screen, state.query]);

  const toastId = state.toast?.id;
  useEffect(() => {
    if (toastId === undefined) return;
    const timer = setTimeout(() => dispatch({ type: "dismissToast" }), 1900);
    return () => clearTimeout(timer);
  }, [toastId]);

  useEffect(() => {
    if (!ticking) return;
    let last: number | null = null;
    let frame = 0;
    const step = (now: number) => {
      if (last !== null) dispatch({ type: "tick", seconds: Math.min((now - last) / 1000, 0.1) });
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [ticking]);

  useEffect(() => {
    const pause = () => {
      if (document.hidden) dispatch({ type: "playing", playing: false });
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);

  useEffect(() => {
    if (state.sheet) {
      closeRef.current?.focus();
    } else if (returnFocus.current) {
      returnFocus.current.focus({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [state.sheet]);

  useEffect(() => {
    if (state.screen === "home" && previousScreen.current !== "home") queryRef.current?.focus();
    previousScreen.current = state.screen;
  }, [state.screen]);

  const openSheet = (sheet: Sheet) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dispatch({ type: "sheet", sheet });
  };
  const closeSheet = () => dispatch({ type: "sheet", sheet: null });
  const resetDrag = () => {
    gesture.current = null;
    setDrag(null);
  };
  const goHome = () => {
    resetDrag();
    dispatch({ type: "home" });
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!e.isPrimary || e.button !== 0) return;
    setSettledEnter(state.enter?.id ?? 0);
    gesture.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      id: e.pointerId,
      wasPlaying: state.playing,
      onButton: (e.target as Element).closest("button") !== null,
      captured: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const start = gesture.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= 10) return;
    if (!start.captured) {
      // Captured only once it is a drag, so a tap on a button still reaches it.
      start.captured = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    dispatch({ type: "playing", playing: false });
    setDrag(Math.abs(dy) > Math.abs(dx) ? { x: 0, y: clamp(dy * 0.55, 120) } : { x: clamp(dx * 0.35, 65), y: 0 });
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const start = gesture.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const intent = swipeIntent(dx, dy, performance.now() - start.time);
    resetDrag();
    if (intent) {
      dispatch({ type: intent.axis, step: intent.step });
    } else if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) {
      if (start.onButton) return;
      const bounds = e.currentTarget.getBoundingClientRect();
      const ratio = bounds.width ? (e.clientX - bounds.left) / bounds.width : 0.5;
      if (ratio < 0.27) dispatch({ type: "moment", step: -1 });
      else if (ratio > 0.73) dispatch({ type: "moment", step: 1 });
      else dispatch({ type: "toggle" });
    } else if (start.wasPlaying) {
      dispatch({ type: "playing", playing: true });
    }
  };

  const onPointerCancel = () => {
    const wasPlaying = gesture.current?.wasPlaying;
    resetDrag();
    if (wasPlaying) dispatch({ type: "playing", playing: true });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (sheetOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSheet();
      } else if (e.key === "Tab") {
        const focusable = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>("button, a, input") ?? []);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      return;
    }
    const target = e.target as HTMLElement;
    if (target.matches("input, textarea")) return;
    if (e.key === "Escape") {
      goHome();
      return;
    }
    if (state.screen !== "results") return;
    const move = KEY_MOVES[e.key];
    if (move) {
      e.preventDefault();
      dispatch(move);
    } else if (e.code === "Space" && target === cardRef.current) {
      e.preventDefault();
      dispatch({ type: "toggle" });
    }
  };

  const cardStyle = { "--drag-x": `${drag?.x ?? 0}px`, "--drag-y": `${drag?.y ?? 0}px` } as CSSProperties;
  const cardClass =
    "pv-card" + enterClass + (drag ? " is-dragging" : "") + (state.playing ? " is-playing" : "") + (keyboardFocus ? " is-keyboard" : "");

  return (
    <div className="pv-page">
      <section aria-label="Panoptic mobile prototype">
        <div className="pv-device" onKeyDown={onKeyDown}>
          <div className="pv-status" aria-hidden="true">
            <span>9:41</span>
            <span>▮▮▮ &nbsp; ◒ &nbsp; ▰</span>
          </div>

          <div className="pv-view pv-home" hidden={state.screen !== "home"} inert={sheetOpen}>
            <header className="pv-brand">
              <span className="pv-logo">◉</span> panoptic <span className="pv-demo">UI demo</span>
            </header>
            <div className="pv-home-stack" aria-hidden="true">
              <img src="/images/panoptic/mountain.jpg" className="pv-preview-back" alt="" />
              <img src="/images/panoptic/forest.jpg" className="pv-preview-front" alt="" />
              <img src="/images/panoptic/woodland.jpg" className="pv-preview-next" alt="" />
            </div>
            <div className="pv-home-copy">
              <p className="pv-eyebrow">A question. A world of moments.</p>
              <h1>
                Don't just search.
                <br />
                See for yourself.
              </h1>
              <p>Find the part that answers your question.</p>
            </div>
            <form
              className="pv-search pv-home-search"
              onSubmit={(e) => {
                e.preventDefault();
                dispatch({ type: "search", query });
              }}
            >
              <label className="pv-sr" htmlFor="pv-query">
                What do you want to find?
              </label>
              <textarea
                id="pv-query"
                ref={queryRef}
                rows={2}
                placeholder="What do you want to find?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="pv-search-bottom">
                <span>Search across video</span>
                <button className="pv-submit" type="submit" aria-label="Find moments">
                  ↑
                </button>
              </div>
            </form>
            <div className="pv-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.prompt}
                  type="button"
                  onClick={() => {
                    setQuery(s.prompt);
                    dispatch({ type: "search", query: s.prompt });
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="pv-caveat">Sample results · stock stills · simulated playback</p>
          </div>

          <div className="pv-view pv-loading" hidden={state.screen !== "loading"} inert={sheetOpen}>
            <header className="pv-brand">
              <span className="pv-logo">◉</span> panoptic
              <button className="pv-round" type="button" aria-label="Cancel search" onClick={goHome}>
                ×
              </button>
            </header>
            <div className="pv-loading-content">
              <div className="pv-orbit" aria-hidden="true">
                ◉
              </div>
              <h2>Finding your moments.</h2>
              <p>{state.query}</p>
              <small>Demo search across 3 sample sources</small>
            </div>
          </div>

          <div className="pv-view pv-results" hidden={state.screen !== "results"} inert={sheetOpen}>
            <header className="pv-result-header">
              <span className="pv-logo">◉</span>
              <span>panoptic</span>
              <button className="pv-round" type="button" aria-label="How to navigate" onClick={() => openSheet("help")}>
                ?
              </button>
              <button className="pv-round" type="button" aria-label="Back to search" onClick={goHome}>
                ×
              </button>
            </header>
            <div className="pv-question">{state.query}</div>
            <div className="pv-stack">
              {before && (
                <div className="pv-ghost pv-ghost-before" aria-hidden="true">
                  <img src={before.image} alt="" />
                </div>
              )}
              {after && (
                <div className="pv-ghost pv-ghost-after" aria-hidden="true">
                  <img src={after.image} alt="" />
                  <span>{`Next · ${after.creator} · ${after.platform}`}</span>
                </div>
              )}
              <article
                ref={cardRef}
                className={cardClass}
                style={cardStyle}
                tabIndex={0}
                aria-label="Video moments. Swipe up or down for sources, left or right for moments."
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onLostPointerCapture={(e) => {
                  // A touch is first captured by the button it lands on; that capture
                  // moving to the card bubbles up here and must not end the swipe.
                  if (e.target === e.currentTarget && gesture.current) resetDrag();
                }}
                onAnimationEnd={() => setSettledEnter(state.enter?.id ?? 0)}
                onKeyUp={(e) => {
                  if (e.key === "Tab") setKeyboardFocus(true);
                }}
                onBlur={() => setKeyboardFocus(false)}
              >
                <img
                  className="pv-footage"
                  src={source.image}
                  alt={`${source.name} — stock still used for this demo`}
                  style={{ objectPosition: moment.position }}
                  draggable={false}
                />
                <div className="pv-scrim" aria-hidden="true" />
                <div className="pv-bars" role="group" aria-label="Matched moments in this source">
                  {source.moments.map((m, i) => {
                    const fill = i < state.moment ? 100 : i === state.moment ? (100 * state.elapsed) / length : 0;
                    return (
                      <button
                        key={m.start}
                        type="button"
                        aria-label={`Moment ${i + 1}: ${formatTime(m.start)} to ${formatTime(m.end)}`}
                        aria-pressed={i === state.moment}
                        style={{ "--fill": `${fill}%` } as CSSProperties}
                        onClick={() => dispatch({ type: "moment", step: i - state.moment })}
                      >
                        <span />
                      </button>
                    );
                  })}
                </div>
                <div className="pv-creator">
                  <span className="pv-avatar">{source.initials}</span>
                  <div>
                    <strong>{source.creator}</strong>
                    <small>{source.platform}</small>
                  </div>
                  <span className="pv-preview-label">Preview</span>
                </div>
                <div className="pv-card-controls">
                  <button
                    className="pv-play pv-round"
                    type="button"
                    aria-label={state.playing ? "Pause preview" : "Play preview"}
                    onClick={() => dispatch({ type: "toggle" })}
                  >
                    {state.playing ? "Ⅱ" : "▶"}
                  </button>
                </div>
                <div className="pv-evidence">
                  <p className="pv-moment-label">{`Moment ${state.moment + 1} of ${source.moments.length} · matched segment`}</p>
                  <h2 id="pv-title">{moment.title}</h2>
                  <p id="pv-relevance">{moment.why}</p>
                  <div className="pv-timestamp">
                    <span className="pv-timestamp-dot" aria-hidden="true" />
                    <span>{range}</span>
                    <span className="pv-original-label">in original</span>
                  </div>
                  <div className="pv-full-timeline" aria-label="Highlighted match within the original video">
                    <span
                      style={{ left: `${(100 * moment.start) / source.duration}%`, width: `${(100 * length) / source.duration}%` }}
                    />
                  </div>
                  <div className="pv-video-meta">
                    <span>{formatTime(moment.start + state.elapsed)}</span>
                    <span>{formatTime(source.duration)}</span>
                  </div>
                </div>
                <button className="pv-source pv-round" type="button" aria-label="Reference original video source" onClick={() => openSheet("source")}>
                  ↗
                </button>
              </article>
            </div>
            <div className="pv-source-nav">
              <button
                className="pv-nav-button"
                type="button"
                aria-label="Previous video source"
                disabled={state.source === 0}
                onClick={() => dispatch({ type: "source", step: -1 })}
              >
                ↓
              </button>
              <span>
                <strong>{`${String(state.source + 1).padStart(2, "0")} / ${String(state.list.length).padStart(2, "0")}`}</strong>
                <small>Swipe ↑ for next source</small>
              </span>
              <button
                className="pv-nav-button"
                type="button"
                aria-label="Next video source"
                disabled={state.source === state.list.length - 1}
                onClick={() => dispatch({ type: "source", step: 1 })}
              >
                ↑
              </button>
            </div>
            <form
              className="pv-search pv-followup"
              onSubmit={(e) => {
                e.preventDefault();
                dispatch({ type: "refine", query: followUp });
                setFollowUp("");
              }}
            >
              <label className="pv-sr" htmlFor="pv-followup">
                Ask a follow-up
              </label>
              <input
                id="pv-followup"
                placeholder="Ask more. Keep exploring."
                autoComplete="off"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
              />
              <button className="pv-submit" type="submit" aria-label="Refine results">
                ↑
              </button>
            </form>
          </div>

          {state.sheet && (
            <div
              className="pv-sheet-backdrop"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeSheet();
              }}
            >
              <section className="pv-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="pv-sheet-title" tabIndex={-1}>
                <div className="pv-sheet-handle" aria-hidden="true" />
                <button className="pv-round pv-sheet-close" ref={closeRef} type="button" aria-label="Close details" onClick={closeSheet}>
                  ×
                </button>
                {state.sheet === "source" ? (
                  <>
                    <p className="pv-eyebrow">Original video reference</p>
                    <h2 id="pv-sheet-title">{source.name}</h2>
                    <dl>
                      {[
                        ["Creator", source.creator],
                        ["Platform", source.platform],
                        ["Matched range", range],
                        ["Original duration", formatTime(source.duration)],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="pv-sheet-note">
                      Prototype only: creators and video references are fictional. In the live app, ↗ opens the original video at this
                      timestamp where supported.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="pv-eyebrow">How it works</p>
                    <h2 id="pv-sheet-title">One source. Exact moments.</h2>
                    <ul>
                      {HELP.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="pv-sheet-note">
                      Keyboard: up/down changes sources; left/right changes moments; space plays or pauses. Search and playback are
                      simulated; any question uses this nature sample.
                    </p>
                  </>
                )}
              </section>
            </div>
          )}

          {state.toast && (
            <div className="pv-toast" role="status">
              {state.toast.text}
            </div>
          )}
          <div className="pv-sr" aria-live="polite">
            {state.screen === "results"
              ? `${source.creator}, ${source.platform}. Moment ${state.moment + 1} of ${source.moments.length}. ${moment.title} ${range}.`
              : ""}
          </div>
        </div>
      </section>
      <p className="pv-page-note">UI prototype. Search, playback and source references are simulated; fictional creators and stock photos.</p>
    </div>
  );
}
