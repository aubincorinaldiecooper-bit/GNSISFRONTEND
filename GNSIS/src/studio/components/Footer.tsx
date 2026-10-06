import { Link } from "react-router";
import { PATHS } from "@/panoptic/config";
import { STUDIO_PATHS, studioHomePath } from "../config";

const linkClass = "rounded-chip text-ink-2 transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--signal)]";

export function StudioFooter() {
  return (
    <footer className="relative border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-ink-3">GNSIS Research · Toronto, Canada</p>
        <nav aria-label="Footer" className="flex items-center gap-5">
          <Link to={studioHomePath()} className={linkClass}>Lab</Link>
          <Link to={STUDIO_PATHS.models} className={linkClass}>Models</Link>
          <Link to={STUDIO_PATHS.developers} className={linkClass}>Developers</Link>
          <Link to={PATHS.privacy} className={linkClass}>Privacy</Link>
          <Link to={PATHS.terms} className={linkClass}>Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
