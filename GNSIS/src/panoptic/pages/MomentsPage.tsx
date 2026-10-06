// Beautiful UI video search: desktop preview bento + one Radix player;
// phones keep the vertical swipe feed. Results are static sample data;
// data/navigation contracts live in moments/model.ts.
import "@fontsource-variable/geist";
import "../moments/moments.css";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ComponentProps, CSSProperties, KeyboardEvent, PointerEvent } from "react";
import {
  DEFAULT_QUERY, SOURCES, currentMoment, formatTime, initialMomentsState,
  masonryColumns, momentsReducer, originalUrl, swipeIntent, type MomentsAction,
} from "../moments/model";
import {
  ArrowDown, ArrowUp, BatteryFull, Captions, CaptionsOff,
  Instagram, Pause, Play, Search, Signal, Twitch, Video,
  Volume2, VolumeX, Wifi, X, Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/ui/chat-composer";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { UIThemeProvider } from "@/components/ui/theme";
import { motion } from "motion/react";
import { useMotionPrefs } from "../motion";
import { LANDING_META } from "../pageMeta";
import { usePageMeta } from "../usePageMeta";
import AccountMenu from "../components/AccountMenu";

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
/** Sample clips are portrait; tiles take their own ratio once metadata arrives. */
const DEFAULT_RATIO = 9 / 16;
const SKELETON_RATIOS = [9 / 16, 4 / 5, 9 / 16];
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const clipSrc = (name: string, ext: "mp4" | "jpg") => `/videos/panoptic/${name}.${ext}`;
const PLATFORM_ICONS = { YouTube: Youtube, TikTok: Video, Instagram, Twitch };
const PLATFORMS = Object.keys(PLATFORM_ICONS);

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
const HERO_STEPS = SOURCES.flatMap((source) => source.moments.map((moment) => ({ source, moment })));
function HomePreview({ active }: { active: boolean }) {
  const still = useMediaQuery(REDUCED_MOTION);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active || still) return;
    const timer = setInterval(() => setStep((n) => (n + 1) % HERO_STEPS.length), 2600);
    return () => clearInterval(timer);
  }, [active, still]);
  const front = HERO_STEPS[step];
  const at = SOURCES.indexOf(front.source);
  return (
    <div className="pv-hero" aria-hidden="true">
      {SOURCES.map((source, i) => {
        const isFront = i === at;
        const role = isFront ? "is-front" : i === (at + 1) % SOURCES.length ? "is-next" : "is-back";
        return (
          <div key={source.id} className={`pv-hero-card ${role}`}>
            <PreviewVideo
              active={active && isFront}
              src={clipSrc(source.clip, "mp4")}
              poster={clipSrc(source.clip, "jpg")}
            />
            <div className="pv-scrim" />
            <div className="pv-hero-bars">
              <span className={isFront ? "is-active" : ""}><span key={isFront ? step : 0} /></span>
            </div>
            <div className="pv-hero-creator"><SourceTag handle={source.handle} platform={source.platform} /></div>
            <p className="pv-hero-caption">{(isFront ? front.moment : source.moments[0]).why}</p>
          </div>
        );
      })}
    </div>
  );
}
interface Clip {
  name: string;
  handle: string;
  platform: string;
  why: string;
}
const CLIPS = {
  espresso: { name: "espresso", handle: "homebarista", platform: "YouTube", why: "Pulling a shot on a home espresso machine." },
  louvre: { name: "louvre", handle: "parisonfoot", platform: "Instagram", why: "Through the archway into the Louvre courtyard." },
  gloss: { name: "gloss", handle: "glownotes", platform: "TikTok", why: "A berry lip gloss, up close." },
  palette: { name: "palette", handle: "studiohours", platform: "YouTube", why: "Setting out yellow and white paint." },
} satisfies Record<string, Clip>;
const FEATURES = [
  { id: "ask", title: "Search what happens, not what it's called.", body: "Titles and tags miss most of what's in a video. Panoptic looks at what's shown and said, so results match what you described, not just the keywords." },
  { id: "moment", title: "Land on the exact moment.", body: "Every result opens at the second that answers you. Tap the sides of the video to jump between the other matching moments, or drag the bar to scrub." },
  { id: "next", title: "Swipe for the next source.", body: "Swipe up for another video that answers the same question, wherever it was posted. Like a feed, except every video is on topic." },
  { id: "source", title: "Always one tap from the original.", body: "Tap the source line on any video to open the original on its platform, so you can check it for yourself." },
] as const;
function MiniCard({ clip, play }: { clip: Clip; play: boolean }) {
  return (
    <div className="pv-fp-card">
      {play ? (
        <PreviewVideo active={play} src={clipSrc(clip.name, "mp4")} poster={clipSrc(clip.name, "jpg")} />
      ) : (
        <img src={clipSrc(clip.name, "jpg")} alt="" />
      )}
      <div className="pv-scrim" />
      <div className="pv-hero-bars"><span className="is-active"><span /></span></div>
      <div className="pv-hero-creator"><SourceTag handle={clip.handle} platform={clip.platform} /></div>
      <p className="pv-fp-why">{clip.why}</p>
    </div>
  );
}
function FeatureScreen({ id, active, play }: { id: (typeof FEATURES)[number]["id"]; active: boolean; play: boolean }) {
  if (id === "ask") {
    return (
      <div className="pv-fp-ask">
        <div className="pv-fp-brand"><span className="pv-logo">◉</span> panoptic</div>
        <HomePreview active={active} />
        <p className="pv-fp-headline">Just the part<br />you want to watch.</p>
        <ChatComposer
          className="pv-fp-search"
          variant="pill"
          value={DEFAULT_QUERY}
          onValueChange={() => {}}
          onSubmit={() => {}}
          label="Example search"
          hideSubmit
          leading={<Search aria-hidden="true" />}
          textareaProps={{ rows: 1, readOnly: true, tabIndex: -1 }}
        />
      </div>
    );
  }
  if (id === "moment") {
    return <><MiniCard clip={CLIPS.espresso} play={play} /><span className="pv-fp-tap" /></>;
  }
  if (id === "next") {
    return (
      <>
        <div className="pv-fp-strip">
          {[CLIPS.louvre, CLIPS.espresso, CLIPS.gloss, CLIPS.louvre].map((clip, i) => (
            <div key={i} className="pv-fp-slide"><MiniCard clip={clip} play={play} /></div>
          ))}
        </div>
        <span className="pv-fp-swipe"><ArrowUp aria-hidden="true" /></span>
      </>
    );
  }
  return (
    <>
      <MiniCard clip={CLIPS.palette} play={play} />
      <span className="pv-fp-tap pv-fp-tap-source" />
    </>
  );
}
function Features({ active, play, onTry }: { active: boolean; play: boolean; onTry: () => void }) {
  return (
    <section className="pv-features" aria-label="How Panoptic works">
      {FEATURES.map((f, i) => (
        <article key={f.id} className={`pv-feature${i % 2 ? " is-flipped" : ""}`}>
          <div className="pv-fp" aria-hidden="true" inert>
            <div className="pv-fp-status">
              <span>9:41</span>
              <span className="pv-status-icons"><Signal /><Wifi /><BatteryFull /></span>
            </div>
            <div className="pv-fp-screen"><FeatureScreen id={f.id} active={active} play={play} /></div>
          </div>
          <div className="pv-feature-copy">
            <h2>{f.title}</h2>
            <p>{f.body}</p>
            {f.id === "next" && (
              <ul className="pv-platforms" aria-label="Platforms">
                {PLATFORMS.map((p) => <li key={p}><PlatformIcon platform={p} />{p}</li>)}
              </ul>
            )}
          </div>
        </article>
      ))}
      <div className="pv-features-end">
        <h2>What do you want to find?</h2>
        <Button variant="primary" onClick={onTry}>Try it</Button>
      </div>
    </section>
  );
}

