// Billing — pay-as-you-go wallet view.
//
// The current backend (post gateway-program) exposes the metering ledger
// (/v1/balances, /v1/usage-events) but NOT the Stripe wallet surface
// (summary / refill checkout / customer portal / auto-refill). So this page
// shows the REAL balance + usage and tells the truth about billing being
// dormant — no fake balances, no non-functional "Add funds" / "Manage billing"
// buttons, no auto-refill controls. Those return when the wallet backend lands.

import { useCallback, useEffect, useState } from "react";
import { Wallet, AlertTriangle, ChevronRight, Loader2, Info } from "lucide-react";

import { useSession } from "@/lib/session";
import {
  ApiError,
  getBalances,
  listUsageEvents,
  type Balances,
  type UsageEvent,
} from "@/lib/api";

function usd(value: string | null | undefined, currency = "USD"): string {
  const n = value == null ? 0 : Number(value);
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency });
}

function shortTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

type LoadState =
  | { kind: "loading" }
  | { kind: "unauthorized" }
  | { kind: "unavailable"; message: string }
  | { kind: "ok"; balances: Balances; events: UsageEvent[] };

function BalanceCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-white p-5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <p className={"text-2xl font-bold " + (warn ? "text-amber-600" : "text-foreground")}>{value}</p>
    </div>
  );
}

export default function BillingPage({ onBack }: { onBack?: () => void }) {
  const { status } = useSession();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const [balances, usage] = await Promise.all([getBalances(), listUsageEvents(50)]);
      setState({ kind: "ok", balances, events: usage.items });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setState({ kind: "unauthorized" });
      else
        setState({
          kind: "unavailable",
          message: err instanceof ApiError ? err.message : "Couldn't reach the backend.",
        });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount
    if (status === "authenticated") void load();
  }, [status, load]);

  const currency = state.kind === "ok" ? state.balances.currency : "USD";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-10">
      <div className="mb-6 flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Back"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Billing</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pay-as-you-go — you're charged only for the compute you use.
          </p>
        </div>
      </div>

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading balance…
        </div>
      )}

      {state.kind === "unauthorized" && (
        <div className="flex items-center gap-2 py-6 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Your session expired — sign in again.
        </div>
      )}

      {state.kind === "unavailable" && (
        <div className="flex items-center gap-2 py-6 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {state.kind === "ok" && (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <BalanceCard
              label="Available"
              value={usd(state.balances.available, currency)}
              warn={Number(state.balances.available) < 5}
            />
            <BalanceCard label="On hold" value={usd(state.balances.reserved, currency)} />
            <BalanceCard label="Balance" value={usd(state.balances.balance, currency)} />
          </div>

          {/* Truthful billing-dormant state — no fake controls. */}
          <div className="mb-8 flex items-start gap-2.5 rounded-xl border border-border bg-neutral-50 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                Metering is active · Billing is not enabled in this environment
              </p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                Usage is metered and your balance is tracked, but the Stripe wallet — adding funds,
                the customer portal, invoices, and auto-refill — isn't available in this backend
                build yet. No card is on file and nothing is charged. These controls appear once the
                wallet backend is deployed.
              </p>
            </div>
          </div>

          {/* Real usage history */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Recent usage</p>
            </div>
            {state.events.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No metered usage yet. Make a gateway request to see it here.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2 text-right">Tokens</th>
                      <th className="px-3 py-2 text-right">Provider cost</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.events.map((e) => (
                      <tr key={e.id} className="border-b border-border last:border-b-0">
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                          {shortTime(e.created_at)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-foreground">{e.model}</td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                          {(e.input_tokens + e.output_tokens).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                          {usd(e.upstream_cost, e.currency || currency)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              "text-xs " +
                              (e.reconciliation_state === "needs_reconciliation"
                                ? "text-amber-600"
                                : e.request_status === "success"
                                  ? "text-emerald-600"
                                  : "text-muted-foreground")
                            }
                          >
                            {e.reconciliation_state === "needs_reconciliation"
                              ? "reconciling"
                              : e.request_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Provider cost is shown; retail cost + Genesis fee will appear with the per-run receipt
              endpoint.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
