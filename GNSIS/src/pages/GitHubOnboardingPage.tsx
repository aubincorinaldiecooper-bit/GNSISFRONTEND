import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { ApiError, claimGitHubInstallation } from "@/lib/api";
import { useSession } from "@/lib/session";

type ClaimState =
  | { kind: "processing" }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

function parseInstallationId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
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
      // GitHub App access itself is the permission — there is no separate
      // in-GNSIS approval step. The successful claim delivers the user
      // straight into Settings; the accessible repositories are already
      // available for runs. Changing which repositories are accessible is
      // done through GitHub via the "Manage GitHub access" action.
      navigate("/settings?github=connected", { replace: true });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Could not connect your GitHub repositories.",
      });
    }
  }, [installationId, navigate, refreshMe]);

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
