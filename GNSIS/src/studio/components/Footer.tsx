import type { ReactNode } from "react";
import { Link } from "react-router";
import { PATHS } from "@/panoptic/config";
import { MAC_DOWNLOAD_URL, STUDIO_PATHS, studioHomePath } from "../config";
import { useEarlyAccess } from "../earlyAccess";
import { useIsMobileDevice, useMacDownload } from "./macDownload";

const linkClass =
  "rounded-chip text-[14.5px] text-ink-2 transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--signal)]";

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-[14.5px] font-medium text-ink">{title}</h2>
      <ul className="mt-4 space-y-3">{children}</ul>
    </div>
  );
}

export function StudioFooter() {
  const { open } = useEarlyAccess();
  const home = studioHomePath();
  const mobile = useIsMobileDevice();
  const download = useMacDownload();
  return (
    <footer className="relative border-t border-line">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-14 sm:px-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:gap-12 md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <Link to={home} className="col-span-2 flex items-center gap-2 self-start justify-self-start md:col-span-1 rounded-chip text-[19px] font-semibold tracking-[0.06em] text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--signal)]">
            <img src="/brand/gnsis-mark.png" alt="" width={28} height={28} className="size-7" />
            GNSIS
          </Link>
          <nav aria-label="Footer" className="contents">
            <Column title="Product">
              <li>
                {mobile ? (
                  <span className="text-[14.5px] text-ink-3">Available on Mac</span>
                ) : (
                  <a href={MAC_DOWNLOAD_URL} onClick={download.onClick} className={linkClass}>Download for Mac</a>
                )}
                {download.dialog}
              </li>
              <li><a href={`${home}#how`} className={linkClass}>How it works</a></li>
              <li><a href={`${home}#models`} className={linkClass}>GNSIS 0.5 and 1.0</a></li>
              <li><a href={`${home}#faq`} className={linkClass}>FAQ</a></li>
            </Column>
            <Column title="Developers">
              <li><Link to={STUDIO_PATHS.developersPanoptic} className={linkClass}>Panoptic API</Link></li>
            </Column>
            <Column title="Company">
              <li><Link to={home} className={linkClass}>About GNSIS</Link></li>
              <li>
                <button type="button" onClick={() => open("footer:contact")} className={linkClass}>
                  Contact us
                </button>
              </li>
            </Column>
            <Column title="Legal">
              <li><Link to={PATHS.privacy} className={linkClass}>Privacy Policy</Link></li>
              <li><Link to={PATHS.terms} className={linkClass}>Terms of Service</Link></li>
            </Column>
          </nav>
        </div>
        <p className="mt-14 border-t border-line pt-6 text-[13px] text-ink-3">© 2026 GNSIS · Built in Toronto, Canada</p>
      </div>
    </footer>
  );
}
