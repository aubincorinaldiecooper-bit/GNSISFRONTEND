import { useState } from "react";
import {
  Monitor,
  Moon,
  Sun,
  Check,
  FolderGit,
  Link2,
  Unlink,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ThemeOption = "light" | "dark" | "system";

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border last:border-b-0 pb-8 mb-8">
      <h2 className="text-sm font-semibold text-foreground mb-5">{title}</h2>
      {children}
    </section>
  );
}

function SettingsRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <p className="text-sm text-foreground">{label}</p>
      {value && <p className="text-xs text-muted-foreground">{value}</p>}
    </div>
  );
}

// ---- Account ----

function AccountSection() {
  return (
    <SettingsSection title="Account">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600 shrink-0">
          A
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Aubin</p>
          <p className="text-xs text-muted-foreground">Workspace owner</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        <SettingsRow label="Name" value="Aubin" />
        <SettingsRow label="Workspace" value="Aubin" />
        <SettingsRow label="Email" value="aubin@gnsis.io" />
      </div>
    </SettingsSection>
  );
}

// ---- Appearance ----

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
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              theme === opt.value
                ? "border-foreground/20 bg-black/[0.04] text-foreground font-semibold"
                : "border-border text-muted-foreground hover:bg-black/[0.03] hover:text-foreground"
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

// ---- Repository connections ----

interface RepoConnection {
  name: string;
  connected: boolean;
}

function RepositorySection() {
  const [repos, setRepos] = useState<RepoConnection[]>([
    { name: "gnsis/frontend", connected: true },
    { name: "gnsis/api", connected: true },
    { name: "gnsis/docs", connected: true },
  ]);

  const toggleRepo = (index: number) => {
    setRepos((prev) =>
      prev.map((r, i) => (i === index ? { ...r, connected: !r.connected } : r))
    );
  };

  return (
    <SettingsSection title="Repository connections">
      {repos.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">No connected repositories.</span>
        </div>
      ) : (
        <div className="space-y-0.5">
          {repos.map((repo, i) => (
            <div
              key={repo.name}
              className="flex items-center justify-between py-2.5 gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FolderGit className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                <span className="text-sm font-mono text-foreground truncate">
                  {repo.name}
                </span>
                {repo.connected && (
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs text-emerald-600">
                    <Check className="h-3 w-3" />
                    Connected
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant={repo.connected ? "outline" : "secondary"}
                onClick={() => toggleRepo(i)}
                className="h-7 text-xs shrink-0"
              >
                {repo.connected ? (
                  <>
                    <Unlink className="h-3 w-3 mr-1" />
                    Disconnect
                  </>
                ) : (
                  <>
                    <Link2 className="h-3 w-3 mr-1" />
                    Connect
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}

// ---- Notifications ----

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

function NotificationsSection() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: "run-completed",
      label: "Run completed",
      description: "Get notified when an agent finishes a task.",
      enabled: true,
    },
    {
      id: "run-failed",
      label: "Run failed",
      description: "Get notified when a run stops before completion.",
      enabled: true,
    },
    {
      id: "smart-mode",
      label: "Smart Mode availability",
      description: "Get notified when Smart Mode becomes available.",
      enabled: false,
    },
  ]);

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  return (
    <SettingsSection title="Notifications">
      <div className="space-y-0.5">
        {settings.map((setting) => (
          <div
            key={setting.id}
            className="flex items-start justify-between py-3 gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm text-foreground">{setting.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {setting.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleSetting(setting.id)}
              className={cn(
                "relative shrink-0 inline-flex h-5 w-9 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                setting.enabled ? "bg-neutral-900" : "bg-neutral-300"
              )}
              aria-label={
                setting.enabled ? `Disable ${setting.label}` : `Enable ${setting.label}`
              }
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 inline-flex h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                  setting.enabled && "translate-x-4"
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

// =============================================================================
// SettingsPage
// =============================================================================

interface SettingsPageProps {
  onBack?: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
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
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Settings
          </h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Manage your account, appearance, and preferences.
        </p>
      </div>

      <AccountSection />
      <AppearanceSection />
      <RepositorySection />
      <NotificationsSection />
    </div>
  );
}
