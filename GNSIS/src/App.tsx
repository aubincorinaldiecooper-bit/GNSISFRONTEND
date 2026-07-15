import React, {
  useState,
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Terminal,
  ListChecks,
  LayoutGrid,
  CirclePlus,
  Settings2,
  CreditCard,
  CircleHelp,
  LogOut,
  ChevronsUpDown,
  FolderGit,
  GitBranch,
  Send,
  Loader2,
  CircleCheck,
  CircleX,
  Circle,
  ExternalLink,
  AlertTriangle,
  Activity as ActivityGlyph,
  Menu,
  X,
} from "lucide-react";
import SettingsPage from "@/pages/SettingsPage";
import BillingPage from "@/pages/BillingPage";
import {
  createJob,
  listJobs,
  getJob,
  getJobLogs,
  getJobDiff,
  approveJob,
  rejectJob,
  isApiConfigured,
  ApiError,
  isTerminalStatus,
  type JobRecord,
  type JobStatus,
  type LogRecord,
  type DiffRecord,
} from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// =============================================================================
// UTILITY
// =============================================================================

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// =============================================================================
// DIVIDER
// =============================================================================

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

function Divider({ orientation = "vertical", className }: DividerProps) {
  return (
    <div
      className={cn(
        "bg-border shrink-0",
        orientation === "vertical" ? "w-px h-full" : "h-px w-full",
        className
      )}
    />
  );
}

// =============================================================================
// STATUS INDICATOR
// =============================================================================

type StatusKind = "idle" | "active" | "completed" | "waiting" | "failed";

const statusDotCls: Record<StatusKind, string> = {
  idle: "bg-muted-foreground/40",
  active: "bg-blue-500",
  completed: "bg-emerald-500",
  waiting: "bg-amber-500",
  failed: "bg-red-500",
};

const statusTextCls: Record<StatusKind, string> = {
  idle: "text-muted-foreground",
  active: "text-blue-600",
  completed: "text-emerald-600",
  waiting: "text-amber-600",
  failed: "text-red-600",
};

interface StatusIndicatorProps {
  status: StatusKind;
  label?: string;
  className?: string;
}

function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span className="relative flex h-2 w-2 shrink-0">
        {status === "active" && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping motion-reduce:animate-none",
              statusDotCls[status]
            )}
          />
        )}
        <span className={cn("relative inline-flex rounded-full h-2 w-2", statusDotCls[status])} />
      </span>
      {label && <span className={cn("font-medium", statusTextCls[status])}>{label}</span>}
    </span>
  );
}

// =============================================================================
// ICON BUTTON (with accessibility)
// =============================================================================

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

function IconButton({ icon, label, onClick, active, className }: IconButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={cn(
              "inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors duration-150",
              "text-muted-foreground hover:text-foreground hover:bg-black/[0.04]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              active && "bg-black/[0.04] text-foreground",
              className
            )}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="text-center space-y-2 max-w-xs">
        {icon && (
          <div className="flex justify-center mb-3">
            <span className="text-muted-foreground/40">{icon}</span>
          </div>
        )}
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-sm font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors mt-1"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SIDEBAR — DATA & TYPES
// =============================================================================

type RunStatus = "queued" | "running" | "awaiting_approval" | "complete" | "rejected" | "failed";
type NavId = "new-run" | "runs" | "dashboard";

function jobStatusToRunStatus(status: JobStatus): RunStatus {
  switch (status) {
    case "queued":
      return "queued";
    case "awaiting_approval":
      return "awaiting_approval";
    case "completed":
      return "complete";
    case "rejected":
      return "rejected";
    case "failed":
      return "failed";
    default:
      return "running";
  }
}

const runLabelCls: Record<RunStatus, { label: string; cls: string }> = {
  queued: { label: "Queued", cls: "text-muted-foreground" },
  running: { label: "Running", cls: "text-blue-600" },
  awaiting_approval: { label: "Needs approval", cls: "text-amber-600" },
  complete: { label: "Complete", cls: "text-emerald-600" },
  rejected: { label: "Rejected", cls: "text-muted-foreground" },
  failed: { label: "Failed", cls: "text-red-600" },
};

function StatusLabel({ status }: { status: RunStatus }) {
  const s = runLabelCls[status];
  return <span className={cn("font-medium", s.cls)}>{s.label}</span>;
}

// Sidebar/table row shape, derived from a real JobRecord — no fabricated fields.
interface RecentRun {
  id: string;
  title: string;
  repo: string;
  engine: string;
  status: RunStatus;
  updatedAt: string;
}

function toRecentRun(job: JobRecord): RecentRun {
  return {
    id: job.id,
    title: job.instruction.split("\n")[0].slice(0, 140) || job.instruction,
    repo: job.repo,
    engine: job.engine,
    status: jobStatusToRunStatus(job.status),
    updatedAt: job.updated_at,
  };
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

// =============================================================================
// SIDEBAR NAV ITEM
// =============================================================================

function SidebarNavItem({
  icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const content = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        collapsed && "justify-center px-0 h-9 w-9 mx-auto",
        active
          ? "bg-black/[0.04] text-foreground font-medium"
          : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground"
      )}
    >
      <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );

  if (!collapsed) return content;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// SIDEBAR RUN ROW (full-width click target)
// =============================================================================

const sidebarStatusIcon: Record<RunStatus, React.ReactNode> = {
  queued: <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 self-start mt-0.5" />,
  running: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin motion-reduce:animate-none shrink-0 self-start mt-0.5" />,
  awaiting_approval: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 self-start mt-0.5" />,
  complete: <CircleCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0 self-start mt-0.5" />,
  rejected: <CircleX className="h-3.5 w-3.5 text-muted-foreground shrink-0 self-start mt-0.5" />,
  failed: <CircleX className="h-3.5 w-3.5 text-red-500 shrink-0 self-start mt-0.5" />,
};

function SidebarRunRow({
  run,
  active,
  collapsed,
  onClick,
}: {
  run: RecentRun;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  if (collapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onClick}
              aria-label={`${run.title} \u2014 ${runLabelCls[run.status].label}`}
              className={cn(
                "flex items-center justify-center h-8 w-8 mx-auto rounded-lg transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active ? "bg-black/[0.05] text-foreground" : "hover:bg-black/[0.03]"
              )}
            >
              {sidebarStatusIcon[run.status]}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs max-w-48">
            {run.title}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active ? "bg-black/[0.05]" : "hover:bg-black/[0.03]"
      )}
    >
      {sidebarStatusIcon[run.status]}
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-foreground truncate leading-tight">
          {run.title}
        </span>
        <span className="block text-xs text-muted-foreground truncate leading-tight mt-0.5">
          {timeAgo(run.updatedAt)}
        </span>
      </span>
    </button>
  );
}

