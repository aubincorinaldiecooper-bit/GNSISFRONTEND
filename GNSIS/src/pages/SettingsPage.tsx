import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Monitor,
  Moon,
  Sun,
  FolderGit,
  Lock,
  AlertCircle,
  ChevronRight,
  Loader2,
  Github,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import ApiKeysSection from "@/components/ApiKeysSection";
import { useSession } from "@/lib/session";
import { ApiError, listRepositories, type RepositoryRecord } from "@/lib/api";
import { backendConnection, githubConnection, toneClasses, toneDotClasses } from "@/lib/connection";
import { githubAppSlug } from "@/lib/env";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ThemeOption = "light" | "dark" | "system";

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 border-b border-border pb-8 last:border-b-0">
      <h2 className="mb-5 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function SettingsRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <p className="text-sm text-foreground">{label}</p>
      {value && <p className="truncate text-xs text-muted-foreground">{value}</p>}
    </div>
  );
}

function StatusPill({ tone, label }: { tone: keyof typeof toneClasses; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", toneClasses[tone])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", toneDotClasses[tone])} />
      {label}
    </span>
  );
}

// ---- Account (real, from Better Auth + /v1/me) ----

function AccountSection() {
  const { authUser, me, status, backendState } = useSession();
  const conn = backendConnection(status, backendState);
  const gh = githubConnection(backendState, me?.github.connected);

  const name = authUser?.name || authUser?.githubLogin || "—";
  const initial = (name.trim()[0] || "?").toUpperCase();

  return (
    <SettingsSection title="Account">
      <div className="mb-5 flex items-center gap-3">
        {authUser?.image ? (
          <img
            src={authUser.image}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {me?.workspace?.name ?? "Personal workspace"}
          </p>
        </div>
      </div>
      <div className="divide-y divide-border">
        <SettingsRow label="Name" value={authUser?.name} />
        <SettingsRow label="Email" value={authUser?.email} />
        {authUser?.githubLogin && <SettingsRow label="GitHub" value={`@${authUser.githubLogin}`} />}
        <SettingsRow label="Workspace" value={me?.workspace?.id} />
        <div className="flex items-center justify-between gap-4 py-3">
          <p className="text-sm text-foreground">Backend session</p>
          <StatusPill tone={conn.tone} label={conn.label} />
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <p className="text-sm text-foreground">GitHub App</p>
          <StatusPill tone={gh.tone} label={gh.label} />
        </div>
      </div>
    </SettingsSection>
  );
}

// ---- Appearance (local UI preference; no backend) ----

function AppearanceSection() {
  const [theme, setTheme] = useState<ThemeOption>("light");
  const options: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ];
  return (
    <SettingsSection title="Appearance">
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              theme === opt.value
                ? "border-foreground/20 bg-black/[0.04] font-semibold text-foreground"
                : "border-border text-muted-foreground hover:bg-black/[0.03] hover:text-foreground",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
    </SettingsSection>
  );
}

// ---- Repositories (real, from /v1/repositories) ----

type ReposState =
  | { kind: "checking" }
  | { kind: "ok"; repos: RepositoryRecord[] }
  | { kind: "unauthorized" }
  | { kind: "unavailable"; message: string };

function RepositorySection() {
  const { status } = useSession();
  const [state, setState] = useState<ReposState>({ kind: "checking" });
  const slug = githubAppSlug();

  const load = useCallback(async () => {
    setState({ kind: "checking" });
    try {
      const repos = await listRepositories();
      setState({ kind: "ok", repos });
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

  return (
    <SettingsSection title="Repository connections">
      {state.kind === "checking" && (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking connected repositories…
        </div>
      )}

      {state.kind === "unauthorized" && (
        <StatusPill tone="error" label="Session expired — sign in again" />
      )}

      {state.kind === "unavailable" && (
        <div className="flex items-center gap-2 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {state.kind === "ok" && state.repos.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 py-1 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No repositories connected yet.</span>
          </div>
          {slug && (
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <a
                href={`https://github.com/apps/${slug}/installations/new`}
                target="_blank"
                rel="noreferrer"
              >
                <Github className="h-3.5 w-3.5" />
                Install the GNSIS GitHub App
              </a>
            </Button>
          )}
        </div>
      )}

      {state.kind === "ok" && state.repos.length > 0 && (
        <div className="space-y-0.5">
          {state.repos.map((repo) => (
            <div key={repo.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <FolderGit className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                <span className="truncate font-mono text-sm text-foreground">{repo.full_name}</span>
                {repo.private && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Private
                  </span>
                )}
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {repo.default_branch}
              </span>
            </div>
          ))}
          <p className="pt-3 text-xs text-muted-foreground">
            Repository access is managed through the GNSIS GitHub App, not toggled here.
          </p>
        </div>
      )}
    </SettingsSection>
  );
}

// =============================================================================
// SettingsPage
// =============================================================================

export default function SettingsPage({
  onBack,
  githubConnected: githubConnectedProp = false,
}: {
  onBack?: () => void;
  githubConnected?: boolean;
}) {
  const [params] = useSearchParams();
  const githubConnected = githubConnectedProp || params.get("github") === "connected";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6 md:py-10">
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:hidden"
              aria-label="Back"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
          )}
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Settings</h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Manage your account, API keys, and connected repositories.
        </p>
      </div>

      {githubConnected && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          GitHub repositories connected successfully.
        </div>
      )}

      <AccountSection />
      <ApiKeysSection />
      <RepositorySection />
      <AppearanceSection />
    </div>
  );
}
