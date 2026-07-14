import { useState } from "react";
import {
  CreditCard,
  Plus,
  FileText,
  ChevronRight,
  Check,
  AlertTriangle,
  Zap,
  Users,
  Briefcase,
  AlertCircle,
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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

// =============================================================================
// PLAN USAGE METER
// =============================================================================

function PlanUsageMeter({ used, total }: { used: number; total: number }) {
  const percentUsed = Math.min((used / total) * 100, 100);
  const isLow = percentUsed >= 85;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatUsd(used)} of {formatUsd(total)} used
        </span>
        {isLow && (
          <span className="text-xs font-semibold text-amber-600">Running low</span>
        )}
      </div>
      <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
            isLow ? "bg-amber-500" : "bg-blue-500"
          )}
          style={{ width: `${percentUsed}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// CURRENT PLAN
// =============================================================================

function CurrentPlanSection() {
  return (
    <section className="border-b border-border pb-8 mb-8">
      <h2 className="text-sm font-semibold text-foreground mb-5">Current plan</h2>

      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current plan
            </p>
            <p className="text-base font-semibold text-foreground">Mini</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg">
            Manage plan
          </Button>
        </div>

        <PlanUsageMeter used={7.6} total={20.0} />

        <div className="grid grid-cols-3 gap-4 pt-1">
          <div>
            <p className="text-xs text-muted-foreground">Monthly allocation</p>
            <p className="text-sm font-semibold text-foreground">{formatUsd(20.0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-sm font-semibold text-emerald-600">{formatUsd(12.4)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Used</p>
            <p className="text-sm font-semibold text-foreground">{formatUsd(7.6)}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Next reset: <span className="font-semibold text-foreground">August 1</span>
        </p>
      </div>
    </section>
  );
}

// =============================================================================
// REFILL BALANCE
// =============================================================================

const refillAmounts = [10, 25, 50] as const;

function RefillSection() {
  const [refillOpen, setRefillOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | "custom">(10);
  const [customValue, setCustomValue] = useState("");
  const [refillError, setRefillError] = useState(false);

  const handleRefill = () => {
    if (selectedAmount === "custom" && !customValue) return;
    // Simulate occasional refill failure
    if (Math.random() < 0.05) {
      setRefillError(true);
      setRefillOpen(false);
      return;
    }
    setRefillOpen(false);
    setRefillError(false);
  };

  return (
    <section className="border-b border-border pb-8 mb-8">
      <h2 className="text-sm font-semibold text-foreground mb-2">Refill balance</h2>
      <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
        One-time balance added to your workspace. Unused balance rolls over according
        to your plan terms.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {refillAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => { setSelectedAmount(amount); setRefillOpen(true); }}
            className={cn(
              "h-9 px-4 rounded-lg border text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "border-border bg-white text-foreground hover:bg-black/[0.03]"
            )}
          >
            {formatUsd(amount)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setSelectedAmount("custom"); setCustomValue(""); setRefillOpen(true); }}
          className={cn(
            "h-9 px-4 rounded-lg border text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            "border-border bg-white text-foreground hover:bg-black/[0.03]"
          )}
        >
          Custom
        </button>
      </div>

      <Dialog open={refillOpen} onOpenChange={(v) => { setRefillOpen(v); setRefillError(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              Refill {selectedAmount === "custom" ? "balance" : formatUsd(selectedAmount)}
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              Add a one-time balance to your workspace. This will be charged to your
              default payment method.
            </DialogDescription>
          </DialogHeader>

          {selectedAmount === "custom" && (
            <div className="py-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Amount (USD)
              </label>
              <Input
                type="number"
                min={1}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Enter amount..."
                className="h-9"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefillOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRefill}
              disabled={selectedAmount === "custom" && !customValue}
              className="bg-neutral-900 hover:bg-neutral-800 text-white"
            >
              Confirm refill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refill error dialog */}
      <Dialog open={refillError} onOpenChange={setRefillError}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <DialogTitle className="text-base">Payment failed</DialogTitle>
            </div>
            <DialogDescription className="leading-relaxed">
              We couldn&apos;t process your refill. Please check your payment method and try again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefillError(false)}>
              Close
            </Button>
            <Button
              onClick={() => { setRefillError(false); setRefillOpen(true); }}
              className="bg-neutral-900 hover:bg-neutral-800 text-white"
            >
              Try again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// =============================================================================
// AUTO-REFILL
// =============================================================================

function AutoRefillSection() {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState("5");
  const [amount, setAmount] = useState("10");

  return (
    <section className="border-b border-border pb-8 mb-8">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="text-sm font-semibold text-foreground">Auto-refill</h2>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={cn(
            "relative shrink-0 inline-flex h-5 w-9 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            enabled ? "bg-neutral-900" : "bg-neutral-300"
          )}
          aria-label={enabled ? "Disable auto-refill" : "Enable auto-refill"}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 inline-flex h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
              enabled && "translate-x-4"
            )}
          />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
        Automatically add balance when your remaining usage drops below a selected
        amount.
      </p>

      {enabled && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Trigger threshold
            </label>
            <div className="flex gap-2">
              {["2", "5", "10"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setThreshold(v)}
                  className={cn(
                    "h-8 px-3 rounded-md border text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    threshold === v
                      ? "border-foreground/20 bg-black/[0.04] font-semibold"
                      : "border-border hover:bg-black/[0.03]"
                  )}
                >
                  {formatUsd(Number(v))}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Refill amount
            </label>
            <div className="flex gap-2">
              {["10", "25", "50"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className={cn(
                    "h-8 px-3 rounded-md border text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    amount === v
                      ? "border-foreground/20 bg-black/[0.04] font-semibold"
                      : "border-border hover:bg-black/[0.03]"
                  )}
                >
                  {formatUsd(Number(v))}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Payment method
            </label>
            <p className="text-sm text-foreground">Visa ending in 4242</p>
          </div>
        </div>
      )}

      {!enabled && <p className="text-xs text-muted-foreground/60">Auto-refill is off.</p>}
    </section>
  );
}

// =============================================================================
// PAYMENT METHODS
// =============================================================================

function PaymentMethodsSection() {
  const hasPaymentMethod = true;

  return (
    <section className="border-b border-border pb-8 mb-8">
      <h2 className="text-sm font-semibold text-foreground mb-5">Payment methods</h2>

      {hasPaymentMethod ? (
        <>
          <div className="rounded-xl border border-border bg-white p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-12 rounded-md bg-neutral-100 shrink-0">
                <CreditCard className="h-4 w-4 text-neutral-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-semibold">
                  Visa ending in 4242
                </p>
                <p className="text-xs text-muted-foreground">Expires 09/28</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Default
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add payment method
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs rounded-lg">
              Update payment method
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs rounded-lg gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              View invoices
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-white p-4 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No payment method on file.</p>
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg gap-1.5 ml-auto">
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      )}
    </section>
  );
}

// =============================================================================
// USAGE HISTORY
// =============================================================================

interface UsageHistoryRow {
  date: string;
  run: string;
  repo: string;
  agent: string;
  tokens: number;
  amount: number;
}

const usageHistoryRows: UsageHistoryRow[] = [
  { date: "Jul 11", run: "Fix navbar positioning", repo: "gnsis/frontend", agent: "Claude Code", tokens: 42180, amount: 0.46 },
  { date: "Jul 10", run: "Check Stripe webhook", repo: "gnsis/api", agent: "Custom Agent", tokens: 58400, amount: 0.63 },
  { date: "Jul 9", run: "Add authentication guard", repo: "gnsis/frontend", agent: "Codex", tokens: 36920, amount: 0.40 },
];

function UsageHistorySection() {
  return (
    <section className="border-b border-border pb-8 mb-8">
      <h2 className="text-sm font-semibold text-foreground mb-5">Usage history</h2>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[0.8fr_1.6fr_1fr_1fr_0.8fr_0.8fr] gap-3 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Date</span>
          <span>Run</span>
          <span>Repository</span>
          <span>Agent</span>
          <span>Tokens</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="border-t border-border">
          {usageHistoryRows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[0.8fr_1.6fr_1fr_1fr_0.8fr_0.8fr] gap-3 px-3 py-2.5 border-b border-border last:border-b-0 items-center"
            >
              <span className="text-sm text-foreground">{row.date}</span>
              <span className="text-sm text-foreground truncate">{row.run}</span>
              <span className="text-xs font-mono text-muted-foreground truncate">{row.repo}</span>
              <span className="text-xs text-muted-foreground">{row.agent}</span>
              <span className="text-xs font-mono text-muted-foreground">{row.tokens.toLocaleString()}</span>
              <span className="text-xs font-mono text-foreground text-right">{formatUsd(row.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile stacked */}
      <div className="md:hidden space-y-2">
        {usageHistoryRows.map((row, i) => (
          <div key={i} className="rounded-lg border border-border bg-white p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground font-semibold">{row.run}</span>
              <span className="text-xs text-muted-foreground">{row.date}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{row.repo}</span>
              <span>·</span>
              <span>{row.agent}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground">{row.tokens.toLocaleString()} tokens</span>
              <span className="font-mono text-foreground font-semibold">{formatUsd(row.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// PLAN OPTIONS
// =============================================================================

interface PlanOption {
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  current?: boolean;
}

const planOptions: PlanOption[] = [
  {
    name: "Mini",
    description: "For individual developers testing agent workflows.",
    icon: <Zap className="h-4 w-4" />,
    features: ["Monthly usage allocation", "Manual refills", "Run receipts", "Full activity history"],
    current: true,
  },
  {
    name: "Pro",
    description: "For developers running agents regularly.",
    icon: <Briefcase className="h-4 w-4" />,
    features: ["Larger monthly allocation", "Auto-refill", "More connected repositories", "Longer run history"],
  },
  {
    name: "Team",
    description: "For teams managing shared agent usage.",
    icon: <Users className="h-4 w-4" />,
    features: ["Shared balance", "Team members", "Spending controls", "Centralized run history"],
  },
];

function PlanOptionsSection() {
  return (
    <section className="pb-4">
      <h2 className="text-sm font-semibold text-foreground mb-5">Plan options</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {planOptions.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "rounded-xl border p-4 space-y-3",
              plan.current ? "border-foreground/15 bg-white" : "border-border bg-white"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{plan.icon}</span>
              <span className="text-sm font-semibold text-foreground">{plan.name}</span>
              {plan.current && (
                <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Current
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
            <ul className="space-y-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
            {!plan.current && (
              <Button variant="outline" size="sm" className="w-full h-8 text-xs rounded-lg mt-1">
                Upgrade
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// LOW BALANCE WARNING
// =============================================================================

export function LowBalanceWarning({
  onManageBilling,
}: {
  onManageBilling?: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 mb-8">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">Running low</span>
            <span className="text-xs text-muted-foreground">{formatUsd(2.1)} remaining</span>
          </div>
          {onManageBilling && (
            <button
              type="button"
              onClick={onManageBilling}
              className="text-xs font-semibold text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
            >
              Manage billing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BILLING PAGE
// =============================================================================

interface BillingPageProps {
  onBack?: () => void;
  showLowBalance?: boolean;
  onManageBilling?: () => void;
}

export default function BillingPage({
  onBack,
  showLowBalance = false,
  onManageBilling,
}: BillingPageProps) {
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
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Manage your plan, usage balance, refills, and payment methods.
        </p>
      </div>

      {showLowBalance && <LowBalanceWarning onManageBilling={onManageBilling} />}

      <CurrentPlanSection />
      <RefillSection />
      <AutoRefillSection />
      <PaymentMethodsSection />
      <UsageHistorySection />
      <PlanOptionsSection />
    </div>
  );
}
