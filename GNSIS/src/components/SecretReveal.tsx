// A one-time secret reveal box. The secret is read from the in-memory key store
// (never props that could get serialised), masked by default, copyable, and
// explicitly forgettable. It is never logged, never persisted, never in a URL.

import { useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { forgetSecret, getSecret, subscribeSecrets } from "@/lib/keySecrets";

function mask(secret: string): string {
  // Show the non-secret scheme prefix (gns_live_/gns_test_) + an ellipsis.
  const parts = secret.split("_");
  const scheme = parts.slice(0, 2).join("_");
  return `${scheme}_${"•".repeat(8)}`;
}

export default function SecretReveal({
  keyId,
  onForget,
}: {
  keyId: string;
  onForget?: () => void;
}) {
  const [, force] = useState(0);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  // Re-render if the store changes (e.g. cleared on sign-out).
  useEffect(() => subscribeSecrets(() => force((n) => n + 1)), []);

  const secret = getSecret(keyId);
  if (!secret) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the value is still selectable when revealed.
    }
  };

  const forget = () => {
    forgetSecret(keyId);
    onForget?.();
  };

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-emerald-800">
          Secret shown once — copy it now
        </p>
        <button
          type="button"
          onClick={forget}
          className="text-emerald-700/70 hover:text-emerald-900"
          aria-label="Forget secret"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-white px-2.5 py-1.5">
        <code className="flex-1 break-all font-mono text-xs text-foreground">
          {shown ? secret : mask(secret)}
        </code>
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={shown ? "Hide secret" : "Reveal secret"}
        >
          {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <Button variant="outline" size="sm" onClick={copy} className="h-7 shrink-0 gap-1 text-xs">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-emerald-700/80">
        Stored only in this browser tab's memory — never saved. It disappears on
        sign-out or when you forget it, and can't be shown again afterwards.
      </p>
    </div>
  );
}
