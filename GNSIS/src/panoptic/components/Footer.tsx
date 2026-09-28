// Every Panoptic page ends here. The link columns list only what exists:
// Video search, Vision, Research and News stay off until they are real.

import { Link } from "react-router";

import { PATHS, type PageId } from "../config";
import { useDialogs } from "../dialogContext";

export function Footer({ page }: { page: PageId }) {
  const { openContact } = useDialogs();
  return (
    <footer className="pn-footer">
      <div className="pn-footer-inner">
        <div className="pn-footer-top">
          <div>
            <p className="pn-footer-mark">Panoptic</p>
            <p className="pn-footer-tag">you ask. Panoptic remembers.</p>
          </div>
          <nav className="pn-footer-cols" aria-label="Footer">
            <div>
              <p className="pn-footer-head" id="pn-foot-product">
                Product
              </p>
              <ul aria-labelledby="pn-foot-product">
                <li>
                  <Link className="pn-link" to={PATHS.webSteering}>
                    Agentic web steering
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="pn-footer-head" id="pn-foot-company">
                Company
              </p>
              <ul aria-labelledby="pn-foot-company">
                <li>
                  <button
                    type="button"
                    className="pn-linkbutton"
                    aria-haspopup="dialog"
                    onClick={(event) => openContact(`${page}:footer`, event.currentTarget)}
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <p className="pn-footer-head" id="pn-foot-legal">
                Legal
              </p>
              <ul aria-labelledby="pn-foot-legal">
                <li>
                  <Link className="pn-link" to={PATHS.privacy}>
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link className="pn-link" to={PATHS.terms}>
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <p className="pn-copyright">© {new Date().getFullYear()} GNSIS.studio</p>
      </div>
    </footer>
  );
}
