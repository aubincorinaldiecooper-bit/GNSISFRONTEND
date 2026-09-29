// The early-access and contact forms. Neither has a page of its own: each
// opens over whatever the visitor was looking at, takes an email, and says
// in place that it arrived, in a box that keeps its size. Radix supplies the
// dialog behaviour (focus kept inside, Escape and outside-click to close,
// focus returned after); Motion supplies the fade, the settle, and the
// cross-fade when the form turns into its confirmation.

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router";

import { PATHS } from "../config";
import { DialogsContext, type Dialogs, type EarlyAccessRequest } from "../dialogContext";
import { looksLikeEmail, requestEarlyAccess, sendContactMessage, type IntakeResult } from "../intake";
import { useMotionPrefs } from "../motion";
import { Cta } from "./Cta";
import { CloseIcon } from "./Icons";

type Current =
  | { kind: "early-access"; task: string | null; source: string; returnFocus: HTMLElement | null; key: number }
  | { kind: "contact"; source: string; returnFocus: HTMLElement | null; key: number };

export function DialogsProvider({ children }: { children: ReactNode }) {
  // What was last opened stays here after closing, so the dialog keeps its
  // content while it fades out; `visible` is what actually opens and closes it.
  const [current, setCurrent] = useState<Current | null>(null);
  const [visible, setVisible] = useState(false);
  const counter = useRef(0);

  const dialogs = useMemo<Dialogs>(
    () => ({
      openEarlyAccess: ({ task = null, source, returnFocus = null }: EarlyAccessRequest) => {
        counter.current += 1;
        setCurrent({ kind: "early-access", task, source, returnFocus, key: counter.current });
        setVisible(true);
      },
      openContact: (source, returnFocus = null) => {
        counter.current += 1;
        setCurrent({ kind: "contact", source, returnFocus, key: counter.current });
        setVisible(true);
      },
    }),
    [],
  );

  const close = useCallback(() => setVisible(false), []);
  const returnFocus = current?.returnFocus ?? null;

  return (
    <DialogsContext.Provider value={dialogs}>
      {children}
      <DialogFrame open={visible && current?.kind === "early-access"} onClose={close} returnFocus={returnFocus}>
        {current?.kind === "early-access" && (
          <EarlyAccessForm key={current.key} task={current.task} source={current.source} onDone={close} />
        )}
      </DialogFrame>
      <DialogFrame open={visible && current?.kind === "contact"} onClose={close} returnFocus={returnFocus}>
        {current?.kind === "contact" && <ContactForm key={current.key} source={current.source} onDone={close} />}
      </DialogFrame>
    </DialogsContext.Provider>
  );
}

function DialogFrame({
  open,
  onClose,
  returnFocus,
  children,
}: {
  open: boolean;
  onClose: () => void;
  returnFocus: HTMLElement | null;
  children: ReactNode;
}) {
  const m = useMotionPrefs();

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="pn pn-overlay"
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={m.quick}
              >
                <Dialog.Content
                  forceMount
                  asChild
                  onCloseAutoFocus={(event) => {
                    if (returnFocus && returnFocus.isConnected) {
                      event.preventDefault();
                      returnFocus.focus();
                    }
                  }}
                >
                  <motion.div
                    className="pn-dialog"
                    initial={{ opacity: 0, y: m.reduce ? 0 : 14, scale: m.reduce ? 1 : 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: m.reduce ? 0 : 8, scale: m.reduce ? 1 : 0.985 }}
                    transition={m.spring}
                  >
                    <Dialog.Close asChild>
                      <motion.button type="button" className="pn-round pn-dialog-close" aria-label="Close" whileTap={m.tap}>
                        <CloseIcon />
                      </motion.button>
                    </Dialog.Close>
                    {children}
                  </motion.div>
                </Dialog.Content>
              </motion.div>
            </Dialog.Overlay>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** Animates its height to fit whatever it holds, so a panel grows or shrinks instead of jumping. */
function AutoHeight({ children }: { children: ReactNode }) {
  const m = useMotionPrefs();
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div animate={{ height }} initial={false} transition={m.spring} style={{ overflow: "hidden" }}>
      <div ref={inner} className="pn-autoheight-inner">
        {children}
      </div>
    </motion.div>
  );
}

