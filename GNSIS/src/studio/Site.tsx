import { useEffect, useLayoutEffect } from "react";
import { MotionConfig } from "motion/react";
import { Outlet, useLocation } from "react-router";
import "@fontsource/inter-tight/300.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/400-italic.css";
import { EarlyAccessProvider } from "./components/EarlyAccess";

/** Light studio colours for as long as a studio page is showing; the console is dark again after. */
function useStudioSurface(): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-surface", "studio");
    root.classList.remove("dark");
    return () => {
      root.removeAttribute("data-surface");
      root.classList.add("dark");
    };
  }, []);
}

function useScrollToTopOnNavigate(): void {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
}

/** The frame shared by /models and each model's page. */
export default function StudioSite() {
  useStudioSurface();
  useScrollToTopOnNavigate();
  return (
    <MotionConfig reducedMotion="user">
      <EarlyAccessProvider>
        <div className="min-h-screen font-studio text-ink">
          <Outlet />
        </div>
      </EarlyAccessProvider>
    </MotionConfig>
  );
}