// =============================================================================
// USAGE METER (backend does not track cost/usage yet — shown as unavailable)
// =============================================================================

function UsageMeter() {
  return (
    <div className="px-3 pb-2.5 pt-3 space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Usage balance
      </span>
      <p className="text-xs text-muted-foreground">Not tracked yet</p>
    </div>
  );
}

function CollapsedUsageIndicator() {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="px-4 pb-2.5 pt-3 flex justify-center cursor-pointer">
            <div className="h-1.5 w-9 rounded-full bg-neutral-200/80 overflow-hidden" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          Usage tracking not available yet
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// ACCOUNT ROW
// =============================================================================

function AccountRow({
  collapsed,
  onSettings,
  onBilling,
}: {
  collapsed: boolean;
  onSettings: () => void;
  onBilling: () => void;
}) {
  const trigger = (
    <button
      type="button"
      className={cn(
        "flex items-center h-12 px-3 shrink-0 w-full transition-colors duration-150 hover:bg-black/[0.03]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        collapsed && "justify-center px-0"
      )}
    >
      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-neutral-200 text-[10px] font-semibold text-neutral-600 shrink-0">
        A
      </div>
      {!collapsed && (
        <>
          <span className="ml-2 min-w-0 flex-1 text-left">
            <span className="block text-xs font-semibold text-foreground truncate">
              Aubin
            </span>
            <span className="block text-[11px] text-muted-foreground truncate">
              Workspace
            </span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        </>
      )}
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>{trigger}</TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Aubin · Workspace
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          trigger
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-48">
        <DropdownMenuItem onClick={onSettings}>
          <Settings2 className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onBilling}>
          <CreditCard className="h-4 w-4" />
          Billing
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CircleHelp className="h-4 w-4" />
          Help
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// SIDEBAR REGION (only recent runs scroll)
// =============================================================================

interface SidebarRegionProps {
  collapsed: boolean;
  onToggle: () => void;
  activeNav: NavId;
  activeRunId: string | null;
  runs: RecentRun[];
  onNavSelect: (id: NavId) => void;
  onRunSelect: (id: string) => void;
  onSettings: () => void;
  onBilling: () => void;
  children?: React.ReactNode;
}

function SidebarRegion({
  collapsed,
  onToggle,
  activeNav,
  activeRunId,
  runs,
  onNavSelect,
  onRunSelect,
  onSettings,
  onBilling,
  children,
}: SidebarRegionProps) {
  const navItems: Array<{ id: NavId; label: string; icon: React.ReactNode }> = [
    { id: "new-run", label: "New run", icon: <CirclePlus /> },
    { id: "runs", label: "Runs", icon: <ListChecks /> },
    { id: "dashboard", label: "Dashboard", icon: <LayoutGrid /> },
  ];

  return (
    <aside
      style={{ width: collapsed ? 68 : 250 }}
      className={cn(
        "relative flex flex-col h-full shrink-0 bg-neutral-50",
        "transition-[width] duration-200 ease-in-out overflow-hidden"
      )}
    >
      {/* Logo area — fixed */}
      <div
        className={cn(
          "flex items-center h-14 pl-3 pr-2.5 shrink-0 gap-1",
          collapsed ? "justify-center px-2" : "justify-between"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-neutral-900 text-white shrink-0">
            <Terminal className="h-3.5 w-3.5" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-foreground truncate">
              GNSIS
            </span>
          )}
        </div>
        <IconButton
          icon={collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
          className="h-7 w-7 shrink-0"
        />
      </div>

      <Divider orientation="horizontal" />

      {children ? (
        children
      ) : (
        <>
          {/* Primary navigation — fixed */}
          <div className={cn("shrink-0 py-2.5 px-2 space-y-0.5", collapsed && "px-2")}>
            {navItems.map((item) => (
              <SidebarNavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed}
                active={activeNav === item.id && activeRunId === null}
                onClick={() => onNavSelect(item.id)}
              />
            ))}
          </div>

          <Divider orientation="horizontal" />

          {/* Recent — scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">
            <div className="py-2.5 px-2 space-y-0.5">
              {!collapsed && (
                <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent
                </p>
              )}
              {runs.length === 0 && !collapsed && (
                <p className="px-2.5 py-4 text-xs text-muted-foreground text-center">
                  No recent runs
                </p>
              )}
              {runs.slice(0, 5).map((run) => (
                <SidebarRunRow
                  key={run.id}
                  run={run}
                  collapsed={collapsed}
                  active={activeRunId === run.id}
                  onClick={() => onRunSelect(run.id)}
                />
              ))}
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => onNavSelect("runs")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 mt-1"
                >
                  <ListChecks className="h-3.5 w-3.5 shrink-0" />
                  <span>View all runs</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <Divider orientation="horizontal" />

      {/* Usage meter — fixed */}
      {collapsed ? <CollapsedUsageIndicator /> : <UsageMeter />}

      <Divider orientation="horizontal" />

      {/* Account — fixed */}
      <AccountRow collapsed={collapsed} onSettings={onSettings} onBilling={onBilling} />
    </aside>
  );
}


// =============================================================================
// NEW RUN COMPOSER (with duplicate submission prevention)
// =============================================================================

interface ComposerSelection {
  repo: string;
  branch: string;
}

interface NewRunComposerProps {
  onSubmit: (prompt: string, selection: ComposerSelection) => Promise<void>;
}

const knownRepos = [
  "aubincorinaldiecooper-bit/gnsisfrontend",
  "aubincorinaldiecooper-bit/gnsisbackend",
];

function NewRunComposer({ onSubmit }: NewRunComposerProps) {
  const [prompt, setPrompt] = useState("");
  const [repo, setRepo] = useState(knownRepos[0]);
  const [branch, setBranch] = useState("main");
  const [showMobileConfig, setShowMobileConfig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = prompt.trim().length > 0 && repo.trim().length > 0 && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(prompt.trim(), { repo: repo.trim(), branch: branch.trim() || "main" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start the run.");
      setIsSubmitting(false);
    }
  }, [canSubmit, prompt, repo, branch, onSubmit]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 pb-4 md:pb-0">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          What should Genesis work on?
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Choose your repository, describe the task, and start the run.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the change you want Genesis to make…"
          className="min-h-28 resize-none border-none shadow-none rounded-none px-4 py-3.5 text-sm focus-visible:ring-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <Divider orientation="horizontal" />

        {/* Desktop fields */}
        <div className="hidden md:flex items-center justify-between gap-2 px-2.5 py-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <FolderGit className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
              <Input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="owner/repo"
                list="repo-suggestions"
                className="h-7 w-64 border-none shadow-none bg-transparent px-1.5 text-xs font-mono focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
              <Input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="h-7 w-28 border-none shadow-none bg-transparent px-1.5 text-xs font-mono focus-visible:ring-0"
              />
            </div>
          </div>

          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="h-8 shrink-0 gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Start run
          </Button>
        </div>

        {/* Mobile bottom bar */}
        <div className="flex md:hidden items-center justify-between gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setShowMobileConfig((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left min-w-0 truncate"
          >
            <span className="font-mono">{repo || "owner/repo"}</span> · {branch || "main"}
          </button>
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="h-9 shrink-0 gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white px-4"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span className="text-sm">Start</span>
          </Button>
        </div>

        {/* Mobile config sheet */}
        {showMobileConfig && (
          <div className="md:hidden border-t border-border px-3 py-2.5 space-y-2 bg-neutral-50/50">
            <Input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo"
              list="repo-suggestions"
              className="h-8 text-xs font-mono"
            />
            <Input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="h-8 text-xs font-mono"
            />
          </div>
        )}

        <datalist id="repo-suggestions">
          {knownRepos.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>

      {error && (
        <p className="mt-2 text-center text-xs text-red-600">{error}</p>
      )}
      {!isApiConfigured() && (
        <p className="mt-2 text-center text-xs text-amber-600">
          VITE_API_BASE_URL is not configured — runs cannot be started.
        </p>
      )}
    </div>
  );
}

// =============================================================================
// RUN THREAD STATE MACHINE
// =============================================================================

// A thread mirrors one real backend job: status drives which messages render,
// logs are the real per-phase event stream, diff is the proposed patch (once
// the engine has produced one).
interface ThreadState {
  job: JobRecord;
  logs: LogRecord[];
  diff: DiffRecord | null;
  actionPending: "approve" | "reject" | null;
  actionError: string | null;
}

const phaseStatusLabel: Record<JobStatus, string> = {
  queued: "Genesis is queued…",
  planning: "Genesis is planning the change…",
  patching: "Genesis is writing the patch…",
  testing: "Running tests…",
  summarizing: "Genesis is summarizing the change…",
  awaiting_approval: "Genesis is ready for review",
  approved: "Approved — preparing to publish…",
  publishing: "Opening the pull request…",
  completed: "Run complete",
  rejected: "Run rejected",
  failed: "Run failed",
};

// =============================================================================
// THREAD SUB-COMPONENTS
// =============================================================================

function ThreadContextRow({ job }: { job: JobRecord }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground/80 pb-4">
      <span className="font-mono">{job.repo}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className="font-mono">{job.branch || job.base_branch}</span>
      <span className="text-muted-foreground/40">·</span>
      <span>{job.engine}</span>
    </div>
  );
}

function TaskMessage({ instruction }: { instruction: string }) {
  return (
    <div className="border-b border-border pb-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        Task
      </p>
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{instruction}</p>
    </div>
  );
}

const inFlightStatuses: JobStatus[] = ["queued", "planning", "patching", "testing", "summarizing", "approved", "publishing"];

function StatusMessage({ status }: { status: JobStatus }) {
  return (
    <div className="flex items-center gap-2.5 py-4 border-b border-border">
      <Loader2 className="h-4 w-4 text-blue-500 animate-spin motion-reduce:animate-none shrink-0" />
      <p className="text-sm text-muted-foreground">{phaseStatusLabel[status]}</p>
    </div>
  );
}

function DiffSummary({ diff }: { diff: DiffRecord }) {
  const [showPatch, setShowPatch] = useState(false);
  return (
    <div className="space-y-2">
      <ul className="text-xs text-muted-foreground space-y-1">
        {diff.files_changed.length === 0 && <li>No files changed.</li>}
        {diff.files_changed.map((f) => (
          <li key={f} className="flex items-center gap-1.5 font-mono">
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      {diff.patch && (
        <button
          type="button"
          onClick={() => setShowPatch((v) => !v)}
          className="text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/80"
        >
          {showPatch ? "Hide patch" : "View patch"}
        </button>
      )}
      {showPatch && diff.patch && (
        <pre className="max-h-64 overflow-auto rounded-lg bg-neutral-950 text-neutral-100 text-[11px] leading-relaxed p-3 font-mono whitespace-pre">
          {diff.patch}
        </pre>
      )}
    </div>
  );
}

function ApprovalBlock({
  diff,
  pending,
  error,
  onApprove,
  onReject,
}: {
  diff: DiffRecord | null;
  pending: "approve" | "reject" | null;
  error: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <StatusIndicator status="waiting" />
        <p className="text-sm font-semibold text-foreground">Genesis is ready for review</p>
      </div>
      {diff ? (
        <DiffSummary diff={diff} />
      ) : (
        <p className="text-sm text-muted-foreground">Loading the proposed diff…</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <Button
          size="sm"
          disabled={pending !== null}
          onClick={onApprove}
          className="h-8 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white"
        >
          {pending === "approve" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Approve &amp; publish
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending !== null}
          onClick={onReject}
          className="h-8 rounded-lg"
        >
          {pending === "reject" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Reject
        </Button>
      </div>
    </div>
  );
}

const prUrlPattern = /opened PR #\d+: (\S+)/;

function findPrUrl(logs: LogRecord[]): string | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const match = logs[i].message.match(prUrlPattern);
    if (match) return match[1];
  }
  return null;
}

function RunCompleteMessage({ job, diff, logs }: { job: JobRecord; diff: DiffRecord | null; logs: LogRecord[] }) {
  const prUrl = findPrUrl(logs);
  return (
    <div className="py-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <CircleCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-sm font-semibold text-foreground">Run complete</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-6">
        {diff && diff.files_changed.length > 0
          ? `${diff.files_changed.length} file${diff.files_changed.length === 1 ? "" : "s"} changed on branch ${job.branch ?? job.base_branch}.`
          : "The run finished successfully."}
      </p>
      {prUrl && (
        <a
          href={prUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 pl-6 text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/80"
        >
          View pull request <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function FailedMessage({ job }: { job: JobRecord }) {
  return (
    <div className="py-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <CircleX className="h-4 w-4 text-red-500 shrink-0" />
        <p className="text-sm font-semibold text-red-600">Run failed</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-6">
        {job.error || "The run failed before it could finish."}
      </p>
    </div>
  );
}

function RejectedMessage() {
  return (
    <div className="py-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <CircleX className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm font-semibold text-foreground">Run rejected</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-6">
        The proposed change was reviewed and rejected before publishing.
      </p>
    </div>
  );
}

// =============================================================================
// RUN THREAD
// =============================================================================

function RunThread({
  thread,
  onApprove,
  onReject,
}: {
  thread: ThreadState;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { job, diff, logs, actionPending, actionError } = thread;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <ThreadContextRow job={job} />
      <TaskMessage instruction={job.instruction} />

      {inFlightStatuses.includes(job.status) && <StatusMessage status={job.status} />}

      {job.status === "awaiting_approval" && (
        <div className="pt-4">
          <ApprovalBlock
            diff={diff}
            pending={actionPending}
            error={actionError}
            onApprove={onApprove}
            onReject={onReject}
          />
        </div>
      )}

      {job.status === "completed" && <RunCompleteMessage job={job} diff={diff} logs={logs} />}
      {job.status === "failed" && <FailedMessage job={job} />}
      {job.status === "rejected" && <RejectedMessage />}
    </div>
  );
}

// =============================================================================
// THREAD COMPOSER (sticky, clear status)
// =============================================================================

// Follow-up messages on an existing job aren't supported by the backend yet
// (a job is one-shot: create → approve/reject). Shown disabled rather than a
// control that silently no-ops.
function ThreadComposer({ onNewRun }: { onNewRun: () => void }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 pb-4 md:pb-6">
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <Textarea
          value=""
          disabled
          placeholder="Follow-up messages aren't supported yet — start a new run instead."
          className="min-h-16 resize-none border-none shadow-none rounded-none px-4 py-3 text-sm focus-visible:ring-0 disabled:opacity-50"
        />
        <Divider orientation="horizontal" />
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">Not supported yet.</span>
          <Button
            size="sm"
            onClick={onNewRun}
            className="h-7 gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            <Send className="h-3.5 w-3.5" />
            New run
          </Button>
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// ACTIVITY PANEL (real log stream from GET /jobs/{id}/logs)
// =============================================================================

function LogRow({ log }: { log: LogRecord }) {
  const icon =
    log.level === "error" ? (
      <CircleX className="h-3.5 w-3.5 text-red-500" />
    ) : log.level === "warning" ? (
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
    ) : (
      <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
    );

  return (
    <div className="flex items-start gap-2.5 px-4 py-2.5 border-b border-border last:border-b-0">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {log.phase && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 truncate">
              {log.phase}
            </span>
          )}
          <span className="text-xs text-muted-foreground/60 font-mono shrink-0 ml-auto">
            {timeAgo(log.created_at)}
          </span>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed mt-0.5 break-words">{log.message}</p>
      </div>
    </div>
  );
}

function ActivityPanel({ thread }: { thread: ThreadState }) {
  if (thread.logs.length === 0) {
    return (
      <EmptyState
        icon={<ActivityGlyph className="h-8 w-8" />}
        title="No activity yet"
        description="Logs will appear here as Genesis works on this run."
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="flex-1">
        {thread.logs.map((log, i) => (
          <LogRow key={i} log={log} />
        ))}
      </div>
      <div className="shrink-0 sticky bottom-0 bg-white border-t border-border px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Compute used</span>
        <span className="text-xs text-muted-foreground">Not tracked yet</span>
      </div>
    </div>
  );
}

// =============================================================================
// RECEIPT PANEL (real status/outcome/files; cost & token accounting not
// tracked by the backend yet, shown as unavailable rather than fabricated)
// =============================================================================

function SummaryItem({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-foreground", emphasize ? "text-base font-semibold" : "text-sm font-medium")}>
        {value}
      </p>
    </div>
  );
}

function receiptOutcome(thread: ThreadState): string {
  const { job, diff } = thread;
  if (job.status === "failed") return job.error || "The run failed before it could finish.";
  if (job.status === "rejected") return "The proposed change was reviewed and rejected before publishing.";
  if (diff && diff.files_changed.length > 0) {
    return `Changed ${diff.files_changed.length} file${diff.files_changed.length === 1 ? "" : "s"} on branch ${job.branch ?? job.base_branch}.`;
  }
  return "The run finished successfully.";
}

function ReceiptPanel({ thread }: { thread: ThreadState }) {
  const { job, diff } = thread;
  const failed = job.status === "failed" || job.status === "rejected";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4 border-b border-border space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Run receipt
        </p>
        <p className="text-sm font-semibold text-foreground line-clamp-2">{job.instruction}</p>
        <p className="text-xs text-muted-foreground font-mono">
          {job.repo} · {job.id}
        </p>
        <div className="flex items-center gap-1.5 pt-1">
          {failed ? (
            <CircleX className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
          )}
          <span className={cn("text-sm font-semibold", failed ? "text-red-600" : "text-emerald-600")}>
            {runLabelCls[jobStatusToRunStatus(job.status)].label}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-border space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Outcome
        </p>
        <p className="text-sm text-foreground leading-relaxed">{receiptOutcome(thread)}</p>
      </div>

      <div className="px-4 py-4 border-b border-border space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <SummaryItem label="Tokens" value="Not tracked yet" />
          <SummaryItem label="Spent" value="Not tracked yet" />
          <SummaryItem label="Files changed" value={String(diff?.files_changed.length ?? 0)} emphasize />
          <SummaryItem label="Engine" value={job.engine} />
        </div>
      </div>

      {diff && diff.files_changed.length > 0 && (
        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-foreground mb-2">Files changed</p>
          <ul className="text-xs text-muted-foreground space-y-1 font-mono">
            {diff.files_changed.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RUN PANEL HEADER (with unread indicator)
// =============================================================================

function RunPanelHeader({
  collapsed,
  tab,
  onTabChange,
  receiptEnabled,
  onToggle,
  hasActivity,
}: {
  collapsed: boolean;
  tab: "activity" | "receipt";
  onTabChange: (tab: "activity" | "receipt") => void;
  receiptEnabled: boolean;
  onToggle: () => void;
  hasActivity: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center h-14 pl-3 pr-2.5 shrink-0 justify-between gap-1",
        collapsed && "px-0 justify-center"
      )}
    >
      {!collapsed && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onTabChange("activity")}
            className={cn(
              "h-7 px-2.5 rounded-md text-xs font-semibold transition-colors duration-150 relative",
              tab === "activity"
                ? "bg-black/[0.04] text-foreground"
                : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground"
            )}
          >
            Activity
            {hasActivity && tab !== "activity" && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500" />
            )}
          </button>
          {receiptEnabled ? (
            <button
              type="button"
              onClick={() => onTabChange("receipt")}
              className={cn(
                "h-7 px-2.5 rounded-md text-xs font-semibold transition-colors duration-150",
                tab === "receipt"
                  ? "bg-black/[0.04] text-foreground"
                  : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground"
              )}
            >
              Receipt
            </button>
          ) : (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled
                    className="h-7 px-2.5 rounded-md text-xs font-semibold text-muted-foreground/40 cursor-not-allowed"
                  >
                    Receipt
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Available when complete
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
      <IconButton
        icon={collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        label={collapsed ? "Expand run panel" : "Collapse run panel"}
        onClick={onToggle}
        className="shrink-0"
      />
    </div>
  );
}

function CollapsedRunPanel({ jobStatus }: { jobStatus?: JobStatus }) {
  const status: StatusKind = !jobStatus
    ? "idle"
    : jobStatus === "completed"
    ? "completed"
    : jobStatus === "failed" || jobStatus === "rejected"
    ? "failed"
    : jobStatus === "awaiting_approval"
    ? "waiting"
    : "active";

  return (
    <div className="flex flex-col items-center py-4 gap-3">
      <ActivityGlyph className="h-4 w-4 text-muted-foreground/70" />
      <StatusIndicator status={status} />
    </div>
  );
}

// =============================================================================
// RUN PANEL REGION (with tab scroll preservation & unread indicator)
// =============================================================================

type WorkspaceView =
  | { kind: "composer" }
  | { kind: "thread"; thread: ThreadState; threadKey: string }
  | { kind: "runs" }
  | { kind: "dashboard" }
  | { kind: "settings" }
  | { kind: "billing" };

function RunPanelRegion({
  collapsed,
  onToggle,
  view,
}: {
  collapsed: boolean;
  onToggle: () => void;
  view: WorkspaceView;
}) {
  const hasThread = view.kind === "thread";
  const status = hasThread ? view.thread.job.status : undefined;
  const threadKey = hasThread ? view.threadKey : null;

  const [tab, setTab] = useState<"activity" | "receipt">("activity");
  const prevStatusRef = useRef<JobStatus | null>(null);

  // Scroll positions per tab
  const activityScrollRef = useRef<HTMLDivElement>(null);
  const receiptScrollRef = useRef<HTMLDivElement>(null);

  // Store scroll positions when switching tabs
  const activityScrollPos = useRef(0);
  const receiptScrollPos = useRef(0);

  const handleTabChange = (newTab: "activity" | "receipt") => {
    // Save current scroll
    if (tab === "activity" && activityScrollRef.current) {
      activityScrollPos.current = activityScrollRef.current.scrollTop;
    } else if (tab === "receipt" && receiptScrollRef.current) {
      receiptScrollPos.current = receiptScrollRef.current.scrollTop;
    }
    setTab(newTab);
    // Restore scroll after render
    requestAnimationFrame(() => {
      if (newTab === "activity" && activityScrollRef.current) {
        activityScrollRef.current.scrollTop = activityScrollPos.current;
      } else if (newTab === "receipt" && receiptScrollRef.current) {
        receiptScrollRef.current.scrollTop = receiptScrollPos.current;
      }
    });
  };

  // Reset on thread change
  useEffect(() => {
    if (!hasThread) {
      prevStatusRef.current = null;
      setTab("activity");
      activityScrollPos.current = 0;
      receiptScrollPos.current = 0;
      return;
    }
    const initialStatus = view.thread.job.status;
    setTab(isTerminalStatus(initialStatus) ? "receipt" : "activity");
    activityScrollPos.current = 0;
    receiptScrollPos.current = 0;
    prevStatusRef.current = initialStatus;
  }, [threadKey]);

  // Auto-switch to receipt when run completes
  useEffect(() => {
    if (!hasThread) return;
    const statusNow = view.thread.job.status;
    if (prevStatusRef.current && prevStatusRef.current !== "completed" && statusNow === "completed") {
      handleTabChange("receipt");
    }
    prevStatusRef.current = statusNow;
  }, [hasThread, status]);

  const receiptEnabled = !!status && isTerminalStatus(status);
  const hasActivity = hasThread && !(status && isTerminalStatus(status));

  return (
    <aside
      style={{ width: collapsed ? 48 : 400 }}
      className={cn(
        "relative flex flex-col h-full shrink-0 bg-neutral-50/60",
        "transition-[width] duration-200 ease-in-out overflow-hidden"
      )}
    >
      <RunPanelHeader
        collapsed={collapsed}
        tab={tab}
        onTabChange={handleTabChange}
        receiptEnabled={receiptEnabled}
        onToggle={onToggle}
        hasActivity={!!hasActivity}
      />

      <Divider orientation="horizontal" />

      {collapsed ? (
        <div className="flex-1 cursor-pointer" onClick={onToggle}>
          <CollapsedRunPanel jobStatus={status} />
        </div>
      ) : !hasThread ? (
        tab === "activity" ? (
          <EmptyState
            icon={<ActivityGlyph className="h-8 w-8" />}
            title="No active run"
            description="Start a task to view live activity."
          />
        ) : (
          <EmptyState
            icon={<CircleCheck className="h-8 w-8" />}
            title="No receipt yet"
            description="Receipts appear after a run completes."
          />
        )
      ) : tab === "activity" ? (
        <div ref={activityScrollRef} className="flex-1 overflow-y-auto">
          <ActivityPanel thread={view.thread} />
        </div>
      ) : (
        <div ref={receiptScrollRef} className="flex-1 overflow-y-auto">
          <ReceiptPanel thread={view.thread} />
        </div>
      )}
    </aside>
  );
}

// =============================================================================
// SEARCH VIEW (with empty state)
// =============================================================================

function RunsFilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="h-8 text-xs w-auto gap-1.5">
        <SelectValue>
          <span className="text-muted-foreground">{label}:</span>{" "}
          <span>{value === "all" ? "All" : value}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="all">All</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const runsColumns = "grid-cols-[2fr_1.3fr_0.9fr_0.9fr_0.9fr]";
const runStatusOptions: RunStatus[] = ["queued", "running", "awaiting_approval", "complete", "rejected", "failed"];

function RunsTableRow({ run, onClick }: { run: RecentRun; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full grid items-center gap-3 px-3 py-2.5 text-left border-b border-border last:border-b-0",
        "hover:bg-black/[0.03] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        runsColumns
      )}
    >
      <span className="text-sm text-foreground truncate">{run.title}</span>
      <span className="text-xs font-mono text-muted-foreground truncate">{run.repo}</span>
      <span className="text-xs text-muted-foreground truncate">{run.engine}</span>
      <span className="text-xs"><StatusLabel status={run.status} /></span>
      <span className="text-xs text-muted-foreground/70 text-right">{timeAgo(run.updatedAt)}</span>
    </button>
  );
}

function RunsView({ runs, onSelectRun }: { runs: RecentRun[]; onSelectRun: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [repoFilter, setRepoFilter] = useState("all");

  const repoOptions = Array.from(new Set(runs.map((r) => r.repo)));

  const filtered = runs.filter((run) => {
    if (statusFilter !== "all" && run.status !== statusFilter) return false;
    if (repoFilter !== "all" && run.repo !== repoFilter) return false;
    if (
      query.trim().length > 0 &&
      !`${run.title} ${run.repo} ${run.id}`.toLowerCase().includes(query.trim().toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="w-full px-4 md:px-8 py-8 md:py-10">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Runs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Search, filter, and review previous executions.</p>
      </div>

      <div className="relative mb-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks, repositories, or run IDs…"
          className="h-10 max-w-md"
        />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <RunsFilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={runStatusOptions} />
        <RunsFilterSelect label="Repository" value={repoFilter} onChange={setRepoFilter} options={repoOptions} />
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        {filtered.length} {filtered.length === 1 ? "run" : "runs"}
      </p>

      {/* Desktop header */}
      <div className={cn("hidden md:grid gap-3 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", runsColumns)}>
        <span>Task</span>
        <span>Repository</span>
        <span>Engine</span>
        <span>Status</span>
        <span className="text-right">Updated</span>
      </div>

      {/* Desktop rows */}
      <div className="hidden md:block border-t border-border">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">No runs match your filters.</p>
          </div>
        ) : (
          filtered.map((run) => (
            <RunsTableRow key={run.id} run={run} onClick={() => onSelectRun(run.id)} />
          ))
        )}
      </div>

      {/* Mobile stacked rows */}
      <div className="md:hidden space-y-2 mt-2">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No runs match your filters.</p>
          </div>
        ) : (
          filtered.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => onSelectRun(run.id)}
              className="w-full rounded-lg border border-border bg-white p-3 text-left space-y-1.5 hover:bg-black/[0.02] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground font-semibold truncate">{run.title}</span>
                <span className="text-xs text-muted-foreground/70 shrink-0 ml-2">{timeAgo(run.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{run.repo}</span>
                <span>·</span>
                <span>{run.engine}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <StatusLabel status={run.status} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// GITHUB ONBOARDING CARD
// =============================================================================

function GitHubOnboardingCard({ hasRuns, onNewRun }: { hasRuns: boolean; onNewRun: () => void }) {
  if (hasRuns) return null;

  return (
    <div className="rounded-xl border border-border bg-white p-5 mb-8">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <CirclePlus className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Start your first run</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Describe a task and point Genesis at a repository to get started.
          </p>
          <Button
            size="sm"
            onClick={onNewRun}
            className="h-8 mt-3 gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs"
          >
            New run
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DASHBOARD (run counts are real; cost/token/savings tracking not built yet)
// =============================================================================

const dashboardColumns = "grid-cols-[1.8fr_1.2fr_0.9fr_0.9fr_0.9fr]";

function DashboardView({
  runs,
  onSelectRun,
  onNewRun,
}: {
  runs: RecentRun[];
  onSelectRun: (id: string) => void;
  onNewRun: () => void;
}) {
  const counts = runs.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.status === "complete") acc.complete += 1;
      else if (r.status === "failed" || r.status === "rejected") acc.failed += 1;
      else acc.active += 1;
      return acc;
    },
    { total: 0, complete: 0, active: 0, failed: 0 }
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-10">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Run activity across your repositories.</p>
        </div>
        <Button
          onClick={onNewRun}
          className="h-8 shrink-0 gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs px-3"
        >
          <CirclePlus className="h-3.5 w-3.5" />
          <span className="hidden md:inline">New run</span>
        </Button>
      </div>

      {/* GitHub onboarding card */}
      <GitHubOnboardingCard hasRuns={runs.length > 0} onNewRun={onNewRun} />

      {/* Run counts (real) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl border border-border bg-white p-5 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total runs
          </span>
          <p className="text-2xl font-bold text-foreground">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            In progress
          </span>
          <p className="text-2xl font-bold text-foreground">{counts.active}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Completed
          </span>
          <p className="text-2xl font-bold text-foreground">{counts.complete}</p>
        </div>
      </div>

      {/* Cost/usage tracking — not built yet, shown as unavailable rather than fabricated */}
      <div className="rounded-xl border border-dashed border-border p-5 mb-8">
        <p className="text-sm font-semibold text-foreground">Compute cost &amp; verified savings</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          The backend doesn't track token usage or cost yet, so this section isn't shown here. It'll
          appear once that data is available.
        </p>
      </div>

      {/* Recent runs (real) */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-2">Recent runs</p>
        <div className={cn("hidden md:grid gap-3 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", dashboardColumns)}>
          <span>Run</span>
          <span>Repository</span>
          <span>Engine</span>
          <span>Status</span>
          <span className="text-right">Updated</span>
        </div>
        <div className="hidden md:block border-t border-border">
          {runs.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            </div>
          ) : (
            runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelectRun(run.id)}
                className={cn(
                  "w-full grid items-center gap-3 px-3 py-2.5 text-left border-b border-border last:border-b-0",
                  "hover:bg-black/[0.03] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  dashboardColumns
                )}
              >
                <span className="text-sm text-foreground truncate">{run.title}</span>
                <span className="text-xs font-mono text-muted-foreground truncate">{run.repo}</span>
                <span className="text-xs text-muted-foreground truncate">{run.engine}</span>
                <span className="text-xs"><StatusLabel status={run.status} /></span>
                <span className="text-xs text-muted-foreground/70 text-right">{timeAgo(run.updatedAt)}</span>
              </button>
            ))
          )}
        </div>
        <div className="md:hidden space-y-2 mt-2">
          {runs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            </div>
          ) : (
            runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelectRun(run.id)}
                className="w-full rounded-lg border border-border bg-white p-3 text-left space-y-1.5 hover:bg-black/[0.02] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground font-semibold truncate">{run.title}</span>
                  <span className="text-xs text-muted-foreground/70 shrink-0 ml-2">{timeAgo(run.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{run.repo}</span>
                  <span>·</span>
                  <span>{run.engine}</span>
                  <span>·</span>
                  <StatusLabel status={run.status} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// WORKSPACE REGION
// =============================================================================

function WorkspaceRegion({
  view,
  runs,
  onSubmit,
  onApprove,
  onReject,
  onSelectRun,
  onNewRun,
  onSettingsBack,
  onBillingBack,
}: {
  view: WorkspaceView;
  runs: RecentRun[];
  onSubmit: (prompt: string, selection: ComposerSelection) => Promise<void>;
  onApprove: () => void;
  onReject: () => void;
  onSelectRun: (id: string) => void;
  onNewRun: () => void;
  onSettingsBack: () => void;
  onBillingBack: () => void;
}) {
  return (
    <main className="flex-1 h-full bg-background overflow-y-auto min-w-0 flex flex-col">
      {view.kind === "composer" && (
        <div className="flex-1 flex items-center justify-center px-4 md:px-8">
          <NewRunComposer onSubmit={onSubmit} />
        </div>
      )}

      {view.kind === "thread" && (
        <>
          <div className="flex-1 overflow-y-auto">
            <RunThread
              key={view.threadKey}
              thread={view.thread}
              onApprove={onApprove}
              onReject={onReject}
            />
          </div>
          <ThreadComposer onNewRun={onNewRun} />
        </>
      )}

      {view.kind === "runs" && (
        <div className="flex-1 overflow-y-auto">
          <RunsView runs={runs} onSelectRun={onSelectRun} />
        </div>
      )}

      {view.kind === "dashboard" && (
        <div className="flex-1 overflow-y-auto">
          <DashboardView runs={runs} onSelectRun={onSelectRun} onNewRun={onNewRun} />
        </div>
      )}

      {view.kind === "settings" && (
        <div className="flex-1 overflow-y-auto">
          <SettingsPage onBack={onSettingsBack} />
        </div>
      )}

      {view.kind === "billing" && (
        <div className="flex-1 overflow-y-auto">
          <BillingPage onBack={onBillingBack} />
        </div>
      )}
    </main>
  );
}

// =============================================================================
// APP SHELL CONTEXT
// =============================================================================

interface AppShellContextValue {
  sidebarCollapsed: boolean;
  runPanelCollapsed: boolean;
  toggleSidebar: () => void;
  toggleRunPanel: () => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useAppShell must be used within AppShell");
  return ctx;
}

// =============================================================================
// GNSIS WORKSPACE (main responsive shell)
// =============================================================================

function upsertJob(jobs: JobRecord[], updated: JobRecord): JobRecord[] {
  const idx = jobs.findIndex((j) => j.id === updated.id);
  if (idx === -1) return [updated, ...jobs];
  const next = jobs.slice();
  next[idx] = updated;
  return next;
}

function GNSISWorkspacePreview() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [runPanelCollapsed, setRunPanelCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const [activeNav, setActiveNav] = useState<NavId>("new-run");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [view, setView] = useState<WorkspaceView>({ kind: "composer" });
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const runs = jobs.map(toRecentRun);

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);
  const toggleRunPanel = () => setRunPanelCollapsed((v) => !v);

  const refreshJobs = useCallback(async () => {
    if (!isApiConfigured()) return;
    try {
      setJobs(await listJobs());
    } catch {
      // transient network error — keep showing the last known list
    }
  }, []);

  // Background refresh of the run list (sidebar, runs, dashboard).
  useEffect(() => {
    refreshJobs();
    const t = setInterval(refreshJobs, 8000);
    return () => clearInterval(t);
  }, [refreshJobs]);

  const handleNavSelect = (id: NavId) => {
    setActiveNav(id);
    setActiveRunId(null);
    if (id === "new-run") setView({ kind: "composer" });
    else if (id === "runs") setView({ kind: "runs" });
    else if (id === "dashboard") setView({ kind: "dashboard" });
  };

  const handleRunSelect = (runId: string) => {
    setActiveRunId(runId);
    const job = jobs.find((j) => j.id === runId);
    if (!job) return;
    setView({
      kind: "thread",
      thread: { job, logs: [], diff: null, actionPending: null, actionError: null },
      threadKey: job.id,
    });
  };

  const handleComposerSubmit = async (prompt: string, selection: ComposerSelection) => {
    const job = await createJob({ repo: selection.repo, instruction: prompt, base_branch: selection.branch });
    setJobs((prev) => upsertJob(prev, job));
    setActiveRunId(job.id);
    setView({
      kind: "thread",
      thread: { job, logs: [], diff: null, actionPending: null, actionError: null },
      threadKey: job.id,
    });
  };

  const handleThreadChange = (updater: (t: ThreadState) => ThreadState) => {
    setView((prev) => {
      if (prev.kind !== "thread") return prev;
      return { ...prev, thread: updater(prev.thread) };
    });
  };

  // Poll the active thread's job for live status/logs/diff until it terminates.
  useEffect(() => {
    if (view.kind !== "thread") return;
    const jobId = view.thread.job.id;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const [job, logs, diff] = await Promise.all([getJob(jobId), getJobLogs(jobId), getJobDiff(jobId)]);
        if (cancelled) return;
        handleThreadChange((t) => (t.job.id === job.id ? { ...t, job, logs, diff: diff ?? t.diff } : t));
        setJobs((prev) => upsertJob(prev, job));
        if (isTerminalStatus(job.status) && timer) clearInterval(timer);
      } catch {
        // transient network error — keep polling
      }
    };

    poll();
    if (!isTerminalStatus(view.thread.job.status)) {
      timer = setInterval(poll, 2500);
    }
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind === "thread" ? view.threadKey : null]);

  const handleApproveJob = async () => {
    if (view.kind !== "thread") return;
    const jobId = view.thread.job.id;
    handleThreadChange((t) => ({ ...t, actionPending: "approve", actionError: null }));
    try {
      const job = await approveJob(jobId);
      handleThreadChange((t) => ({ ...t, job, actionPending: null }));
      setJobs((prev) => upsertJob(prev, job));
    } catch (err) {
      handleThreadChange((t) => ({
        ...t,
        actionPending: null,
        actionError: err instanceof ApiError ? err.message : "Failed to approve the run.",
      }));
    }
  };

  const handleRejectJob = async () => {
    if (view.kind !== "thread") return;
    const jobId = view.thread.job.id;
    handleThreadChange((t) => ({ ...t, actionPending: "reject", actionError: null }));
    try {
      const job = await rejectJob(jobId);
      handleThreadChange((t) => ({ ...t, job, actionPending: null }));
      setJobs((prev) => upsertJob(prev, job));
    } catch (err) {
      handleThreadChange((t) => ({
        ...t,
        actionPending: null,
        actionError: err instanceof ApiError ? err.message : "Failed to reject the run.",
      }));
    }
  };

  const handleNewRun = () => handleNavSelect("new-run");
  const handleSettings = () => { setView({ kind: "settings" }); setActiveRunId(null); };
  const handleBilling = () => { setView({ kind: "billing" }); setActiveRunId(null); };
  const handleSettingsBack = () => { setView({ kind: "composer" }); setActiveNav("new-run"); };
  const handleBillingBack = () => { setView({ kind: "composer" }); setActiveNav("new-run"); };

  // Escape to close overlays
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mobilePanelOpen) setMobilePanelOpen(false);
        else if (mobileSidebarOpen) setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobilePanelOpen, mobileSidebarOpen]);

  const showRightPanel = view.kind === "thread";

  return (
    <AppShellContext.Provider value={{ sidebarCollapsed, runPanelCollapsed, toggleSidebar, toggleRunPanel }}>
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans relative">
        {/* Desktop sidebar */}
        <div className="hidden md:block shrink-0 h-full z-20 transition-all duration-200 ease-in-out" style={{ width: sidebarCollapsed ? 68 : 250 }}>
          <SidebarRegion
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
            activeNav={activeNav}
            activeRunId={activeRunId}
            runs={runs}
            onNavSelect={handleNavSelect}
            onRunSelect={handleRunSelect}
            onSettings={handleSettings}
            onBilling={handleBilling}
          />
        </div>

        {/* Mobile sidebar backdrop */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setMobileSidebarOpen(false)} />
        )}

        {/* Mobile sidebar drawer */}
        <div className={cn("md:hidden fixed inset-y-0 left-0 z-40 w-[260px] h-full transition-transform duration-200 ease-in-out", mobileSidebarOpen ? "translate-x-0" : "-translate-x-full")}>
          <div className="h-full bg-neutral-50 shadow-xl">
            <SidebarRegion
              collapsed={false}
              onToggle={() => setMobileSidebarOpen(false)}
              activeNav={activeNav}
              activeRunId={activeRunId}
              runs={runs}
              onNavSelect={(id) => { handleNavSelect(id); setMobileSidebarOpen(false); }}
              onRunSelect={(id) => { handleRunSelect(id); setMobileSidebarOpen(false); }}
              onSettings={() => { handleSettings(); setMobileSidebarOpen(false); }}
              onBilling={() => { handleBilling(); setMobileSidebarOpen(false); }}
            />
          </div>
        </div>

        {/* Desktop divider */}
        <div className="hidden md:block">
          <Divider orientation="vertical" />
        </div>

        {/* Mobile top bar */}
        <div className="md:hidden absolute top-0 left-0 right-0 h-12 z-10 bg-background/90 backdrop-blur-sm border-b border-border flex items-center px-3 gap-2">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center justify-center h-5 w-5 rounded bg-neutral-900 text-white shrink-0">
              <Terminal className="h-3 w-3" />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground truncate">
              GNSIS
            </span>
          </div>
          {view.kind === "thread" && (
            <button
              type="button"
              onClick={() => setMobilePanelOpen(true)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Open activity panel"
            >
              <ActivityGlyph className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Main workspace */}
        <div className="flex-1 min-w-0 h-full pt-12 md:pt-0">
          <WorkspaceRegion
            view={view}
            runs={runs}
            onSubmit={handleComposerSubmit}
            onApprove={handleApproveJob}
            onReject={handleRejectJob}
            onSelectRun={handleRunSelect}
            onNewRun={handleNewRun}
            onSettingsBack={handleSettingsBack}
            onBillingBack={handleBillingBack}
          />
        </div>

        {/* Desktop right panel */}
        {showRightPanel && (
          <>
            <div className="hidden md:block">
              <Divider orientation="vertical" />
            </div>
            <div className="hidden md:block shrink-0 h-full z-20 transition-all duration-200 ease-in-out" style={{ width: runPanelCollapsed ? 48 : 400 }}>
              <RunPanelRegion collapsed={runPanelCollapsed} onToggle={toggleRunPanel} view={view} />
            </div>
          </>
        )}

        {/* Mobile bottom sheet */}
        {mobilePanelOpen && view.kind === "thread" && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setMobilePanelOpen(false)} />
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-50 rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-center py-2">
                <div className="h-1 w-8 rounded-full bg-neutral-300" />
              </div>
              <div className="flex items-center justify-between px-4 pb-2">
                <span className="text-xs font-semibold text-foreground">Activity</span>
                <button
                  type="button"
                  onClick={() => setMobilePanelOpen(false)}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label="Close activity panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Divider orientation="horizontal" />
              <div className="flex-1 overflow-y-auto pb-safe">
                <ActivityPanel thread={view.thread} />
              </div>
            </div>
          </>
        )}
      </div>
    </AppShellContext.Provider>
  );
}

export default GNSISWorkspacePreview;
