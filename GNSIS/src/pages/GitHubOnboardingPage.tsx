import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import RepositoryPicker from "@/components/RepositoryPicker";
import { ApiError, claimGitHubInstallation } from "@/lib/api";
import { useRepositoryPicker } from "@/lib/useRepositoryPicker";
import { useSession } from "@/lib/session";

type ClaimState =
  | { kind: "processing" }
  | { kind: "invalid" }
  | { kind: "error"; message: string }
  // The GitHub connection is already successful at this point (claim +
  // ownership verification + sync all completed) — this step is optional
  // repository selection, not a gate on connection success.
  | { kind: "select-repos" };

function parseInstallationId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// ---- Step 2: "Choose repositories for GNSIS" ----
// Shown once, right after a successful claim. Every newly-synced repo starts
// disabled (see backend PR A), so without this step a first-time user would
// land on an empty New Run with no explanation.
function RepositorySelectionStep({ onContinue }: { onContinue: () => void }) {
  const picker = useRepositoryPicker(false);
  const enabledCount = picker.repos.filter((r) => r.enabled).length;
  const noneEnabledYet = !picker.loading && picker.repos.length > 0 && enabledCount === 0;

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Choose repositories for GNSIS</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Select the repositories GNSIS can use when you start a run. You can change this
          later in Settings.
        </p>

        <div className="mt-5">
          <RepositoryPicker picker={picker} emptyTitle="No repositories found." />
        </div>

        {noneEnabledYet && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-medium text-amber-800">No repositories enabled</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Enable a repository to start your first run.
            </p>
          </div>
        )}

        <Button
          onClick={onContinue}
          className="mt-5 w-full gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800"
        >
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function GitHubOnboardingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshMe } = useSession();
  const installationId = parseInstallationId(params.get("installation_id"));
  const claimStartedRef = useRef(false);
  const [state, setState] = useState<ClaimState>(() => (
    installationId ? { kind: "processing" } : { kind: "invalid" }
  ));

  const claim = useCallback(async () => {
    if (!installationId) {
      setState({ kind: "invalid" });
      return;
    }

    setState({ kind: "processing" });
    try {
      await claimGitHubInstallation(installationId);
      await refreshMe();
      // Connection is successful as of here. Repository selection below is a
      // deliberate, skippable next step — never a condition of success.
      setState({ kind: "select-repos" });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Could not connect your GitHub repositories.",
      });
    }
  }, [installationId, refreshMe]);

  useEffect(() => {
    if (!installationId || claimStartedRef.current) return;
    claimStartedRef.current = true;
    void claim();
  }, [claim, installationId]);

  if (state.kind === "invalid") {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="max-w-md rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <h1 className="text-lg font-semibold text-foreground">Invalid GitHub callback</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            GitHub did not include a valid installation ID. Return to Settings and try installing the app again.
          </p>
          <Button className="mt-5" variant="outline" onClick={() => navigate("/settings")}>Return to Settings</Button>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="max-w-md rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <h1 className="text-lg font-semibold text-foreground">Could not connect GitHub</h1>
          <p className="mt-2 text-sm text-red-600">{state.message}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => void claim()}>Retry</Button>
            <Button variant="outline" onClick={() => navigate("/settings")}>Return to Settings</Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "select-repos") {
    return (
      <RepositorySelectionStep
        onContinue={() => navigate("/settings?github=connected", { replace: true })}
      />
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="max-w-md rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Connecting your GitHub repositories…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We are claiming the GitHub App installation and synchronizing your repository access.
        </p>
      </div>
    </div>
  );
}
