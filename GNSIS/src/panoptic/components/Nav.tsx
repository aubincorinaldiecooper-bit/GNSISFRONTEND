// Public navigation, with a shared Beautiful-themed Radix dialog on phones.
import { useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { landingPath, PATHS, type PageId } from "../config";
import { useDialogs } from "../dialogContext";
import { Cta } from "./Cta";
import { CloseIcon, MenuIcon } from "./Icons";

type Current = "product" | "use-cases" | undefined;
export function Wordmark({ onClick }: { onClick?: () => void }) {
  return <Link to={landingPath()} className="pn-wordmark" onClick={onClick}><strong>GNSIS</strong>.studio</Link>;
}
export function Nav({ page, current, onDark = false }: { page: PageId; current?: Current; onDark?: boolean }) {
  const { openEarlyAccess } = useDialogs();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const handingOff = useRef(false);
  const close = () => setMenuOpen(false);
  return <header className="pn-nav">
    <Wordmark />
    <nav className="pn-nav-links" aria-label="Primary"><NavLinks current={current} /></nav>
    <div className="pn-nav-end">
      <Cta inverse={onDark} onClick={(event) => openEarlyAccess({ source: `${page}:nav`, returnFocus: event.currentTarget })}>Get early access</Cta>
      <Button variant="secondary" size="icon" ref={menuButton} className="pn-menu-button" aria-label="Open menu" aria-expanded={menuOpen} aria-haspopup="dialog" onClick={() => setMenuOpen(true)}><MenuIcon /></Button>
    </div>
    <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
      <DialogContent className="pn gap-6" showCloseButton={false} onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (handingOff.current) handingOff.current = false;
        else menuButton.current?.focus();
      }}>
        <DialogTitle className="sr-only">Menu</DialogTitle>
        <DialogDescription className="sr-only">Pages on GNSIS.studio</DialogDescription>
        <div className="flex items-center justify-between"><Wordmark onClick={close} />
          <DialogClose asChild><Button variant="quiet" size="icon" aria-label="Close menu"><CloseIcon /></Button></DialogClose>
        </div>
        <nav className="flex flex-col gap-4 text-lg" aria-label="Primary"><NavLinks current={current} onNavigate={close} /></nav>
        <Cta large onClick={() => {
          handingOff.current = true;
          close();
          openEarlyAccess({ source: `${page}:menu`, returnFocus: menuButton.current });
        }}>Get early access</Cta>
      </DialogContent>
    </Dialog>
  </header>;
}
function NavLinks({ current, onNavigate }: { current: Current; onNavigate?: () => void }) {
  return <>
    <Link className="pn-link" to={landingPath()} aria-current={current === "product" ? "page" : undefined} onClick={onNavigate}>Product</Link>
    <Link className="pn-link" to={PATHS.webSteering} aria-current={current === "use-cases" ? "page" : undefined} onClick={onNavigate}>Use Cases</Link>
  </>;
}
