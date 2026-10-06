import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, X } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { PATHS } from "@/panoptic/config";
import { looksLikeEmail, requestEarlyAccess, type IntakeResult } from "@/panoptic/intake";
import { EarlyAccessContext } from "../earlyAccess";
import { MODELS, type ModelId } from "../models";
import { buttonArrow, studioButton } from "../ui/variants";

const EASE = [0.23, 1, 0.32, 1] as const;

type Failure = Extract<IntakeResult, { ok: false }>["reason"];

const FAILURE_COPY: Record<Failure, string> = {
  "invalid-email": "That email doesn’t look right. Check it and try again.",
  "too-many": "Too many tries just now. Give it a minute.",
  unavailable: "Sign-ups are closed for a moment. Please try again soon.",
  failed: "Something went wrong sending that. Please try again.",
};

/** Holds the one early-access dialog every "Get started" on the studio pages opens. */
export function EarlyAccessProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("studio");
  const [developerModel, setDeveloperModel] = useState<ModelId>();
  const [attempt, setAttempt] = useState(0);
  const value = useMemo(
    () => ({
      open: (from: string, model?: ModelId) => {
        setSource(from);
        setDeveloperModel(model);
        setAttempt((n) => n + 1);
        setOpen(true);
      },
    }),
    [],
  );

  return (
    <EarlyAccessContext.Provider value={value}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <AnimatePresence>
          {open && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay forceMount asChild>
                <motion.div
                  className="fixed inset-0 z-50 bg-[oklch(0.25_0.01_260/0.22)] backdrop-blur-[3px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Dialog.Overlay>
              <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
                <Dialog.Content forceMount asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.97, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.32, ease: EASE }}
                    className="pointer-events-auto relative w-full max-w-[420px] rounded-[20px] bg-surface p-7 font-studio text-ink shadow-overlay outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  >
                    <EarlyAccessForm
                      key={attempt}
                      source={source}
                      developerModel={developerModel}
                      onDone={() => setOpen(false)}
                    />
                    <Dialog.Close
                      aria-label="Close"
                      className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--signal)]"
                    >
                      <X className="size-4" />
                    </Dialog.Close>
                  </motion.div>
                </Dialog.Content>
              </div>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </EarlyAccessContext.Provider>
  );
}

function EarlyAccessForm({
  source,
  developerModel,
  onDone,
}: {
  source: string;
  developerModel?: ModelId;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [failure, setFailure] = useState<Failure | null>(null);
  const developerName = developerModel ? MODELS.find((model) => model.id === developerModel)?.name : undefined;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "sending") return;
    if (!looksLikeEmail(email)) {
      setFailure("invalid-email");
      return;
    }
    setFailure(null);
    setState("sending");
    const result = await requestEarlyAccess(
      email.trim(),
      developerModel && text.trim() !== "" ? text : null,
      source,
    );
    if (result.ok) {
      setState("sent");
      return;
    }
    setFailure(result.reason);
    setState("idle");
  };

  if (state === "sent") {
    return (
      <div className="flex flex-col items-start">
        <span className="flex size-11 items-center justify-center rounded-full bg-ok-tint text-ok" style={{ animation: "bui-pop-in 360ms cubic-bezier(0.23,1,0.32,1) both" }}>
          <Check className="size-5" strokeWidth={2.5} />
        </span>
        <Dialog.Title className="mt-5 text-[22px] font-medium tracking-[-0.02em]">
          {developerModel ? "Request received." : "You’re on the list."}
        </Dialog.Title>
        <Dialog.Description className="mt-2 text-[15px] leading-relaxed text-ink-2">
          {developerModel
            ? `We’ll write to ${email.trim()} when your key is ready.`
            : `We’ll write to ${email.trim()} as soon as there’s a seat for you.`}
        </Dialog.Description>
        <button type="button" onClick={onDone} className={cn(studioButton({ variant: "secondary" }), "mt-7")}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <Dialog.Title className="pr-8 text-[22px] font-medium tracking-[-0.02em]">
        {developerModel ? "Request developer access" : "Get early access"}
      </Dialog.Title>
      <Dialog.Description className="mt-2 text-[15px] leading-relaxed text-ink-2">
        {developerName
          ? `Tell us what you’ll build with ${developerName}. We’ll review it and send your API key.`
          : "We’re opening GNSIS to teams a few at a time. Leave your email and we’ll reach out."}
      </Dialog.Description>
      <label htmlFor="studio-email" className="mt-6 block text-[13px] font-medium text-ink">
        Work email
      </label>
      <input
        id="studio-email"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoFocus
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-invalid={failure === "invalid-email"}
        aria-describedby={failure ? "studio-email-error" : undefined}
        placeholder="you@company.com"
        className="mt-2 h-11 w-full rounded-control bg-field px-3.5 text-[15px] text-ink shadow-inset-field outline-none transition-shadow duration-150 placeholder:text-ink-3 focus:shadow-[0_0_0_1px_var(--signal),0_0_0_4px_var(--signal-tint)]"
      />
      {developerModel && (
        <>
          <label htmlFor="studio-task" className="mt-5 block text-[13px] font-medium text-ink">
            What will you build?
          </label>
          <textarea
            id="studio-task"
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="An agent that…"
            className="mt-2 w-full resize-y rounded-control bg-field px-3.5 py-3 text-[15px] leading-relaxed text-ink shadow-inset-field outline-none transition-shadow duration-150 placeholder:text-ink-3 focus:shadow-[0_0_0_1px_var(--signal),0_0_0_4px_var(--signal-tint)]"
          />
        </>
      )}
      <AnimatePresence initial={false}>
        {failure && (
          <motion.p
            id="studio-email-error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-2 text-[13px] text-[oklch(0.55_0.19_25)]"
          >
            {FAILURE_COPY[failure]}
          </motion.p>
        )}
      </AnimatePresence>
      <button type="submit" disabled={state === "sending"} className={cn(studioButton({ variant: "primary", size: "lg" }), "mt-6 w-full")}>
        {state === "sending" ? "Sending…" : "Request access"}
        {state !== "sending" && <ArrowRight aria-hidden className={buttonArrow} />}
      </button>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">
        {developerModel
          ? "We only use what you send to review your request and contact you about access."
          : "We only use your email to contact you about early access."}{" "}
        <Link to={PATHS.privacy} className="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink">
          Privacy
        </Link>
      </p>
    </form>
  );
}
