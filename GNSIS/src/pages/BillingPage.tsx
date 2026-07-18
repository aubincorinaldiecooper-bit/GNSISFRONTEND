import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  AlertTriangle,
  ChevronRight,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import AutoRefillSection from "@/components/AutoRefillSection";
import {
  ApiError,
  createPortalSession,
  createRefill,
  getBillingSummary,
  getTransactions,
  getUsageLedger,
  isApiConfigured,
  type BillingSummary,
  type LedgerEntry,
  type TransactionType,
  type UsageLedgerItem,
} from "@/lib/api";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Format an exact-decimal-string amount for display only (never for arithmetic). */
function money(value: string | number | null | undefined, maxFrac = 2): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!isFinite(n)) return "$0.00";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFrac,
  });
}

function shortDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shortModel(model: string): string {
  if (!model) return "—";
  const slash = model.indexOf("/");
  return slash >= 0 ? model.slice(slash + 1) : model;
}

// =============================================================================
// BALANCE
// =============================================================================

function BalanceSection({ summary }: { summary: BillingSummary }) {
  const available = Number(summary.available);
  const isLow = isFinite(available) && available < 5;
  const hasReserved = Number(summary.reserved) > 0;

  return (
    <section className="border-b border-border pb-8 mb-8">
      <h2 className="text-sm font-semibold text-foreground mb-5">Balance</h2>

      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available balance
            </p>
            <p
              className={cn(
                "text-2xl font-bold",
                isLow ? "text-amber-600" : "text-foreground"
              )}
            >
              {money(summary.available)}
            </p>
          </div>
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-neutral-100 shrink-0">
            <Wallet className="h-4 w-4 text-neutral-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-1">
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-sm font-semibold text-foreground">{money(summary.balance)}</p>
          </div>
          {hasReserved && (
            <div>
              <p className="text-xs text-muted-foreground">Reserved (pending)</p>
              <p className="text-sm font-semibold text-foreground">{money(summary.reserved)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Spent this month</p>
            <p className="text-sm font-semibold text-foreground">{money(summary.spent_this_month)}</p>
          </div>
        </div>

        {isLow && (
          <div className="flex items-center gap-2 pt-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-600">
              Running low — refill to keep runs going.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

// =============================================================================
// REFILL
// =============================================================================

const refillAmounts = [10, 25, 50] as const;

function RefillSection({ enabled }: { enabled: boolean }) {
  const [refillOpen, setRefillOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | "custom">(10);
  const [customValue, setCustomValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount =
    selectedAmount === "custom" ? customValue.trim() : String(selectedAmount);

  const handleConfirm = async () => {
    if (!amount || Number(amount) <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await createRefill(amount);
      window.location.href = session.url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start the refill.");
      setSubmitting(false);
    }
  };

  return (
    <section className="border-b border-border pb-8 mb-8">
      <h2 className="text-sm font-semibold text-foreground mb-2">Refill balance</h2>
      <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
        Add a one-time prepaid balance to your workspace. You'll be taken to Stripe to
        complete payment; your balance updates once the payment is confirmed.
      </p>

      {enabled ? (
        <div className="flex flex-wrap gap-2">
          {refillAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setSelectedAmount(amt);
                setError(null);
                setRefillOpen(true);
              }}
              className={cn(
                "h-9 px-4 rounded-lg border text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                "border-border bg-white text-foreground hover:bg-black/[0.03]"
              )}
            >
              {money(amt)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setSelectedAmount("custom");
              setCustomValue("");
              setError(null);
              setRefillOpen(true);
            }}
            className={cn(
              "h-9 px-4 rounded-lg border text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "border-border bg-white text-foreground hover:bg-black/[0.03]"
            )}
          >
            Custom
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">
            Refills aren't enabled for this workspace yet.
          </p>
        </div>
      )}

      <Dialog
        open={refillOpen}
        onOpenChange={(v) => {
          if (!submitting) {
            setRefillOpen(v);
            setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              Refill {selectedAmount === "custom" ? "balance" : money(selectedAmount)}
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              Continue to Stripe to add a one-time prepaid balance to your workspace.
            </DialogDescription>
          </DialogHeader>

          {selectedAmount === "custom" && (
            <div className="py-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">Amount (USD)</label>
              <Input
                type="number"
                min={1}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Enter amount..."
                className="h-9"
                disabled={submitting}
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
              <span className="text-xs text-red-700">{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefillOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={submitting || !amount || Number(amount) <= 0}
              className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Continue to payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// =============================================================================
// PAYMENT METHOD + BILLING PORTAL
// =============================================================================

function PaymentMethodSection({ summary }: { summary: BillingSummary }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = summary.default_card;

  const openPortal = async () => {
    setOpening(true);
    setError(null);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open the billing portal.");
      setOpening(false);
    }
  };

  return (
    <section className="border-b border-border pb-8 mb-8">
      <h2 className="text-sm font-semibold text-foreground mb-5">Payment method</h2>

      <div className="rounded-xl border border-border bg-white p-4 mb-3">
        {card && card.last4 ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-12 rounded-md bg-neutral-100 shrink-0">
              <CreditCard className="h-4 w-4 text-neutral-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-semibold capitalize">
                {card.brand ?? "Card"} •••• {card.last4}
              </p>
              {card.exp_month && card.exp_year && (
                <p className="text-xs text-muted-foreground">
                  Expires {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Default
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              No saved payment method. Add one in the billing portal.
            </p>
          </div>
        )}
      </div>

      {summary.portal_available && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openPortal}
            disabled={opening}
            className="h-8 text-xs rounded-lg gap-1.5"
          >
            {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            Manage billing
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={openPortal}
            disabled={opening}
            className="h-8 text-xs rounded-lg gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            Invoices &amp; receipts
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground/70 mt-3">
        Payment methods, billing details, invoices, and receipts are managed securely by Stripe.
      </p>
    </section>
  );
}

// =============================================================================
// USAGE HISTORY (real metered calls)
// =============================================================================

function UsageHistorySection({ items }: { items: UsageLedgerItem[] }) {
  return (
    <section className="border-b border-border pb-8 mb-8">
      <h2 className="text-sm font-semibold text-foreground mb-5">Usage history</h2>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-5">
          <p className="text-sm text-muted-foreground">
            No metered usage yet. Model calls appear here once your runs use compute.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[0.8fr_1.6fr_1fr_0.9fr_0.9fr] gap-3 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Date</span>
              <span>Model</span>
              <span>Run</span>
              <span>Tokens</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="border-t border-border">
              {items.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[0.8fr_1.6fr_1fr_0.9fr_0.9fr] gap-3 px-3 py-2.5 border-b border-border last:border-b-0 items-center"
                >
                  <span className="text-sm text-foreground">{shortDate(row.created_at)}</span>
                  <span className="text-sm text-foreground truncate" title={row.model}>
                    {shortModel(row.model)}
                    {row.request_status !== "success" && (
                      <span className="ml-1.5 text-[11px] font-semibold text-red-500">
                        {row.request_status}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    {row.run_id ?? "—"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {row.total_tokens.toLocaleString()}
                  </span>
                  <span className="text-xs font-mono text-foreground text-right">
                    {row.retail_cost != null ? money(row.retail_cost, 4) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile stacked */}
          <div className="md:hidden space-y-2">
            {items.map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-white p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground font-semibold truncate">
                    {shortModel(row.model)}
                  </span>
                  <span className="text-xs text-muted-foreground">{shortDate(row.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono truncate">{row.run_id ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">
                    {row.total_tokens.toLocaleString()} tokens
                  </span>
                  <span className="font-mono text-foreground font-semibold">
                    {row.retail_cost != null ? money(row.retail_cost, 4) : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// =============================================================================
// BALANCE ACTIVITY (real ledger)
// =============================================================================

const txnLabel: Record<TransactionType, string> = {
  top_up: "Refill",
  usage_debit: "Usage",
  refund: "Refund",
  credit: "Credit",
  adjustment: "Adjustment",
};

function BalanceActivitySection({ items }: { items: LedgerEntry[] }) {
  if (items.length === 0) return null;

  return (
    <section className="pb-4">
      <h2 className="text-sm font-semibold text-foreground mb-5">Balance activity</h2>
      <div className="border-t border-border">
        {items.map((t) => {
          const amount = Number(t.signed_amount);
          const credit = amount >= 0;
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0"
            >
              <div
                className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-full shrink-0",
                  credit ? "bg-emerald-50" : "bg-neutral-100"
                )}
              >
                {credit ? (
                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  {txnLabel[t.transaction_type] ?? t.transaction_type}
                </p>
                <p className="text-xs text-muted-foreground">{shortDate(t.created_at)}</p>
              </div>
              <span
                className={cn(
                  "text-sm font-mono font-semibold shrink-0",
                  credit ? "text-emerald-600" : "text-foreground"
                )}
              >
                {credit ? "+" : "−"}
                {money(Math.abs(amount), 4)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// =============================================================================
// BILLING PAGE
// =============================================================================

interface BillingPageProps {
  onBack?: () => void;
}

export default function BillingPage({ onBack }: BillingPageProps) {
  const configured = isApiConfigured();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [usage, setUsage] = useState<UsageLedgerItem[]>([]);
  const [txns, setTxns] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const [refillNotice, setRefillNotice] = useState<"success" | "cancelled" | null>(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search).get("refill");
    return p === "success" || p === "cancelled" ? p : null;
  });

  const load = useCallback(async () => {
    if (!isApiConfigured()) return;
    try {
      const [sm, us, tx] = await Promise.all([
        getBillingSummary(),
        getUsageLedger(25),
        getTransactions(25),
      ]);
      setSummary(sm);
      setUsage(us.items);
      setTxns(tx.items);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load billing.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  const openPortal = useCallback(async () => {
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch {
      // surfaced by the payment-method section's own portal button
    }
  }, []);

  useEffect(() => {
    // load() only calls setState after an await — not a synchronous cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground transition-colors md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
          )}
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Billing</h1>
          <button
            type="button"
            onClick={reload}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your prepaid balance, usage, and refills.
        </p>
      </div>

      {refillNotice === "success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 mb-8 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Payment received</p>
            <p className="text-xs text-muted-foreground">
              Your balance updates once the payment is confirmed — this can take a moment.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefillNotice(null)}
            className="text-xs font-semibold text-foreground underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}
      {refillNotice === "cancelled" && (
        <div className="rounded-xl border border-border bg-white p-4 mb-8 flex items-center gap-3">
          <p className="text-sm text-muted-foreground flex-1">Refill cancelled — no charge was made.</p>
          <button
            type="button"
            onClick={() => setRefillNotice(null)}
            className="text-xs font-semibold text-foreground underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {!configured && (
        <div className="rounded-xl border border-dashed border-border p-5">
          <p className="text-sm font-semibold text-foreground">Billing isn't connected</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set <code className="font-mono">VITE_API_BASE_URL</code> to your GNSIS API to see your
            balance and usage here.
          </p>
        </div>
      )}

      {configured && loading && !summary && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading billing…
        </div>
      )}

      {configured && error && !loading && !summary && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Couldn't load billing</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={reload}>
            Retry
          </Button>
        </div>
      )}

      {summary && (
        <>
          <BalanceSection summary={summary} />
          <RefillSection enabled={summary.refill_enabled} />
          <PaymentMethodSection summary={summary} />
          {summary.portal_available && (
            <AutoRefillSection
              hasCard={!!summary.default_card?.last4}
              onManagePayment={openPortal}
            />
          )}
          <UsageHistorySection items={usage} />
          <BalanceActivitySection items={txns} />
        </>
      )}
    </div>
  );
}