export default function MomentsPage() {
  usePageMeta(LANDING_META.title, LANDING_META.description);
  const [state, dispatch] = useReducer(momentsReducer, undefined, initialMomentsState);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [nextQuery, setNextQuery] = useState("");
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
  const queryRef = useRef<HTMLTextAreaElement>(null);
  const homeRef = useRef<HTMLDivElement>(null);
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
    if (state.screen === "home" && previousScreen.current !== "home") queryRef.current?.focus();
    previousScreen.current = state.screen;
  }, [state.screen]);

  const tryIt = () => {
    homeRef.current?.scrollTo?.({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
    queryRef.current?.focus({ preventScroll: true });
  };
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
            <div className="pv-view pv-home" ref={homeRef} hidden={state.screen !== "home"}>
              <header className="pv-brand">
                <span className="pv-logo">◉</span> panoptic
                {state.screen === "home" && accountMenu}
              </header>
              <HomePreview active={state.screen === "home" && !wide} />
              <div className="pv-home-main">
                {wide && (
                  <PreviewVideo
                    active={state.screen === "home"}
                    className="pv-home-backdrop"
                    src={clipSrc("kitchen", "mp4")}
                    poster={clipSrc("kitchen", "jpg")}
                    aria-hidden="true"
                  />
                )}
                <div className="pv-home-copy">
                  <h1>Just the part<br />you want to watch.</h1>
                  <p>Ask anything. Panoptic finds the videos that answer it and starts right at the part that matters.</p>
                </div>
                <ChatComposer
                  className="pv-home-search"
                  variant="pill"
                  value={query}
                  onValueChange={setQuery}
                  onSubmit={(text) => {
                    setActivePreview(0);
                    dispatch({ type: "search", query: text });
                  }}
                  label="What do you want to find?"
                  placeholder="What do you want to find?"
                  hideSubmit
                  leading={<Search aria-hidden="true" />}
                  textareaRef={queryRef}
                  textareaProps={{ id: "pv-query", rows: 1, autoComplete: "off", enterKeyHint: "search" }}
                />
              </div>
              {wide && (
                <Features
                  active={state.screen === "home"}
                  play={state.screen === "home" && !reducedMotion}
                  onTry={tryIt}
                />
              )}
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
                  <ChatComposer
                    className="pv-desktop-search"
                    variant="pill"
                    value={nextQuery}
                    onValueChange={setNextQuery}
                    onSubmit={(text) => {
                      setQuery(text);
                      setNextQuery("");
                      dispatch({ type: "search", query: text });
                    }}
                    label="Search again"
                    placeholder="Try 'how to replace spark plugs'"
                    hideSubmit
                    leading={<Search aria-hidden="true" />}
                    textareaProps={{ rows: 1, autoComplete: "off", enterKeyHint: "search" }}
                  />
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
                  <div className="pv-bento" data-count={state.list.length} role="group" aria-label="Matching video previews">
                    {(() => {
                      const placement = masonryColumns(state.list.map((item) => ratios[item.id] ?? DEFAULT_RATIO), columnCount);
                      return Array.from({ length: columnCount }, (_, c) => (
                        <div key={c} className="pv-masonry-col">
                          {state.list.map((item, i) => placement[i] === c && (
                            <motion.article
                              key={item.id}
                              className="pv-preview-card"
                              style={{ "--pv-ratio": ratios[item.id] ?? DEFAULT_RATIO } as CSSProperties}
                              initial={m.reduce ? false : { opacity: 0, y: 24 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true, amount: 0.2 }}
                              transition={m.reduce ? { duration: 0 } : { duration: 0.5, delay: Math.min(i, 3) * 0.06, ease: [0.2, 0, 0, 1] }}
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
                                <span className="pv-preview-media">
                                  <PreviewVideo
                                    active={showing && !playerOpen && activePreview === i}
                                    src={clipSrc(item.clip, "mp4")}
                                    poster={clipSrc(item.clip, "jpg")}
                                    aria-hidden="true"
                                    onAspect={(ratio) => setRatios((r) => (r[item.id] === ratio ? r : { ...r, [item.id]: ratio }))}
                                  />
                                </span>
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
                            </motion.article>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
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
                else queryRef.current?.focus();
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
    </UIThemeProvider>
  );
}
