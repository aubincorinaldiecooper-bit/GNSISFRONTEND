import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
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
import {
  ApiError,
  createKey,
  isApiConfigured,
  listKeys,
  revokeKey,
  type CreatedVirtualKey,
  type VirtualKey,
} from "@/lib/api";

function usd(value: string | null): string {
  if (value == null) return "No budget";
  const n = Number(value);
  if (!isFinite(n)) return "No budget";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function shortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ---- Create dialog ----

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (result: CreatedVirtualKey) => void;
}) {
  const [alias, setAlias] = useState("");
  const [budget, setBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setAlias("");
    setBudget("");
    setError(null);
    setSubmitting(false);
  };

  const submit = async () => {
    if (!alias.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createKey({
        key_alias: alias.trim(),
        max_budget_usd: budget.trim() || undefined,
      });
      reset();
      onCreated(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create the key.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) {
          onOpenChange(v);
          if (!v) reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Create API key</DialogTitle>
          <DialogDescription className="leading-relaxed">
            A virtual key for calling the model API directly. Usage draws your workspace
            balance; the budget caps how much this key can spend.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Name</label>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. production app"
              className="h-9"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Budget (USD, optional)
            </label>
            <Input
              type="number"
              min={1}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Uses the default if left blank"
              className="h-9"
              disabled={submitting}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
            <span className="text-xs text-red-700">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !alias.trim()}
            className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Reveal-secret dialog (shown once) ----

function RevealKeyDialog({
  created,
  onClose,
}: {
  created: CreatedVirtualKey | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the value is still selectable in the box
    }
  };

  return (
    <Dialog open={created !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Copy your API key</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {created?.warning ?? "Store this key now — it will not be shown again."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-neutral-50 px-3 py-2">
          <code className="flex-1 text-xs font-mono text-foreground break-all select-all">
            {created?.key}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={copy}
            className="h-7 shrink-0 gap-1 text-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="bg-neutral-900 hover:bg-neutral-800 text-white">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Section ----

export default function ApiKeysSection() {
  const configured = isApiConfigured();
  const [keys, setKeys] = useState<VirtualKey[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealed, setRevealed] = useState<CreatedVirtualKey | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isApiConfigured()) return;
    try {
      const res = await listKeys();
      setKeys(res.items);
      setEnabled(res.enabled);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // load() only calls setState after an await — not a synchronous cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await revokeKey(id);
      await load();
    } catch {
      // surface via a reload; leave the row as-is on failure
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <section className="border-b border-border last:border-b-0 pb-8 mb-8">
      <div className="flex items-center justify-between mb-5 gap-4">
        <h2 className="text-sm font-semibold text-foreground">API keys</h2>
        {configured && enabled && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs rounded-lg gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Create key
          </Button>
        )}
      </div>

      {!configured && (
        <p className="text-sm text-muted-foreground">
          Connect the GNSIS API to manage keys.
        </p>
      )}

      {configured && loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading keys…
        </div>
      )}

      {configured && !loading && !enabled && (
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">
            Direct API keys aren't enabled for this workspace yet.
          </p>
        </div>
      )}

      {configured && !loading && error && (
        <div className="flex items-center gap-2 py-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {configured && !loading && enabled && keys.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">
          No keys yet. Create one to call the model API directly.
        </p>
      )}

      {configured && enabled && keys.length > 0 && (
        <div className="space-y-0.5">
          {keys.map((k) => {
            const revoked = k.status === "revoked";
            return (
              <div key={k.id} className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <KeyRound className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {k.key_alias}
                      </span>
                      {revoked && (
                        <span className="shrink-0 text-[11px] font-semibold text-muted-foreground bg-neutral-100 px-1.5 py-0.5 rounded-full">
                          Revoked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{k.key_prefix}</span>
                      <span>·</span>
                      <span>{usd(k.max_budget)}</span>
                      {k.created_at && (
                        <>
                          <span>·</span>
                          <span>{shortDate(k.created_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {!revoked && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRevoke(k.id)}
                    disabled={revokingId === k.id}
                    className="h-7 text-xs shrink-0 gap-1 text-red-600 hover:text-red-700"
                  >
                    {revokingId === k.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Revoke
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(result) => {
          setCreateOpen(false);
          setRevealed(result);
          void load();
        }}
      />
      <RevealKeyDialog created={revealed} onClose={() => setRevealed(null)} />
    </section>
  );
}