/**
 * The form and its confirmation in one place, so the box keeps its size when
 * one turns into the other: both sit in the same grid cell, which is as big
 * as the form, and cross-fade where they stand. The sent form stays in that
 * cell, hidden and inert, holding the size; its "Done" takes the place of the
 * submit button.
 */
function Stage({ sent, form, done }: { sent: boolean; form: ReactNode; done: ReactNode }) {
  const m = useMotionPrefs();
  const blur = m.reduce ? "none" : "blur(4px)";
  return (
    <div className="pn-stage">
      <motion.div
        className="pn-stage-view"
        initial={false}
        animate={
          sent
            ? { opacity: 0, filter: blur, transitionEnd: { visibility: "hidden" } }
            : { opacity: 1, filter: "blur(0px)", visibility: "visible" }
        }
        transition={m.reduce ? m.quick : { duration: 0.16, ease: [0, 0, 0.2, 1] }}
        aria-hidden={sent || undefined}
        inert={sent}
      >
        {form}
      </motion.div>
      {sent && (
        <motion.div
          className="pn-stage-view pn-stage-done"
          initial={{ opacity: 0, filter: blur }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={m.reduce ? m.quick : { duration: 0.24, ease: [0.2, 0, 0, 1] }}
        >
          {done}
        </motion.div>
      )}
    </div>
  );
}

/**
 * The dialog's name and description come from the view on show. Both views
 * are in the page at once, so the hidden one's heading is plain text: Radix
 * gives its title and description a fixed id each, which must stay unique.
 */
function Title({ live, children }: { live: boolean; children: ReactNode }) {
  return live ? <Dialog.Title className="pn-dialog-title">{children}</Dialog.Title> : <h2 className="pn-dialog-title">{children}</h2>;
}

function Description({ live, children }: { live: boolean; children: ReactNode }) {
  return live ? (
    <Dialog.Description className="pn-dialog-text">{children}</Dialog.Description>
  ) : (
    <p className="pn-dialog-text">{children}</p>
  );
}

const FAILURE_TEXT: Record<Exclude<IntakeResult, { ok: true }>["reason"], string> = {
  "invalid-email": "That email address doesn’t look complete.",
  "too-many": "Too many tries from here. Please wait a few minutes and try again.",
  unavailable: "Sign-ups aren’t open right now. Please try again later.",
  failed: "That didn’t go through. Check your connection and try again.",
};

function useSubmission() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const run = useCallback(async (send: () => Promise<IntakeResult>) => {
    setState("sending");
    setError("");
    const result = await send();
    if (result.ok) {
      setState("sent");
    } else {
      setState("idle");
      setError(FAILURE_TEXT[result.reason]);
    }
  }, []);
  return { state, error, setError, run };
}

function SubmitButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  // Both labels sit in one cell so the button never changes width. Busy stays
  // on once sent, so the fading form still reads "Sending…", not its idle label.
  return (
    <Cta type="submit" disabled={busy}>
      <span className="pn-swap">
        <span aria-hidden={busy ? "true" : undefined}>{label}</span>
        <span aria-hidden={busy ? undefined : "true"}>{busyLabel}</span>
      </span>
    </Cta>
  );
}

