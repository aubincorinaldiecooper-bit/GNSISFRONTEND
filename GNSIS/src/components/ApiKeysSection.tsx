// Settings → API keys. Canonical gns_ virtual keys: list / create / rotate /
// disable, with a one-time secret reveal. No LiteLLM `sk-` keys, no budgets, no
// master-key assumptions — everything is derived from the /v1/virtual-keys API.

import { useState } from "react";
import { KeyRound, Plus, RefreshCw, Ban, AlertTriangle, Loader2 } from "lucide-react";

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
import SecretReveal from "@/components/SecretReveal";
import { useVirtualKeys } from "@/lib/useVirtualKeys";
import { isApiConfigured } from "@/lib/env";
import type { VirtualKey, VirtualKeyMode } from "@/lib/api";

function shortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const statusStyles: Record<VirtualKey["status"], string> = {
  active: "text-emerald-700 bg-emerald-50",
  disabled: "text-muted-foreground bg-neutral-100",
  rotated: "text-muted-foreground bg-neutral-100",
};

function ModeBadge({ mode }: { mode: VirtualKeyMode }) {
  return (
    <span
      className={
        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase " +
        (mode === "test" ? "bg-blue-50 text-blue-700" : "bg-neutral-900 text-white")
      }
    >
      {mode}
    </span>
  );
}

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreate,
  creating,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (name: string, mode: VirtualKeyMode) => Promise<void>;
  creating: boolean;
}) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<VirtualKeyMode>("test");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setMode("test");
    setError(null);
  };

  const submit = async () => {
    if (!name.trim() || creating) return;
    setError(null);
    try {
      await onCreate(name.trim(), mode);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the key.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!creating) {
          onOpenChange(v);
          if (!v) reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Create API key</DialogTitle>
          <DialogDescription className="leading-relaxed">
            A canonical <code className="font-mono">gns_</code> key for calling the model
            gateway directly. The secret is shown once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production app"
              className="h-9"
              disabled={creating}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Mode</label>
            <div className="flex gap-2">
              {(["test", "live"] as VirtualKeyMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={creating}
                  onClick={() => setMode(m)}
                  className={
                    "flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors " +
                    (mode === m
                      ? "border-foreground/20 bg-black/[0.04] font-semibold text-foreground"
                      : "border-border text-muted-foreground hover:bg-black/[0.03]")
                  }
                >
                  {m}
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                    gns_{m}_
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
            <span className="text-xs text-red-700">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={creating || !name.trim()}
            className="gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ApiKeysSection() {
  const configured = isApiConfigured();
  const { keys, loading, error, creating, mutatingId, create, rotate, disable } = useVirtualKeys();
  const [createOpen, setCreateOpen] = useState(false);
  const [revealId, setRevealId] = useState<string | null>(null);

  const onCreate = async (name: string, mode: VirtualKeyMode) => {
    const res = await create({ name, mode });
    if (res) {
      setCreateOpen(false);
      setRevealId(res.virtual_key.id);
    }
  };

  const onRotate = async (id: string) => {
    const res = await rotate(id);
    if (res) setRevealId(res.virtual_key.id);
  };

  return (
    <section className="mb-8 border-b border-border pb-8 last:border-b-0">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-foreground">API keys</h2>
        {configured && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 rounded-lg text-xs"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Create key
          </Button>
        )}
      </div>

      {!configured && (
        <p className="text-sm text-muted-foreground">Connect the GNSIS API to manage keys.</p>
      )}

      {configured && loading && (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading keys…
        </div>
      )}

      {configured && !loading && error && (
        <div className="flex items-center gap-2 py-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {configured && !loading && !error && keys.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No keys yet. Create one to call the model gateway directly.
        </p>
      )}

      {configured && keys.length > 0 && (
        <div className="space-y-0.5">
          {keys.map((k) => {
            const active = k.status === "active";
            const busy = mutatingId === k.id;
            return (
              <div key={k.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {k.name || "Untitled key"}
                        </span>
                        <ModeBadge mode={k.mode} />
                        <span
                          className={
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize " +
                            statusStyles[k.status]
                          }
                        >
                          {k.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{k.key_prefix}</span>
                        {k.created_at && (
                          <>
                            <span>·</span>
                            <span>{shortDate(k.created_at)}</span>
                          </>
                        )}
                        {k.last_used_at && (
                          <>
                            <span>·</span>
                            <span>used {shortDate(k.last_used_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {active && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRotate(k.id)}
                        disabled={busy}
                        className="h-7 gap-1 text-xs"
                      >
                        {busy ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Rotate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => disable(k.id)}
                        disabled={busy}
                        className="h-7 gap-1 text-xs text-red-600 hover:text-red-700"
                      >
                        <Ban className="h-3 w-3" />
                        Disable
                      </Button>
                    </div>
                  )}
                </div>
                {revealId === k.id && (
                  <div className="mt-2 pl-7">
                    <SecretReveal keyId={k.id} onForget={() => setRevealId(null)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={onCreate}
        creating={creating}
      />
    </section>
  );
}
