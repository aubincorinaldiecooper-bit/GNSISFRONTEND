import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { looksLikeEmail, requestEarlyAccess } from "@/panoptic/intake";
import { FAILURE_COPY, type Failure } from "../earlyAccess";

const EASE = [0.23, 1, 0.32, 1] as const;
const SWAP = {
  initial: { opacity: 0, filter: "blur(4px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(4px)" },
  transition: { duration: 0.2 },
} as const;

const HEIGHT = { sm: "h-8 text-[13px]", md: "h-10 text-sm", lg: "h-12 text-[15px]" } as const;
const FIELD = { sm: "w-[min(170px,44vw)]", md: "w-[min(210px,50vw)]", lg: "w-[min(240px,56vw)]" } as const;

/** "Request early access" opens in place into an email field; submitting joins the early-access list. */
export function EarlyAccessButton({
  source,
  size = "lg",
  tone = "ink",
  className,
}: {
  source: string;
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "light";
  className?: string;
}) {
  const [step, setStep] = useState<"closed" | "open" | "sending" | "sent">("closed");
  const [email, setEmail] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const light = tone === "light";

  useEffect(() => {
    if (step === "open") input.current?.focus();
  }, [step]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === "sending") return;
    if (!looksLikeEmail(email)) {
      setFailure("invalid-email");
      return;
    }
    setFailure(null);
    setStep("sending");
    const result = await requestEarlyAccess(email.trim(), null, source);
    if (result.ok) {
      setStep("sent");
      return;
    }
    setFailure(result.reason);
    setStep("open");
  };

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <motion.div
        layout
        transition={{ layout: { duration: 0.38, ease: EASE } }}
        style={{ borderRadius: 999 }}
        className={cn(
          "inline-flex items-center overflow-hidden font-medium",
          HEIGHT[size],
          light ? "bg-white text-[#0b1220]" : "bg-ink text-page",
          "focus-within:shadow-[0_0_0_2px_var(--page),0_0_0_4px_var(--signal)]",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {step === "closed" ? (
            <motion.button
              key="try"
              type="button"
              {...SWAP}
              onClick={() => setStep("open")}
              className={cn("h-full outline-none active:scale-[0.96]", size === "sm" ? "px-4" : "px-6")}
            >
              Request early access
            </motion.button>
          ) : step === "sent" ? (
            <motion.p key="sent" role="status" {...SWAP} className={cn("flex items-center gap-2", size === "sm" ? "px-3.5" : "px-6")}>
              <Check aria-hidden className="size-4" strokeWidth={2.5} />
              You’re on the list
            </motion.p>
          ) : (
            <motion.form key="form" {...SWAP} onSubmit={submit} noValidate className="flex h-full items-center pl-4 pr-1">
              <label htmlFor={id} className="sr-only">
                Your email, for early access
              </label>
              <input
                ref={input}
                id={id}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Your email"
                value={email}
                disabled={step === "sending"}
                aria-invalid={failure !== null}
                aria-describedby={failure ? `${id}-error` : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFailure(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && email === "") setStep("closed");
                }}
                className={cn(
                  "h-full bg-transparent font-normal outline-none",
                  FIELD[size],
                  light ? "placeholder:text-[#0b1220]/45" : "placeholder:text-page/55",
                )}
              />
              <button
                type="submit"
                aria-label="Request early access"
                disabled={step === "sending"}
                className={cn(
                  "flex aspect-square h-[calc(100%-8px)] items-center justify-center rounded-full outline-none transition-transform duration-150 active:scale-[0.92]",
                  light ? "bg-[#0b1220] text-white" : "bg-page text-ink",
                )}
              >
                {step === "sending" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <ArrowRight aria-hidden className="size-4" />}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
      {failure && (
        <p id={`${id}-error`} role="alert" className={cn("absolute top-full mt-2 whitespace-nowrap text-[13px]", light ? "text-white" : "text-ink-2")}>
          {FAILURE_COPY[failure]}
        </p>
      )}
    </div>
  );
}