function EarlyAccessForm({ task, source, onDone }: { task: string | null; source: string; onDone: () => void }) {
  const ids = useId();
  const { state, error, setError, run } = useSubmission();
  const [email, setEmail] = useState("");
  const sent = state === "sent";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!looksLikeEmail(email)) {
      setError("Enter your full email address, like name@example.com.");
      return;
    }
    void run(() => requestEarlyAccess(email.trim(), task, source));
  };

  return (
    <AutoHeight>
      <p className="pn-visually-hidden" role="status">
        {sent ? "Sent. You’re on the list." : ""}
      </p>
      <Stage
        sent={sent}
        done={
          <>
            <Title live>You’re on the list.</Title>
            <Description live>We saved your email, and we’ll let you know when Panoptic is ready for you.</Description>
            <p className="pn-dialog-actions pn-dialog-actions--done">
              <Cta arrow={false} onClick={onDone} autoFocus>
                Done
              </Cta>
            </p>
          </>
        }
        form={
          <form onSubmit={submit} noValidate>
            <Title live={!sent}>Get early access</Title>
            <Description live={!sent}>Leave your email and we’ll let you know when you can try Panoptic.</Description>
            <label className="pn-field" htmlFor={`${ids}-email`}>
              <span className="pn-field-label">Email</span>
            </label>
            <input
              id={`${ids}-email`}
              className="pn-input"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={254}
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${ids}-error`}
              autoFocus
            />
            <p className="pn-form-error" id={`${ids}-error`} role="alert">
              {error}
            </p>
            <p className="pn-dialog-actions">
              <SubmitButton busy={state !== "idle"} label="Get early access" busyLabel="Sending…" />
            </p>
          </form>
        }
      />
      <p className="pn-dialog-fineprint">
        {/* What they typed into the bar is still kept with the sign-up, so it is still named here. */}
        We keep your email{task ? " and what you asked" : ""} only for this. See{" "}
        <Link to={PATHS.privacy} onClick={onDone}>
          Privacy
        </Link>
        .
      </p>
    </AutoHeight>
  );
}

function ContactForm({ source, onDone }: { source: string; onDone: () => void }) {
  const ids = useId();
  const { state, error, setError, run } = useSubmission();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const sent = state === "sent";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!looksLikeEmail(email)) {
      setError("Enter your full email address, like name@example.com.");
      return;
    }
    if (!message.trim()) {
      setError("Write a message first.");
      return;
    }
    void run(() => sendContactMessage(email.trim(), message, source));
  };

  return (
    <AutoHeight>
      <p className="pn-visually-hidden" role="status">
        {sent ? "Sent. We got your message." : ""}
      </p>
      <Stage
        sent={sent}
        done={
          <>
            <Title live>Thanks. We got your message.</Title>
            <Description live>If it needs an answer, we’ll reply to {email.trim()}.</Description>
            <p className="pn-dialog-actions pn-dialog-actions--done">
              <Cta arrow={false} onClick={onDone} autoFocus>
                Done
              </Cta>
            </p>
          </>
        }
        form={
          <form onSubmit={submit} noValidate>
            <Title live={!sent}>Contact</Title>
            <Description live={!sent}>Send a message to the GNSIS.studio team.</Description>
            <label className="pn-field" htmlFor={`${ids}-email`}>
              <span className="pn-field-label">Email</span>
            </label>
            <input
              id={`${ids}-email`}
              className="pn-input"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={254}
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby={`${ids}-error`}
              autoFocus
            />
            <label className="pn-field" htmlFor={`${ids}-message`}>
              <span className="pn-field-label">Message</span>
            </label>
            <textarea
              id={`${ids}-message`}
              className="pn-input pn-textarea"
              name="message"
              required
              maxLength={5000}
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-describedby={`${ids}-error`}
            />
            <p className="pn-form-error" id={`${ids}-error`} role="alert">
              {error}
            </p>
            <p className="pn-dialog-actions">
              <SubmitButton busy={state !== "idle"} label="Send message" busyLabel="Sending…" />
            </p>
          </form>
        }
      />
      <p className="pn-dialog-fineprint">
        How we handle what you send: see{" "}
        <Link to={PATHS.privacy} onClick={onDone}>
          Privacy
        </Link>
        .
      </p>
    </AutoHeight>
  );
}
