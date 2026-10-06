// Settings → API keys. Canonical gns_ virtual keys: list / create / rotate /
// disable, with a one-time secret reveal. No LiteLLM `sk-` keys, no budgets, no
// master-key assumptions — everything is derived from the /v1/virtual-keys API.

import { useId, useRef, useState, type RefObject } from "react";
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
  active: "text-green bg-green-tint",
  disabled: "text-muted-foreground bg-muted",
  rotated: "text-muted-foreground bg-muted",
};

function ModeBadge({ mode }: { mode: VirtualKeyMode }) {
  return (
    <span
      className={
        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase " +
        (mode === "test" ? "bg-accent-tint text-accent" : "bg-foreground text-background")
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
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (name: string, mode: VirtualKeyMode) => Promise<void>;
  creating: boolean;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const nameId = useId();
  const pending = useRef(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<VirtualKeyMode>("test");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setMode("test");
    setError(null);
  };

  const submit = async () => {
    if (!name.trim() || creating || pending.current) return;
    pending.current = true;
    setError(null);
    try {
      await onCreate(name.trim(), mode);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the key.");
    } finally {
      pending.current = false;
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
      <DialogContent className="sm:max-w-sm" onCloseAutoFocus={(event) => {
        if (returnFocus.current?.isConnected) { event.preventDefault(); returnFocus.current.focus(); }
      }}>
        <DialogHeader>
          <DialogTitle className="text-base">Create API key</DialogTitle>
          <DialogDescription className="leading-relaxed">
            A canonical <code className="font-mono">gns_</code> key for calling the model
            gateway directly. The secret is shown once.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => { event.preventDefault(); void submit(); }} aria-busy={creating}>
        <div className="space-y-3 py-2">
          <div>
            <label htmlFor={nameId} className="mb-1.5 block text-xs text-ink-2">Name</label>
            <Input id={nameId}
              aria-invalid={!!error}
              aria-describedby={error ? `${nameId}-error` : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production app"
              className="h-9"
              disabled={creating}
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-ink-2">Mode</p>
            <div className="flex gap-2" role="group" aria-label="Key mode">
              {(["test", "live"] as VirtualKeyMode[]).map((m) => (
                <Button variant={mode === m ? "primary" : "secondary"} aria-pressed={mode === m}
                  key={m}
                  type="button"
                  disabled={creating}
                  onClick={() => setMode(m)}
                  className="flex-1 capitalize"
                >
                  {m}
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                    gns_{m}_
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div id={`${nameId}-error`} role="alert" className="flex items-start gap-2 rounded-control border border-red/20 bg-red-tint px-3 py-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => { reset(); onOpenChange(false); }} disabled={creating}>
            Cancel
          </Button>
          <Button variant="primary" type="submit"
            disabled={creating || !name.trim()}
            className="gap-1.5"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create key
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ApiKeysSection() {
  const configured = isApiConfigured();
  const { keys, loading, error, creating, mutatingId, create, rotate, disable } = useVirtualKeys();
  const [createOpen, setCreateOpen] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const [revealId, setRevealId] = useState<string | null>(null);

  const onCreate = async (name: string, mode: VirtualKeyMode) => {
    const res = await create({ name, mode });
    if (res) {
      setCreateOpen(false);
      setRevealId(res.virtual_key.id);
    } else {
      throw new Error("Could not create the key. Please try again.");
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
            ref={createButton}
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
                        onClick={() => { void onRotate(k.id).catch(() => { /* Hook displays the API error. */ }); }}
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
                        onClick={() => { void disable(k.id).catch(() => { /* Hook displays the API error. */ }); }}
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
        returnFocus={createButton}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={onCreate}
        creating={creating}
      />
    </section>
  );
}
