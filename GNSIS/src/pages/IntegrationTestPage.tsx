// /integration-test — a real, browser-based end-to-end check of the GNSIS
// customer path:
//   1. Connection      — is everything actually reachable + authenticated?
//   2. API key         — mint a canonical gns_test_ key (secret held in memory)
//   3. Gateway request — POST /v1/chat/completions with that key
//   4. Usage verify    — find the metered event for that request
//
// Nothing here fabricates state: every row reflects a real API result, and the
// gns_ secret + Authorization header are never displayed in full or logged.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Copy,
  Loader2,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SecretReveal from "@/components/SecretReveal";
import { useSession } from "@/lib/session";
import { useVirtualKeys } from "@/lib/useVirtualKeys";
import { backendConnection, githubConnection, toneClasses, toneDotClasses, type ConnState } from "@/lib/connection";
import {
  apiBaseUrl,
  authBaseUrl,
  isApiConfigured,
  isAuthConfigured,
  smokeTestModel,
} from "@/lib/env";
import { getSecret, hasSecret, subscribeSecrets } from "@/lib/keySecrets";
import {
  getBalances,
  health,
  listUsageEvents,
  matchesGatewayRequest,
  type Balances,
  type UsageEvent,
} from "@/lib/api";
import { pollForMatch } from "@/lib/usagePoll";
import {
  newSmokeRunId,
  sendGatewayChat,
  type GatewayFailure,
  type GatewayResult,
  type GatewaySuccess,
} from "@/lib/gateway";

const DEFAULT_PROMPT = "Reply with exactly: GNSIS integration test passed";
const DEFAULT_KEY_NAME = "Frontend integration test";

// -- shared bits --------------------------------------------------------------

function SectionCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
          {step}
        </span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CheckRow({ label, state, detail }: { label: string; state: ConnState; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className={"h-2 w-2 shrink-0 rounded-full " + toneDotClasses[state.tone]} />
        <span className="truncate text-sm text-foreground">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {detail && <span className="font-mono text-xs text-muted-foreground">{detail}</span>}
        <span className={"text-xs font-medium " + toneClasses[state.tone]}>{state.label}</span>
      </div>
    </div>
  );
}

function boolConn(ok: boolean, okLabel = "Configured", noLabel = "Missing"): ConnState {
  return ok ? { label: okLabel, tone: "ok" } : { label: noLabel, tone: "error" };
}

// =============================================================================
// 1. CONNECTION
// =============================================================================

