// The frame every Panoptic page renders in: the design's fonts and
// stylesheet, the light ground, reduced-motion handling, and the two forms.
// Loaded on its own (see main.tsx), so the console never downloads it and it
// never waits on the console's session check or theme.

import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";
import "./panoptic.css";

import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router";

import { DialogsProvider } from "./components/Dialogs";

/** Paints the page ground light while a Panoptic page is showing. index.html sets it before first paint. */
function useLightSurface() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-surface", "panoptic");
    return () => root.removeAttribute("data-surface");
  }, []);
}

/** A new page starts at the top; going back keeps the browser's place. */
function useScrollToTopOnNavigate() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type !== "POP") window.scrollTo(0, 0);
  }, [pathname, type]);
}

export default function PanopticSite() {
  useLightSurface();
  useScrollToTopOnNavigate();
  return (
    <MotionConfig reducedMotion="user">
      <div className="pn">
        <DialogsProvider>
          <Outlet />
        </DialogsProvider>
      </div>
    </MotionConfig>
  );
}
