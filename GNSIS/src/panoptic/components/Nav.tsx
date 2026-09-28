// The top bar: wordmark, Product and Use Cases, and "Get early access". On a
// phone the links fold into a full-screen menu behind ☰. Research is left out
// until there is a Research page: the bar only names things that exist.

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Link } from "react-router";

import { landingPath, PATHS, type PageId } from "../config";
import { useDialogs } from "../dialogContext";
import { useMotionPrefs } from "../motion";
import { Cta } from "./Cta";
import { CloseIcon, MenuIcon } from "./Icons";

type Current = "product" | "use-cases" | undefined;

export function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link to={landingPath()} className="pn-wordmark" onClick={onClick}>
      <strong>GNSIS</strong>.studio
    </Link>
  );
}

export function Nav({ page, current, onDark = false }: { page: PageId; current?: Current; onDark?: boolean }) {
  const { openEarlyAccess } = useDialogs();
  const [menuOpen, setMenuOpen] = useState(false);
  const m = useMotionPrefs();
  const menuButton = useRef<HTMLButtonElement>(null);

  return (
    <header className="pn-nav">
      <Wordmark />
      <nav className="pn-nav-links" aria-label="Primary">
        <NavLinks current={current} />
      </nav>
      <div className="pn-nav-end">
        <Cta inverse={onDark} onClick={(event) => openEarlyAccess({ source: `${page}:nav`, returnFocus: event.currentTarget })}>
          Get early access
        </Cta>
        <motion.button
          ref={menuButton}
          type="button"
          className="pn-round pn-menu-button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          onClick={() => setMenuOpen(true)}
          whileTap={m.tap}
        >
          <MenuIcon />
        </motion.button>
      </div>
      <MobileMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        current={current}
        onEarlyAccess={() => {
          setMenuOpen(false);
          openEarlyAccess({ source: `${page}:menu`, returnFocus: menuButton.current });
        }}
      />
    </header>
  );
}

function NavLinks({ current, onNavigate }: { current: Current; onNavigate?: () => void }) {
  return (
    <>
      <Link className="pn-link" to={landingPath()} aria-current={current === "product" ? "page" : undefined} onClick={onNavigate}>
        Product
      </Link>
      <Link className="pn-link" to={PATHS.webSteering} aria-current={current === "use-cases" ? "page" : undefined} onClick={onNavigate}>
        Use Cases
      </Link>
    </>
  );
}

function MobileMenu({
  open,
  onOpenChange,
  current,
  onEarlyAccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: Current;
  onEarlyAccess: () => void;
}) {
  const m = useMotionPrefs();
  const handingOff = useRef(false);
  const close = () => onOpenChange(false);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Content
              forceMount
              asChild
              onCloseAutoFocus={(event) => {
                // Going on to the early-access form: that form owns focus now.
                if (handingOff.current) {
                  handingOff.current = false;
                  event.preventDefault();
                }
              }}
            >
              <motion.div
                className="pn pn-menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={m.quick}
              >
                <Dialog.Title className="pn-visually-hidden">Menu</Dialog.Title>
                <Dialog.Description className="pn-visually-hidden">Pages on GNSIS.studio</Dialog.Description>
                <div className="pn-menu-top">
                  <Wordmark onClick={close} />
                  <Dialog.Close asChild>
                    <motion.button type="button" className="pn-round" aria-label="Close menu" whileTap={m.tap}>
                      <CloseIcon />
                    </motion.button>
                  </Dialog.Close>
                </div>
                <nav aria-label="Primary">
                  <ul className="pn-menu-links">
                    <li>
                      <Link to={landingPath()} aria-current={current === "product" ? "page" : undefined} onClick={close}>
                        Product
                      </Link>
                    </li>
                    <li>
                      <Link to={PATHS.webSteering} aria-current={current === "use-cases" ? "page" : undefined} onClick={close}>
                        Use Cases
                      </Link>
                    </li>
                  </ul>
                </nav>
                <Cta
                  large
                  className="pn-menu-cta"
                  onClick={() => {
                    handingOff.current = true;
                    onEarlyAccess();
                  }}
                >
                  Get early access
                </Cta>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
