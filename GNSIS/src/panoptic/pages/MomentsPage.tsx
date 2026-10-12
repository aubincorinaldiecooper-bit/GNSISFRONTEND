// Video search: a command palette is the home and the search, desktop results
// are a preview bento with one Radix player; phones keep the vertical swipe feed. Results are static sample data;
// data/navigation contracts live in moments/model.ts.
import "@fontsource-variable/geist";
import "../moments/moments.css";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ComponentProps, CSSProperties, KeyboardEvent, PointerEvent } from "react";
import {
  DEFAULT_QUERY, currentMoment, formatTime, initialMomentsState,
  momentsReducer, originalUrl, swipeIntent, type MomentsAction,
} from "../moments/model";
import {
  ArrowDown, ArrowUp, BatteryFull, Captions, CaptionsOff,
  Instagram, Pause, Play, Search, Signal, Twitch, Video,
  Volume2, VolumeX, Wifi, X, Youtube,
  History, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/motion/aspect-ratio";
import { CommandPalette, type CommandItem } from "@/components/motion/command-palette";
import { BottomSheet } from "@/components/motion/bottom-sheet";
import { InfiniteMasonry } from "@/components/motion/infinite-masonry";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { UIThemeProvider } from "@/components/ui/theme";
import { useMotionPrefs } from "../motion";
import { LANDING_META } from "../pageMeta";
import { usePageMeta } from "../usePageMeta";
import AccountMenu from "../components/AccountMenu";
import { VideoChat } from "../components/VideoChat";

interface Gesture {
  x: number;
  y: number;
  time: number;
  id: number;
  wasPlaying: boolean;
  /** A tap stays the button's click; only a real drag swipes. */
  onButton: boolean;
  captured: boolean;
}
const KEY_MOVES: Record<string, MomentsAction> = {
  ArrowUp: { type: "source", step: 1 }, ArrowDown: { type: "source", step: -1 },
  ArrowLeft: { type: "moment", step: -1 }, ArrowRight: { type: "moment", step: 1 },
};
const SCRUB_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);
const WIDE = "(min-width: 900px)";
const SUGGESTIONS = [DEFAULT_QUERY, "How to replace spark plugs", "Visiting the Louvre early", "Blueberry pancakes from scratch"];
/** Sample clips are portrait; tiles take their own ratio once metadata arrives. */
const DEFAULT_RATIO = 9 / 16;
const SKELETON_RATIOS = [9 / 16, 4 / 5, 9 / 16];
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const clipSrc = (name: string, ext: "mp4" | "jpg") => `/videos/panoptic/${name}.${ext}`;
const PLATFORM_ICONS = { YouTube: Youtube, TikTok: Video, Instagram, Twitch };

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const change = () => setMatches(mq.matches);
    mq.addEventListener?.("change", change);
    return () => mq.removeEventListener?.("change", change);
  }, [query]);
  return matches;
}

/** Real media only, never duplicated/fake-blurred layers. Hidden/offscreen clips
 * pause; blocked autoplay leaves the poster. The caller owns intentional activity. */
