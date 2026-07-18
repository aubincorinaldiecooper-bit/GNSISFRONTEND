import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ApiError,
  getAutoRefill,
  isApiConfigured,
  saveAutoRefill,
  type AutoRefillAttempt,
  type AutoRefillConfig,
} from "@/lib/api";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function money(v: string | null | undefined): string {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return "$0.00";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function shortDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const attemptLabel: Record<string, string> = {
  succeeded: "Succeeded",
  processing: "Processing",
  requires_action: "Needs authentication",
  failed: "Failed",
  pending: "Pending",
  cancelled: "Cancelled",
};

interface FormState {
  enabled: boolean;
  threshold: string;
  refill_amount: string;
  max_refill_amount: string;
  max_refills_per_day: string;
  daily_cap: string;
  monthly_cap: string;
  consent: boolean;
}

function toForm(c: AutoRefillConfig): FormState {
  return {
    enabled: c.enabled,
    threshold: c.threshold,
    refill_amount: c.refill_amount,
    max_refill_amount: c.max_refill_amount,
    max_refills_per_day: String(c.max_refills_per_day || 3),
    daily_cap: c.daily_cap,
    monthly_cap: c.monthly_cap ?? "",
    consent: c.consent,
  };
}

function LabeledNumber({
  label, value, onChange, prefix, min = 0,
}: {
  label: string; value: string; onChange: (v: string) => void; prefix?: string; min?: number;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-9", prefix && "pl-7")}
        />
      </div>
    </div>
  );
}

export default function AutoRefillSection({
  hasCard,
  onManagePayment,
}: {
  hasCard: boolean;
  onManagePayment?: () => void;
}) {
  const configured = isApiConfigured();
  const [config, setConfig] = useState<AutoRefillConfig | null>(null);
  const [attempts, setAttempts] = useState<AutoRefillAttempt[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(configured);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!isApiConfigured()) return;
    try {
      const state = await getAutoRefill();
      setConfig(state.config);
      setAttempts(state.attempts);
      setForm((prev) => prev ?? toForm(state.config));
      setError(null);
    } catch {
      // leave the section empty on load failure; billing summary shows errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // load() only calls setState after an await — not a synchronous cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSaved(false);
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await saveAutoRefill({
        enabled: form.enabled,
        threshold: form.threshold || "0",
        refill_amount: form.refill_amount || "0",
        max_refill_amount: form.max_refill_amount || form.refill_amount || "0",
        max_refills_per_day: Number(form.max_refills_per_day) || 1,
        daily_cap: form.daily_cap || "0",
        monthly_cap: form.monthly_cap.trim() ? form.monthly_cap : null,
        consent: form.consent,
      });
      setConfig(updated);
      setForm(toForm(updated));
      setSaved(true);
      void load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save auto-refill settings.");
    } finally {
      setSaving(false);
    }
  };

  const lastAttempt = attempts[0];
  const canEnable = form?.consent && hasCard;

  return (
    <section className="border-b border-border pb-8 mb-8">
      <div className="flex items-center justify-between mb-2 gap-4">
        <h2 className="text-sm font-semibold text-foreground">Auto-refill</h2>
        {config?.active ? (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Active
          </span>
        ) : config?.paused ? (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            Paused
          </span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground bg-neutral-100 px-2 py-0.5 rounded-full">
            Off
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
        Automatically top up your balance from your saved card when it runs low. Charges
        happen off-session within the limits you set.
      </p>

      {loading && !form && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {config?.paused && config.pause_reason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            {config.pause_reason}. Re-enable below to resume.
          </p>
        </div>
      )}

      {form && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-4">
          {/* Enable toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Enable auto-refill</p>
              <p className="text-xs text-muted-foreground">
                {hasCard ? "Uses your default saved card." : "Add a payment method first."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("enabled", !form.enabled)}
              disabled={!hasCard && !form.enabled}
              className={cn(
                "relative shrink-0 inline-flex h-5 w-9 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40",
                form.enabled ? "bg-neutral-900" : "bg-neutral-300"
              )}
              aria-label={form.enabled ? "Disable auto-refill" : "Enable auto-refill"}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 inline-flex h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                  form.enabled && "translate-x-4"
                )}
              />
            </button>
          </div>

          {!hasCard && (
            <div className="rounded-lg border border-dashed border-border p-3 flex items-center gap-2">
              <p className="text-xs text-muted-foreground flex-1">
                A saved payment method is required to enable auto-refill.
              </p>
              {onManagePayment && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onManagePayment}>
                  Add card
                </Button>
              )}
            </div>
          )}

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <LabeledNumber label="When balance falls below" prefix="$" value={form.threshold}
              onChange={(v) => set("threshold", v)} />
            <LabeledNumber label="Refill amount" prefix="$" value={form.refill_amount}
              onChange={(v) => set("refill_amount", v)} />
            <LabeledNumber label="Max per refill" prefix="$" value={form.max_refill_amount}
              onChange={(v) => set("max_refill_amount", v)} />
            <LabeledNumber label="Max refills per day" value={form.max_refills_per_day}
              onChange={(v) => set("max_refills_per_day", v)} min={1} />
            <LabeledNumber label="Daily cap" prefix="$" value={form.daily_cap}
              onChange={(v) => set("daily_cap", v)} />
            <LabeledNumber label="Monthly cap (optional)" prefix="$" value={form.monthly_cap}
              onChange={(v) => set("monthly_cap", v)} />
          </div>

          {/* Consent */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => set("consent", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              I authorize GNSIS to charge my saved payment method off-session to refill my
              balance according to these limits, until I turn this off.
              {config?.consent && config.consent_at && (
                <span className="block text-[11px] text-muted-foreground/70 mt-0.5">
                  Authorized {shortDateTime(config.consent_at)}.
                </span>
              )}
            </span>
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
              <span className="text-xs text-red-700">{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={save}
              disabled={saving || (form.enabled && !canEnable)}
              className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5"
              size="sm"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Save auto-refill
            </Button>
            {saved && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
          </div>
        </div>
      )}

      {/* Last attempt */}
      {lastAttempt && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Last attempt
          </p>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5">
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full shrink-0",
                lastAttempt.status === "succeeded" && "text-emerald-600 bg-emerald-50",
                lastAttempt.status === "failed" && "text-red-600 bg-red-50",
                (lastAttempt.status === "requires_action") && "text-amber-600 bg-amber-50",
                (lastAttempt.status === "processing" || lastAttempt.status === "pending") &&
                  "text-muted-foreground bg-neutral-100"
              )}
            >
              {attemptLabel[lastAttempt.status] ?? lastAttempt.status}
            </span>
            <span className="text-sm text-foreground">{money(lastAttempt.refill_amount)}</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {shortDateTime(lastAttempt.created_at)}
            </span>
          </div>
          {lastAttempt.failure_message && (
            <p className="text-xs text-red-600 mt-1.5">{lastAttempt.failure_message}</p>
          )}
        </div>
      )}
    </section>
  );
}