function ConnectionSection() {
  const { status, backendState, me, refreshMe } = useSession();
  const [healthState, setHealthState] = useState<ConnState>({ label: "Checking…", tone: "checking" });
  const [balances, setBalances] = useState<Balances | null>(null);
  const [balancesState, setBalancesState] = useState<ConnState>({ label: "Checking…", tone: "checking" });

  const runProbes = useCallback(async () => {
    setHealthState({ label: "Checking…", tone: "checking" });
    setBalancesState({ label: "Checking…", tone: "checking" });
    try {
      await health();
      setHealthState({ label: "Reachable", tone: "ok" });
    } catch {
      setHealthState({ label: "Unreachable", tone: "error" });
    }
    try {
      const b = await getBalances();
      setBalances(b);
      setBalancesState({ label: "Active", tone: "ok" });
    } catch {
      setBalances(null);
      setBalancesState({ label: "Unavailable", tone: "error" });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- probe on mount
    void runProbes();
  }, [runProbes]);

  const retry = () => {
    void refreshMe();
    void runProbes();
  };

  const money = (v: string | undefined) =>
    v == null ? undefined : `${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balances?.currency ?? "USD"}`;

  return (
    <SectionCard step={1} title="Connection">
      <div className="divide-y divide-border">
        <CheckRow label="Frontend API origin configured" state={boolConn(isApiConfigured())} detail={apiBaseUrl() || undefined} />
        <CheckRow label="Auth service configured" state={boolConn(isAuthConfigured())} detail={authBaseUrl() || undefined} />
        <CheckRow label="Backend health reachable" state={healthState} />
        <CheckRow
          label="Better Auth session active"
          state={
            status === "authenticated"
              ? { label: "Active", tone: "ok" }
              : status === "loading"
                ? { label: "Checking…", tone: "checking" }
                : { label: "Signed out", tone: "error" }
          }
        />
        <CheckRow label="Backend session accepted" state={backendConnection(status, backendState)} />
        <CheckRow
          label="Workspace resolved"
          state={me?.workspace?.id ? { label: "Resolved", tone: "ok" } : { label: "—", tone: "muted" }}
          detail={me?.workspace?.id}
        />
        <CheckRow label="GitHub connected" state={githubConnection(backendState, me?.github.connected)} />
        <CheckRow
          label="Repository count"
          state={me ? { label: String(me.github.repository_count), tone: me.github.repository_count > 0 ? "ok" : "warn" } : { label: "—", tone: "muted" }}
        />
        <CheckRow label="Metering / balance ledger" state={balancesState} detail={money(balances?.available)} />
        <CheckRow
          label="Billing enabled"
          state={{ label: "Not enabled", tone: "muted" }}
          detail="no billing endpoint in this build"
        />
        <CheckRow label="Refill enabled" state={{ label: "Not enabled", tone: "muted" }} />
        <CheckRow
          label="Gateway configured"
          state={{ label: "Verified in step 3", tone: "muted" }}
        />
      </div>
      <div className="mt-4">
        <Button size="sm" variant="outline" onClick={retry} className="h-8 gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Re-check
        </Button>
      </div>
    </SectionCard>
  );
}

// =============================================================================
// 2. API KEY
// =============================================================================

function ApiKeySection({
  activeKeyId,
  onKeyReady,
}: {
  activeKeyId: string | null;
  onKeyReady: (keyId: string | null) => void;
}) {
  const { keys, create, creating, rotate, mutatingId } = useVirtualKeys();
  const [, force] = useState(0);
  useEffect(() => subscribeSecrets(() => force((n) => n + 1)), []);

  const createTestKey = async () => {
    const res = await create({ name: DEFAULT_KEY_NAME, mode: "test" });
    if (res) onKeyReady(res.virtual_key.id);
  };

  const rotateForSecret = async (id: string) => {
    const res = await rotate(id);
    if (res) onKeyReady(res.virtual_key.id);
  };

  const haveSecret = activeKeyId != null && hasSecret(activeKeyId);
  const testKeys = keys.filter((k) => k.status === "active" && k.mode === "test");

  return (
    <SectionCard step={2} title="API key">
      <p className="mb-3 text-sm text-muted-foreground">
        The gateway call uses a canonical <span className="font-mono">gns_test_</span> key. Its
        secret is only ever returned once (on create or rotate) and is held in this tab's memory —
        it's never stored, logged, or put in a URL.
      </p>

      {!isApiConfigured() ? (
        <p className="text-sm text-amber-600">Configure VITE_API_BASE_URL to manage keys.</p>
      ) : haveSecret && activeKeyId ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Test key ready — secret held in memory.
          </div>
          <SecretReveal keyId={activeKeyId} onForget={() => onKeyReady(null)} />
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            onClick={createTestKey}
            disabled={creating}
            className="gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800"
          >
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create "{DEFAULT_KEY_NAME}" test key
          </Button>

          {testKeys.length > 0 && (
            <div className="rounded-lg border border-dashed border-border p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Existing active test keys have no retrievable secret (shown once at creation).
                Rotate one to get a fresh usable secret:
              </p>
              <div className="space-y-1">
                {testKeys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {k.name} · {k.key_prefix}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      disabled={mutatingId === k.id}
                      onClick={() => rotateForSecret(k.id)}
                    >
                      {mutatingId === k.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Rotate
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// =============================================================================
// 3. GATEWAY REQUEST
// =============================================================================

const failureCopy: Record<GatewayFailure["kind"], string> = {
  invalid_request: "The request was rejected as invalid.",
  invalid_key: "The gns_ key was missing, invalid, disabled, or expired.",
  insufficient_balance: "The workspace balance can't cover this request.",
  spending_limit: "A configured spending limit blocked this request.",
  model_not_permitted: "This key isn't allowed to use that model.",
  provider_not_permitted: "This key isn't allowed to use that provider.",
  upstream_failure: "The upstream provider failed.",
  gateway_not_configured: "The gateway isn't configured (API base URL missing).",
  cors_failure: "A CORS policy blocked the browser request.",
  network_failure: "A network or CORS error prevented the request.",
  unknown: "The gateway returned an unexpected error.",
};

function ResultField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={"text-sm text-foreground " + (mono ? "font-mono break-all" : "")}>{value}</p>
    </div>
  );
}

function GatewaySection({
  keyId,
  onSuccess,
}: {
  keyId: string | null;
  onSuccess: (result: GatewaySuccess) => void;
}) {
  const [model, setModel] = useState(smokeTestModel());
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [maxTokens, setMaxTokens] = useState("64");
  const [result, setResult] = useState<GatewayResult | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  const secret = keyId ? getSecret(keyId) : null;
  const canSend = !!secret && model.trim().length > 0 && prompt.trim().length > 0 && !sending;

  const send = async () => {
    if (!canSend || !secret || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setResult(null);
    const res = await sendGatewayChat({
      key: secret,
      model: model.trim(),
      prompt: prompt.trim(),
      maxTokens: Number(maxTokens) || undefined,
      runId: newSmokeRunId(),
    });
    setResult(res);
    setSending(false);
    sendingRef.current = false;
    if (res.ok) onSuccess(res);
  };

  return (
    <SectionCard step={3} title="Gateway request">
      {!secret && (
        <p className="mb-3 text-sm text-amber-600">Create a test key in step 2 first.</p>
      )}
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">Model</label>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. anthropic/claude-opus-4.8 (VITE_SMOKE_TEST_MODEL)"
            className="h-9 font-mono text-xs"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">Prompt</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-16 text-sm"
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="w-32">
            <label className="mb-1.5 block text-xs text-muted-foreground">Max output tokens</label>
            <Input
              type="number"
              min={1}
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            onClick={send}
            disabled={!canSend}
            className="h-9 gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send request
          </Button>
        </div>
      </div>

      {result && !result.ok && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50/60 p-3">
          <div className="mb-1 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">
              {failureCopy[result.kind]}
            </span>
          </div>
          <p className="text-xs text-red-700/90">{result.message}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-red-700/70">
            {result.httpStatus != null && <span>HTTP {result.httpStatus}</span>}
            {result.code && <span>code: {result.code}</span>}
            {result.requestId && <span className="font-mono">{result.requestId}</span>}
            <span>{result.durationMs} ms</span>
          </div>
        </div>
      )}

      {result && result.ok && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">
              HTTP {result.httpStatus} · {result.durationMs} ms
            </span>
          </div>
          <div className="mb-3 rounded-md border border-border bg-white p-3">
            <p className="mb-1 text-xs text-muted-foreground">Model response</p>
            <p className="whitespace-pre-wrap text-sm text-foreground">{result.content || "(empty)"}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-3">
            <ResultField label="X-Genesis-Request-Id" value={result.requestId ?? "—"} mono />
            <ResultField label="X-Genesis-Run-Id" value={result.runId ?? "—"} mono />
            <ResultField label="Provider response ID" value={result.providerResponseId ?? "—"} mono />
            <ResultField label="Model returned" value={result.model ?? "—"} mono />
            <ResultField label="Input tokens" value={String(result.usage.input_tokens ?? "—")} />
            <ResultField label="Output tokens" value={String(result.usage.output_tokens ?? "—")} />
            <ResultField label="Total tokens" value={String(result.usage.total_tokens ?? "—")} />
            <ResultField label="Finish reason" value={result.finishReason ?? "—"} />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// =============================================================================
// 4. USAGE VERIFICATION
// =============================================================================

const POLL_INTERVAL_MS = 2000;
const POLL_BUDGET_MS = 30000;

function UsageSection({ success }: { success: GatewaySuccess | null }) {
  const [event, setEvent] = useState<UsageEvent | null>(null);
  const [polling, setPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const cancelRef = useRef(false);

  const poll = useCallback(async () => {
    if (!success) return;
    cancelRef.current = false;
    setEvent(null);
    setTimedOut(false);
    setPolling(true);
    const match = await pollForMatch<UsageEvent>({
      fetchItems: async () => (await listUsageEvents(50)).items,
      match: (e) => matchesGatewayRequest(e, success.requestId, success.runId),
      budgetMs: POLL_BUDGET_MS,
      intervalMs: POLL_INTERVAL_MS,
      isCancelled: () => cancelRef.current,
    });
    if (cancelRef.current) return;
    setPolling(false);
    if (match) setEvent(match);
    else setTimedOut(true);
  }, [success]);

  // Auto-start once a successful gateway call lands. (`success` only ever goes
  // null→value or value→newValue in this flow, so there's no reset-to-idle case.)
  useEffect(() => {
    if (!success) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- begins polling for the new request
    void poll();
    return () => {
      cancelRef.current = true;
    };
  }, [success, poll]);

  const copyId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <SectionCard step={4} title="Usage verification">
      {!success ? (
        <p className="text-sm text-muted-foreground">
          Send a gateway request in step 3 to verify its metered usage event here.
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-mono">
              {success.requestId}
              {success.requestId && (
                <button type="button" onClick={() => copyId(success.requestId!)} aria-label="Copy request id">
                  <Copy className="h-3 w-3" />
                </button>
              )}
              {copied && <span className="text-emerald-600">copied</span>}
            </span>
            <span className="font-mono">{success.runId}</span>
          </div>

          {polling && !event && (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Looking for the metered event…
            </div>
          )}

          {timedOut && !event && (
            <div className="space-y-2 py-2">
              <p className="text-sm text-amber-600">
                No matching usage event found within {POLL_BUDGET_MS / 1000}s. Metering may lag
                slightly under load.
              </p>
              <Button size="sm" variant="outline" onClick={() => void poll()} className="h-8 gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
                Check again
              </Button>
            </div>
          )}

          {event && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  Metering active · Billing not enabled
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-3">
                <ResultField label="Request ID" value={event.litellm_request_id} mono />
                <ResultField label="Run ID" value={event.run_id ?? "—"} mono />
                <ResultField label="Workspace" value={event.workspace_id} mono />
                <ResultField label="Key attribution" value={event.virtual_key_id ?? "—"} mono />
                <ResultField label="Provider" value={event.provider || "—"} />
                <ResultField label="Model" value={event.model || "—"} mono />
                <ResultField label="Request status" value={event.request_status} />
                <ResultField label="Input tokens" value={String(event.input_tokens)} />
                <ResultField label="Output tokens" value={String(event.output_tokens)} />
                <ResultField label="Cached tokens" value={String(event.cached_tokens)} />
                <ResultField label="Reasoning tokens" value={String(event.reasoning_tokens)} />
                <ResultField label="Upstream cost" value={event.upstream_cost} />
                <ResultField label="Genesis cost" value={event.genesis_calculated_cost ?? "—"} />
                <ResultField label="Reconciliation" value={event.reconciliation_state} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Retail cost + service fee aren't exposed by <span className="font-mono">/v1/usage-events</span>{" "}
                (a per-run receipt endpoint is planned) — provider and Genesis cost are shown separately.
              </p>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

// =============================================================================
// PAGE
// =============================================================================

export default function IntegrationTestPage({ onBack }: { onBack?: () => void }) {
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);
  const [success, setSuccess] = useState<GatewaySuccess | null>(null);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6 md:py-10">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground md:hidden"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Integration test</h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A real end-to-end check: connection → API key → gateway request → usage verification.
        </p>
      </div>

      <div className="space-y-4">
        <ConnectionSection />
        <div className="flex justify-center text-muted-foreground/40">
          <ChevronRight className="h-4 w-4 rotate-90" />
        </div>
        <ApiKeySection activeKeyId={activeKeyId} onKeyReady={setActiveKeyId} />
        <div className="flex justify-center text-muted-foreground/40">
          <ChevronRight className="h-4 w-4 rotate-90" />
        </div>
        <GatewaySection keyId={activeKeyId} onSuccess={setSuccess} />
        <div className="flex justify-center text-muted-foreground/40">
          <ChevronRight className="h-4 w-4 rotate-90" />
        </div>
        <UsageSection success={success} />
      </div>
    </div>
  );
}