function PreviewVideo({
  active,
  onAspect,
  onLoadedMetadata,
  src,
  ...props
}: ComponentProps<"video"> & { active: boolean; onAspect?: (ratio: number) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const onAspectRef = useRef(onAspect);
  const [visible, setVisible] = useState(() => !("IntersectionObserver" in window));
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  useEffect(() => {
    onAspectRef.current = onAspect;
  }, [onAspect]);
  const report = useCallback(() => {
    const video = ref.current;
    if (video?.videoWidth && video.videoHeight) onAspectRef.current?.(video.videoWidth / video.videoHeight);
  }, []);
  useEffect(() => {
    const video = ref.current;
    if (video && video.readyState >= HTMLMediaElement.HAVE_METADATA) report();
  }, [report, src]);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.35),
      { threshold: [0, 0.35] },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const change = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (active && visible && pageVisible && !reducedMotion) video.play()?.catch(() => {});
    else video.pause();
    return () => video.pause();
  }, [active, visible, pageVisible, reducedMotion]);
  return (
    <video
      {...props}
      src={src}
      ref={ref}
      muted
      loop
      playsInline
      preload="metadata"
      onLoadedMetadata={(event) => {
        report();
        onLoadedMetadata?.(event);
      }}
    />
  );
}
function PlatformIcon({ platform }: { platform: string }) {
  const Icon = PLATFORM_ICONS[platform as keyof typeof PLATFORM_ICONS] ?? Video;
  return <Icon className="pv-pi" aria-hidden="true" />;
}
function SourceTag({ handle, platform }: { handle: string; platform: string }) {
  return (
    <>
      <span className="pv-src-logo"><PlatformIcon platform={platform} /></span>
      <span className="pv-src">
        <strong>{platform}</strong>
        <span aria-hidden="true">·</span>
        <span>{handle}</span>
      </span>
    </>
  );
}
export default function MomentsPage() {
  usePageMeta(LANDING_META.title, LANDING_META.description);
  const [state, dispatch] = useReducer(momentsReducer, undefined, initialMomentsState);
  const [query, setQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [recent, setRecent] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [muted, setMuted] = useState(true);
  const [scrubKey, setScrubKey] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [activePreview, setActivePreview] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [interactionVisible, setInteractionVisible] = useState(false);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [settledEnter, setSettledEnter] = useState(0);
  // Radix mounts portal content after the page's effects. Track attachment
  // separately so media effects run when the actual player is ready.
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setMediaReady(node !== null);
  }, []);
  const gesture = useRef<Gesture | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const playerReturnFocus = useRef<HTMLElement | null>(null);
  const previousScreen = useRef(state.screen);
  const wide = useMediaQuery(WIDE);
  const columnCount = 3;
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const m = useMotionPrefs();
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const { source, moment } = currentMoment(state);
  const length = moment.end - moment.start;
  const before = state.list[state.source - 1];
  const after = state.list[state.source + 1];
  const range = `${formatTime(moment.start)}–${formatTime(moment.end)}`;
  const showing = state.screen === "results";
  const playerVisible = showing && (!wide || playerOpen);
  const clipKey = `${source.id}:${state.moment}:${state.enter?.id ?? 0}`;
  const scrubbing = scrubKey === clipKey && playerVisible;
  const ticking = state.playing && playerVisible && !scrubbing;

  useEffect(() => {
    if (state.screen !== "loading") return;
    const timer = setTimeout(() => dispatch({ type: "loaded" }), 750);
    return () => clearTimeout(timer);
  }, [state.screen, state.query]);
  useEffect(() => {
    if (playerVisible && !reducedMotion) dispatch({ type: "playing", playing: true });
    if (reducedMotion) dispatch({ type: "playing", playing: false });
  }, [playerVisible, reducedMotion, state.query]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.currentTime = moment.at;
  }, [source.id, state.moment, moment.at, playerVisible, mediaReady]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    if (state.playing && playerVisible && !scrubbing) {
      video.play()?.catch(() => {
        if (!cancelled) dispatch({ type: "playing", playing: false });
      });
    } else video.pause();
    return () => {
      cancelled = true;
    };
  }, [state.playing, playerVisible, source.id, scrubbing, mediaReady]);
  useEffect(() => {
    const video = videoRef.current;
    return () => video?.pause();
  }, [mediaReady]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, source.id, playerVisible, mediaReady]);
  useEffect(() => () => clearTimeout(interactionTimer.current), []);
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
  // Layout changes cannot carry the desktop player across breakpoints.
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE);
    const change = () => {
      setPlayerOpen(false);
      setScrubKey(null);
    };
    mq?.addEventListener?.("change", change);
    return () => mq?.removeEventListener?.("change", change);
  }, []);
  useEffect(() => {
    if (state.screen === "home" && previousScreen.current !== "home") setPaletteOpen(true);
    previousScreen.current = state.screen;
  }, [state.screen]);
  const runSearch = (text: string) => {
    setActivePreview(0);
    setQuery("");
    setRecent(text);
    dispatch({ type: "search", query: text });
  };
  const typed = query.trim();
  const commands: CommandItem[] = [
    ...(typed
      ? [{ id: "search", label: `Search for “${typed}”`, group: "Search", icon: Search, keywords: [typed], pinned: true, onSelect: () => runSearch(typed) }]
      : []),
    ...(recent
      ? [{ id: "recent", label: recent, group: "Recent", icon: History, onSelect: () => runSearch(recent) }]
      : []),
    ...SUGGESTIONS.filter((text) => text !== recent).map((text) => ({ id: `try:${text}`, label: text, group: "Try asking", icon: Search, onSelect: () => runSearch(text) })),
  ];
  const resetDrag = () => {
    gesture.current = null;
    setDrag(null);
  };
  const goHome = () => {
    resetDrag();
    setScrubKey(null);
    setPlayerOpen(false);
    dispatch({ type: "home" });
  };
  const revealContext = () => {
    if (wide) return;
    setInteractionVisible(true);
    clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => setInteractionVisible(false), 3000);
  };
  const seek = (seconds: number) => {
    dispatch({ type: "seek", seconds });
    if (videoRef.current) videoRef.current.currentTime = (moment.at + seconds) % (videoRef.current.duration || 8);
  };
  const openPlayer = (index: number, trigger: HTMLButtonElement) => {
    playerReturnFocus.current = trigger;
    dispatch({ type: "source", step: index - state.source });
    setScrubKey(null);
    setPlayerOpen(true);
  };
  const changePlayerOpen = (open: boolean) => {
    setPlayerOpen(open);
    if (!open) {
      setScrubKey(null);
      dispatch({ type: "playing", playing: false });
    }
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
      onButton: (e.target as Element).closest("button, input, a") !== null,
      captured: false,
    };
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const start = gesture.current;
    if (wide || !start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.abs(dy) <= 10 || Math.abs(dy) <= Math.abs(dx)) return;
    if (!start.captured) {
      start.captured = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    dispatch({ type: "playing", playing: false });
    setDrag({ x: 0, y: Math.max(-120, Math.min(120, dy * 0.55)) });
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const start = gesture.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    const intent = wide ? null : swipeIntent(dx, dy, performance.now() - start.time);
    resetDrag();
    if (intent) {
      dispatch({ type: "source", step: intent.step });
      if (start.wasPlaying) dispatch({ type: "playing", playing: true });
    } else if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) {
      if (start.onButton) return;
      const bounds = e.currentTarget.getBoundingClientRect();
      const ratio = bounds.width ? (e.clientX - bounds.left) / bounds.width : 0.5;
      if (ratio < 0.27) dispatch({ type: "moment", step: -1 });
      else if (ratio > 0.73) dispatch({ type: "moment", step: 1 });
      else dispatch({ type: "toggle" });
    } else if (start.wasPlaying) dispatch({ type: "playing", playing: true });
  };
  const onPointerCancel = () => {
    const wasPlaying = gesture.current?.wasPlaying;
    resetDrag();
    if (wasPlaying) dispatch({ type: "playing", playing: true });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, button, a")) return;
    if (e.key === "Escape") {
      // Phones: Escape leaves the feed. Desktop: Radix closes the player; the
      // results page stays, so the same keypress never falls through to home.
      if (!wide && !playerOpen) goHome();
      return;
    }
    if (!playerVisible) return;
    const move = KEY_MOVES[e.key];
    if (move) {
      e.preventDefault();
      dispatch(move);
    } else if (e.code === "Space" && target === cardRef.current) {
      e.preventDefault();
      dispatch({ type: "toggle" });
    }
  };

  const enterClass = state.enter && state.enter.id !== settledEnter ? ` pv-enter-${state.enter.dir}` : "";
  const player = (
    <article
      ref={cardRef}
      className={`pv-card${enterClass}${drag ? " is-dragging" : ""}${state.playing ? " is-playing" : ""}${keyboardFocus ? " is-keyboard" : ""}${interactionVisible ? " is-engaged" : ""}${scrubbing ? " is-scrubbing" : ""}`}
      style={{ "--drag-x": `${drag?.x ?? 0}px`, "--drag-y": `${drag?.y ?? 0}px` } as CSSProperties}
      tabIndex={0}
      aria-label="Video moments. Swipe up or down for sources, tap the sides for moments, tap the middle to pause."
      onPointerDown={onPointerDown}
      onPointerDownCapture={revealContext}
      onKeyDownCapture={revealContext}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={(e) => {
        if (e.target === e.currentTarget && gesture.current) resetDrag();
      }}
      onAnimationEnd={() => setSettledEnter(state.enter?.id ?? 0)}
      onKeyUp={(e) => {
        if (e.key === "Tab") setKeyboardFocus(true);
      }}
      onBlur={() => setKeyboardFocus(false)}
    >
      <video
        ref={attachVideo}
        className="pv-footage"
        src={clipSrc(source.clip, "mp4")}
        poster={clipSrc(source.clip, "jpg")}
        aria-label={source.name}
        muted={muted}
        loop
        playsInline
        preload="auto"
      />
      <div className="pv-scrim" aria-hidden="true" />
      <div className="pv-bars pv-sr-only" role="group" aria-label="Matched moments in this source">
        {source.moments.map((m, i) => (
          <Button
            variant="quiet"
            size="xs"
            key={m.start}
            aria-label={`Moment ${i + 1}: ${formatTime(m.start)} to ${formatTime(m.end)}`}
            aria-pressed={i === state.moment}
            onClick={() => dispatch({ type: "moment", step: i - state.moment })}
          >
            {i + 1}
          </Button>
        ))}
      </div>
      <div className="pv-creator">
        <a
          className="pv-src-link"
          href={originalUrl(source, moment)}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          aria-label={"Open the original on " + source.platform}
          onClick={(e) => e.stopPropagation()}
        >
          <SourceTag handle={source.handle} platform={source.platform} />
        </a>
      </div>
      {wide && (
        <Button
          variant="quiet"
          size="icon"
          className="pv-play-toggle"
          aria-label={state.playing ? "Pause video" : "Play video"}
          onClick={() => dispatch({ type: "toggle" })}
        >
          {state.playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </Button>
      )}
      {!state.playing && !scrubbing && (
        <span className="pv-paused" aria-hidden="true"><Play /></span>
      )}
      <div className="pv-video-footer">
        {captions && moment.caption && (
          <span className="pv-cc" aria-hidden="true"><span>{moment.caption}</span></span>
        )}
        <div className="pv-context-row">
          <div className="pv-media-controls" role="group" aria-label="Video settings">
        <Button
          variant="quiet"
          size="icon"
          className="pv-icon-button"
          aria-label="Captions"
          aria-pressed={captions}
          onClick={() => setCaptions((on) => !on)}
        >
          {captions ? <Captions aria-hidden="true" /> : <CaptionsOff aria-hidden="true" />}
        </Button>
        <Button
          variant="quiet"
          size="icon"
          className="pv-icon-button"
          aria-label="Sound"
          aria-pressed={!muted}
          onClick={() => setMuted((on) => !on)}
        >
          {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </Button>
      </div>
        </div>
      <div className="pv-timeline">
        {scrubbing && (
          <span className="pv-scrub-time" aria-hidden="true">
            {`${formatTime(state.elapsed)} / ${formatTime(length)}`}
          </span>
        )}
        <div className="pv-scrub-row">
        <Input
          variant="plain"
          className="pv-scrub"
          type="range"
          min={0}
          max={length}
          step={0.1}
          value={Math.min(state.elapsed, length)}
          aria-label="Scrub through this clip"
          aria-valuetext={`${formatTime(state.elapsed)} of ${formatTime(length)}`}
          style={{ "--fill": `${100 * state.elapsed / length}%` } as CSSProperties}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (!e.isPrimary || e.button !== 0) return;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            setScrubKey(clipKey);
          }}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => {
            e.stopPropagation();
            setScrubKey(null);
          }}
          onPointerCancel={(e) => {
            e.stopPropagation();
            setScrubKey(null);
          }}
          onLostPointerCapture={() => setScrubKey(null)}
          onKeyDown={(e) => {
            if (SCRUB_KEYS.has(e.key)) setScrubKey(clipKey);
          }}
          onKeyUp={(e) => {
            if (SCRUB_KEYS.has(e.key)) setScrubKey(null);
          }}
          onBlur={() => setScrubKey(null)}
          onChange={(e) => seek(Number(e.target.value))}
        />
      </div>
      </div>
      </div>
    </article>
  );

  const accountMenu = (
    <AccountMenu
      captions={captions}
      muted={muted}
      onCaptionsChange={setCaptions}
      onMutedChange={setMuted}
      onInteract={() => { if (showing) dispatch({ type: "playing", playing: false }); }}
    />
  );

  return (
    <UIThemeProvider theme="dark">
      <div className="pv-page">
        <section aria-label="Panoptic video search" className="pv-shell">
          <div className="pv-device" onKeyDown={onKeyDown}>
            <div className="pv-status" aria-hidden="true">
              <span>9:41</span>
              <span className="pv-status-icons"><Signal /><Wifi /><BatteryFull /></span>
            </div>
            <div className="pv-view pv-home" hidden={state.screen !== "home"}>
              <header className="pv-brand">
                <span className="pv-logo">◉</span> panoptic
                {state.screen === "home" && accountMenu}
              </header>
              <div className="pv-home-main">
                <Button ref={searchButtonRef} variant="primary" size="lg" className="pv-home-cta" onClick={() => setPaletteOpen(true)}>
                  <Search aria-hidden="true" />
                  Search videos
                  <kbd aria-hidden="true">⌘K</kbd>
                </Button>
              </div>
            </div>
            <div className={`pv-view pv-loading${wide ? " pv-desktop-results pv-desktop-loading" : ""}`} hidden={state.screen !== "loading"}>
              {wide ? (
                <>
                  <header className="pv-result-header">
                    <Button variant="quiet" className="pv-wordmark" aria-label="Panoptic home" onClick={goHome}>
                      <span className="pv-logo">◉</span>
                      <span>panoptic</span>
                    </Button>
                    {state.screen === "loading" && accountMenu}
                  </header>
                  <div className="pv-query-heading">
                    <h1>{state.query}</h1>
                  </div>
                  <div className="pv-bento pv-bento-skeleton" data-count="3" aria-hidden="true">
                    {Array.from({ length: columnCount }, (_, c) => (
                      <div key={c} className="pv-masonry-col">
                        {c < SKELETON_RATIOS.length && (
                          <div className="pv-preview-card pv-skeleton-card" style={{ "--pv-ratio": SKELETON_RATIOS[c] } as CSSProperties}>
                            <span className="pv-preview-media pv-skeleton" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <header className="pv-result-header">
                    <span className="pv-logo">◉</span> panoptic
                    <Button variant="quiet" size="icon" className="pv-close" aria-label="Cancel search" onClick={goHome}>
                      <X aria-hidden="true" />
                    </Button>
                    {state.screen === "loading" && accountMenu}
                  </header>
                  <span className="pv-question-skeleton" aria-hidden="true" />
                  <div className="pv-stack pv-loading-stack">
                    <div className="pv-card pv-loading-skeleton" aria-hidden="true" />
                    <LoadingState className="pv-mobile-loader" label="Finding your moments" hideLabel elapsed={false} />
                  </div>
                </>
              )}
            </div>
            <div className={`pv-view pv-results${wide ? " pv-desktop-results" : ""}`} hidden={!showing}>
              <header className="pv-result-header">
                <Button variant="quiet" className="pv-wordmark" aria-label="Panoptic home" onClick={goHome}>
                  <span className="pv-logo">◉</span>
                  <span>panoptic</span>
                </Button>
                {wide && (
                  <Button variant="secondary" className="pv-header-search" onClick={() => setPaletteOpen(true)}>
                    <Search aria-hidden="true" />
                    Search videos
                    <kbd aria-hidden="true">⌘K</kbd>
                  </Button>
                )}
                {!wide && showing && (
                  <Button variant="quiet" size="icon" className="pv-ask" aria-label="Ask about these videos" onClick={() => setChatOpen(true)}>
                    <MessageCircle aria-hidden="true" />
                  </Button>
                )}
                {showing && accountMenu}
              </header>
              {wide ? (
                <div className="pv-query-heading">
                  <h1>{state.query}</h1>
                </div>
              ) : (
                <Button variant="quiet" className="pv-question" aria-label={`Edit search: ${state.query}`} onClick={goHome}>
                  {state.query}
                </Button>
              )}
              {wide ? (
                <>
                  <InfiniteMasonry
                    items={state.list}
                    getItemKey={(item) => item.id}
                    onLoadMore={() => {}}
                    hasMore={false}
                    minColumnWidth={240}
                    maxColumns={4}
                    gap={12}
                    estimateSize={(item) => 280 / (ratios[item.id] ?? DEFAULT_RATIO)}
                    animateItems={!m.reduce}
                    ariaLabel="Matching video previews"
                    className="pv-bento pv-masonry"
                    contentClassName="pv-masonry-content"
                    renderItem={(item, i) => (
                      <article
                        className="pv-preview-card"
                        data-ratio={ratios[item.id] ?? DEFAULT_RATIO}
                        onPointerEnter={() => setActivePreview(i)}
                        onFocus={() => setActivePreview(i)}
                      >
                        <Button
                          variant="quiet"
                          className="pv-preview-open"
                          aria-label={`Watch ${item.name} · ${item.platform} · ${item.handle}`}
                          aria-haspopup="dialog"
                          onClick={(e) => openPlayer(i, e.currentTarget)}
                        >
                          <AspectRatio ratio={ratios[item.id] ?? DEFAULT_RATIO} animated={!m.reduce} className="pv-preview-media">
                            <PreviewVideo
                              active={showing && !playerOpen && activePreview === i}
                              src={clipSrc(item.clip, "mp4")}
                              poster={clipSrc(item.clip, "jpg")}
                              aria-hidden="true"
                              onAspect={(ratio) => setRatios((r) => (r[item.id] === ratio ? r : { ...r, [item.id]: ratio }))}
                            />
                          </AspectRatio>
                        </Button>
                        <a
                          className="pv-tile-caption"
                          href={originalUrl(item, item.moments[0])}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open the original on ${item.platform}`}
                        >
                          <span className="pv-tile-name">{item.name}</span>
                          <span className="pv-tile-origin"><PlatformIcon platform={item.platform} />{item.platform} · {item.handle}</span>
                        </a>
                      </article>
                    )}
                  />
                  {showing && <VideoChat key={state.query} className="pv-chat-aside" query={state.query} list={state.list} />}
                </>
              ) : showing && (
                <>
                  <div className="pv-stack" data-testid="mobile-video-feed">
                    {before && (
                      <div className="pv-ghost pv-ghost-before" aria-hidden="true">
                        <img src={clipSrc(before.clip, "jpg")} alt="" />
                      </div>
                    )}
                    {after && (
                      <div className="pv-ghost pv-ghost-after" aria-hidden="true">
                        <img src={clipSrc(after.clip, "jpg")} alt="" />
                      </div>
                    )}
                    {player}
                  </div>
                  <div className="pv-source-nav pv-sr-only">
                    <Button
                      variant="quiet"
                      size="icon"
                      aria-label="Previous video source"
                      disabled={state.source === 0}
                      onClick={() => dispatch({ type: "source", step: -1 })}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <span>{`${state.source + 1} / ${state.list.length}`}</span>
                    <Button
                      variant="quiet"
                      size="icon"
                      aria-label="Next video source"
                      disabled={state.source === state.list.length - 1}
                      onClick={() => dispatch({ type: "source", step: 1 })}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                  </div>
                </>
              )}
            </div>
            {!playerOpen && state.toast && <div className="pv-toast" role="status">{state.toast.text}</div>}
            <div className="pv-sr" aria-live="polite">
              {playerVisible ? `${source.creator}, ${source.platform}. Moment ${state.moment + 1} of ${source.moments.length}. ${moment.title} ${range}.` : ""}
            </div>
          </div>
        </section>
        {/* One modal family, mutually exclusive. Radix owns focus, Escape, outside
            dismissal and scroll locking; portal content inherits Beautiful's dark scope. */}
        {wide && (
          <Dialog open={playerOpen && showing} onOpenChange={changePlayerOpen}>
            <DialogContent
              className="pv-player-dialog"
              overlayClassName="pv-modal-overlay"
              showCloseButton={false}
              onKeyDown={onKeyDown}
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                const trigger = playerReturnFocus.current;
                if (trigger?.isConnected && showing) trigger.focus({ preventScroll: true });
                else searchButtonRef.current?.focus();
              }}
            >
              <DialogTitle className="pv-sr">{source.name}</DialogTitle>
              <DialogDescription className="pv-sr">{`Matched video from ${source.platform}`}</DialogDescription>
              <div className="pv-player-layout">
                <div className="pv-player-column">
                  {player}
                </div>
              </div>
              <DialogClose asChild>
                <Button variant="quiet" size="icon" className="pv-player-close" aria-label="Close player"><X aria-hidden="true" /></Button>
              </DialogClose>
              {state.toast && <div className="pv-player-toast" role="status">{state.toast.text}</div>}
            </DialogContent>
          </Dialog>
        )}
      </div>
      {!wide && (
        <BottomSheet open={chatOpen && showing} onOpenChange={setChatOpen} snapPoints={[0.6, 0.92]} title="Ask about these videos" className="pv-chat-sheet">
          <VideoChat key={state.query} query={state.query} list={state.list} showTitle={false} className="h-full rounded-none border-0 bg-transparent" />
        </BottomSheet>
      )}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={(open) => {
          setPaletteOpen(open);
          if (!open && state.screen === "home") searchButtonRef.current?.focus();
        }}
        items={commands}
        inputLabel="What do you want to find?"
        placeholder="What do you want to find?"
        emptyMessage="Type what you want to see."
        onQueryChange={setQuery}
        className="pv-palette"
      />
    </UIThemeProvider>
  );
}
