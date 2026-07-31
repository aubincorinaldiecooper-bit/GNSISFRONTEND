import React, {
  useState,
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Terminal,
  ListChecks,
  LayoutGrid,
  FlaskConical,
  CirclePlus,
  Settings2,
  CreditCard,
  LogOut,
  ChevronsUpDown,
  FolderGit,
  GitBranch,
  Cpu,
  Send,
  Reply,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  CircleCheck,
  CircleX,
  Circle,
  ExternalLink,
  AlertTriangle,
  Clock,
  Activity as ActivityGlyph,
  Menu,
  X,
  Brain,
} from "lucide-react";
import { useNavigate, useLocation, matchPath } from "react-router";
import SettingsPage from "@/pages/SettingsPage";
import BillingPage from "@/pages/BillingPage";
import IntegrationTestPage from "@/pages/IntegrationTestPage";
import GitHubOnboardingPage from "@/pages/GitHubOnboardingPage";
import IntelligencePage from "@/pages/IntelligencePage";
import { useSession } from "@/lib/session";
import { githubAppSlug, integrationLabEnabled, publicBetaMode } from "@/lib/env";
import {
  createJob,
  listJobs,
  listRepositories,
  listBranches,
  listModels,
  getJob,
  getJobLogs,
  getJobDiff,
  getRunReceipt,
  getRunEventsSince,
  getAllRunEvents,
  getJobThread,
  followUpJob,
  cancelJob,
  isApiConfigured,
  ApiError,
  isTerminalStatus,
  getBalances,
  queryRepositoryIntelligence,
  getRunIntelligenceProposals,
  approveRun,
  publishRun,
  rejectRun,
  type JobRecord,
  type JobStatus,
  type LogRecord,
  type DiffRecord,
  type RunReceipt,
  type RunEvent,
  type RepositoryRecord,
  type ModelInfo,
  type Balances,
  type IntelligencePreview,
  type IntelligenceProposal,
  type IntelligenceApprovalSelection,
} from "@/lib/api";
import {
  threadTitle,
  relativeTime,
  fullDateTime,
  groupJobsIntoThreadRows,
  getAttemptSummary,
  collapsibleAttemptIds,
  summarizeCollapsedAttempts,
  type RecentRun,
} from "@/lib/threads";
import {
  getRunLifecycleState,
  isReceiptEligibleStatus,
  LIFECYCLE_FILTER_OPTIONS,
  LIFECYCLE_STAGE_LABELS,
  type LifecycleStageId,
} from "@/lib/runLifecycle";
import { getReceiptSections } from "@/lib/receiptSections";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { RunActivityTimeline, AttemptActivityStrip, type ReceiptActivityState } from "@/components/RunActivityTimeline";
import { isFailureEvent, mergeRunEvents } from "@/lib/timelineEvents";
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
import {
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatSystemMessage,
} from "@astryxdesign/core/Chat";
import { Avatar } from "@astryxdesign/core/Avatar";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { Section } from "@astryxdesign/core/Section";
import { useResizable, ResizeHandle } from "@astryxdesign/core/Resizable";

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

type NavId = "new-run" | "runs" | "intelligence" | "dashboard" | "integration-test";
type RouteViewKind = NavId | "settings" | "billing" | "run" | "github-onboarding";

// Text color per lifecycle stage — the label text is always the primary
// signal (never color alone); "Ready for review" and "Approved" deliberately
// share amber since they're distinguished by wording, not hue.
const lifecycleStageCls: Record<LifecycleStageId, string> = {
  queued: "text-muted-foreground",
  working: "text-blue-600",
  ready_for_review: "text-amber-600",
  approved: "text-amber-600",
  published: "text-emerald-600",
  attempt_stopped: "text-red-600",
  publication_failed: "text-red-600",
  rejected: "text-muted-foreground",
  cancelled: "text-muted-foreground",
};

function StatusLabel({ stage, qualifier }: { stage: LifecycleStageId; qualifier?: string | null }) {
  return (
    <span className={cn("font-medium", lifecycleStageCls[stage])}>
      {LIFECYCLE_STAGE_LABELS[stage]}
      {qualifier && <span className="font-normal text-muted-foreground"> · {qualifier}</span>}
    </span>
  );
}

// Legacy jobs created before model selection carry no model — never invent one.
function displayModel(job: JobRecord): string {
  return job.model ?? "—";
}

// Historical and primary-only jobs may have no Advisor pinned — never invent one.
function displayAdvisorModel(job: JobRecord): string {
  return job.advisor_model ?? "—";
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

const sidebarStatusIcon: Record<LifecycleStageId, React.ReactNode> = {
  queued: <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 self-start mt-0.5" />,
  working: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin motion-reduce:animate-none shrink-0 self-start mt-0.5" />,
  ready_for_review: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 self-start mt-0.5" />,
  approved: <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0 self-start mt-0.5" />,
  published: <CircleCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0 self-start mt-0.5" />,
  rejected: <CircleX className="h-3.5 w-3.5 text-muted-foreground shrink-0 self-start mt-0.5" />,
  attempt_stopped: <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 self-start mt-0.5" />,
  publication_failed: <CircleX className="h-3.5 w-3.5 text-red-500 shrink-0 self-start mt-0.5" />,
  cancelled: <CircleX className="h-3.5 w-3.5 text-muted-foreground shrink-0 self-start mt-0.5" />,
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
              aria-label={`${run.title} \u2014 ${LIFECYCLE_STAGE_LABELS[run.status]}`}
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
        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate leading-tight">
          <span className={cn("font-medium", lifecycleStageCls[run.status])}>{LIFECYCLE_STAGE_LABELS[run.status]}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="truncate">{timeAgo(run.updatedAt)}</span>
        </span>
      </span>
    </button>
  );
}

// =============================================================================
// USAGE METER (backend does not track cost/usage yet — shown as unavailable)
// =============================================================================

function UsageMeter({ available }: { available: string | null }) {
  return (
    <div className="px-3 pb-2.5 pt-3 space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Available balance
      </span>
      <p className="text-xs text-muted-foreground">
        {available !== null ? usd(available) : "—"}
      </p>
    </div>
  );
}

function CollapsedUsageIndicator() {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="px-4 pb-2.5 pt-3 flex justify-center cursor-pointer">
            <div className="h-1.5 w-9 rounded-full bg-muted overflow-hidden" />
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
  const { authUser, me, signOut } = useSession();

  const displayName = authUser?.name || authUser?.githubLogin || "Account";
  const workspaceName = me?.workspace?.name || "Personal workspace";
  const initial = (displayName.trim()[0] || "?").toUpperCase();

  const avatar = authUser?.image ? (
    <img
      src={authUser.image}
      alt=""
      className="h-6 w-6 shrink-0 rounded-full object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0">
      {initial}
    </div>
  );

  const trigger = (
    <button
      type="button"
      className={cn(
        "flex items-center h-12 px-3 shrink-0 w-full transition-colors duration-150 hover:bg-black/[0.03]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        collapsed && "justify-center px-0"
      )}
    >
      {avatar}
      {!collapsed && (
        <>
          <span className="ml-2 min-w-0 flex-1 text-left">
            <span className="block text-xs font-semibold text-foreground truncate">
              {displayName}
            </span>
            <span className="block text-[11px] text-muted-foreground truncate">
              {workspaceName}
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
                {displayName} · {workspaceName}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          trigger
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        {authUser?.email && (
          <>
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{authUser.email}</p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={onSettings}>
          <Settings2 className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        {!publicBetaMode() && <DropdownMenuItem onClick={onBilling}>
          <CreditCard className="h-4 w-4" />Billing
        </DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
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
  available: string | null;
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
  available,
  onNavSelect,
  onRunSelect,
  onSettings,
  onBilling,
  children,
}: SidebarRegionProps) {
  const navItems: Array<{ id: NavId; label: string; icon: React.ReactNode }> = [
    { id: "new-run", label: "New run", icon: <CirclePlus /> },
    { id: "runs", label: "Runs", icon: <ListChecks /> },
    ...(publicBetaMode() ? [{ id: "intelligence" as NavId, label: "Intelligence", icon: <Brain /> }] : [{ id: "dashboard" as NavId, label: "Dashboard", icon: <LayoutGrid /> }]),
    ...(!publicBetaMode() && integrationLabEnabled()
      ? [{ id: "integration-test" as NavId, label: "Integration test", icon: <FlaskConical /> }]
      : []),
  ];

  return (
    <aside
      style={{ width: collapsed ? 68 : 250 }}
      className={cn(
        "relative flex flex-col h-full shrink-0 bg-muted",
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
      {!publicBetaMode() && <>{collapsed ? <CollapsedUsageIndicator /> : <UsageMeter available={available} />}<Divider orientation="horizontal" /></>}

      {/* Account — fixed */}
      <AccountRow collapsed={collapsed} onSettings={onSettings} onBilling={onBilling} />
    </aside>
  );
}


// =============================================================================
// NEW RUN COMPOSER — repository / branch / model, sourced entirely from the
// backend (enabled repos, that repo's real branches, the server model
// allowlist). No free-text repo/branch entry, no executor/harness choice.
// =============================================================================

interface ComposerSelection {
  repositoryId: string;
  repositoryFullName: string;
  branch: string;
  model: string;
  advisorModel: string | null;
}

interface NewRunComposerProps {
  onSubmit: (prompt: string, selection: ComposerSelection) => Promise<void>;
}

function NewRunComposer({ onSubmit }: NewRunComposerProps) {
  const [prompt, setPrompt] = useState("");

  const [repos, setRepos] = useState<RepositoryRecord[] | null>(null);
  const [reposError, setReposError] = useState(false);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);

  const [branches, setBranches] = useState<string[] | null>(null);
  const [branchesError, setBranchesError] = useState(false);
  const [branch, setBranch] = useState<string | null>(null);

  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [modelsError, setModelsError] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const [advisorModel, setAdvisorModel] = useState<string | null>(null);
  const [showAdvisor, setShowAdvisor] = useState(false);

  const [showMobileConfig, setShowMobileConfig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<IntelligencePreview[] | null>(null);
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [previewFor, setPreviewFor] = useState<{ repo: string; prompt: string } | null>(null);
  const previewRequest = useRef(0);

  // Repositories currently accessible through GitHub App access — the New
  // Run source of truth. There is no in-GNSIS enable step: what the App can
  // reach is what the user can run against.
  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;
    listRepositories()
      .then((list) => {
        if (cancelled) return;
        setRepos(list);
        // Preserve an already-selected repo across a background refresh;
        // otherwise default to the first (most-recently-listed) one.
        setRepositoryId((current) =>
          current && list.some((r) => r.id === current) ? current : (list[0]?.id ?? null),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setRepos([]);
          setReposError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The server-controlled model catalog.
  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;
    listModels()
      .then(({ items }) => {
        if (cancelled) return;
        setModels(items);
        setModel((current) =>
          current && items.some((m) => m.id === current)
            ? current
            : (items.find((m) => m.default)?.id ?? items[0]?.id ?? null),
        );
        setAdvisorModel((current) =>
          current && items.some((m) => m.id === current) ? current : null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setModels([]);
          setModelsError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A branch from the previous repository must never remain selected. Reset
  // synchronously during render (React's documented pattern for adjusting
  // state when a prop/state value changes) rather than in the effect below,
  // so the stale branch never paints even for one frame.
  const [branchesResetKey, setBranchesResetKey] = useState(repositoryId);
  if (repositoryId !== branchesResetKey) {
    setBranchesResetKey(repositoryId);
    setBranch(null);
    setBranches(null);
    setBranchesError(false);
  }

  // Branches reload whenever the selected repository changes.
  useEffect(() => {
    if (!repositoryId) return;
    let cancelled = false;
    listBranches(repositoryId)
      .then(({ default_branch, branches: list }) => {
        if (cancelled) return;
        setBranches(list.map((b) => b.name));
        setBranch(default_branch);
      })
      .catch(() => {
        if (!cancelled) setBranchesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [repositoryId]);

  // Derived, like the repos/models loading states above, rather than a
  // separate effect-driven flag: "loading" iff a repo is selected but its
  // branch list hasn't arrived (or failed) yet.
  const branchesLoading = repositoryId !== null && branches === null && !branchesError;

  useEffect(() => {
    if (!publicBetaMode() || !repositoryId || prompt.trim().length < 12) {
      return;
    }
    const requestId = ++previewRequest.current;
    const trimmedPrompt = prompt.trim();
    const timer = setTimeout(() => {
      setPreviewState("loading");
      void queryRepositoryIntelligence(repositoryId, trimmedPrompt, 5).then(
        (result) => { if (previewRequest.current === requestId) { setPreviewFor({ repo: repositoryId, prompt: trimmedPrompt }); setPreview(result.data); setPreviewState("loaded"); } },
        () => { if (previewRequest.current === requestId) { setPreviewFor(null); setPreview(null); setPreviewState("error"); } },
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [repositoryId, prompt]);

  const selectedRepo = repos?.find((r) => r.id === repositoryId) ?? null;

  const repoOptions: ComboboxOption[] = (repos ?? []).map((r) => ({
    value: r.id,
    label: r.full_name,
    keywords: [r.owner, r.name],
    hint: r.private ? "Private" : undefined,
  }));

  const branchOptions: ComboboxOption[] = (branches ?? []).map((b) => ({
    value: b,
    label: b,
  }));

  const modelOptions: ComboboxOption[] = (models ?? []).map((m) => ({
    value: m.id,
    label: m.label,
    keywords: [m.provider],
  }));

  const canSubmit =
    prompt.trim().length > 0 &&
    !!repositoryId &&
    !!branch &&
    !!model &&
    !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedRepo || !branch || !model) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(prompt.trim(), {
        repositoryId: selectedRepo.id,
        repositoryFullName: selectedRepo.full_name,
        branch,
        model,
        advisorModel: !publicBetaMode() && showAdvisor ? advisorModel : null,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start the run.");
      setIsSubmitting(false);
    }
  }, [canSubmit, selectedRepo, branch, model, showAdvisor, advisorModel, prompt, onSubmit]);

  const noReposAvailable = repos !== null && repos.length === 0 && !reposError;
  const selectedModelLabel = models?.find((m) => m.id === model)?.label ?? model ?? "";
  const selectedAdvisorLabel = models?.find((m) => m.id === advisorModel)?.label ?? advisorModel ?? "";

  const handleRemoveAdvisor = () => {
    setShowAdvisor(false);
    setAdvisorModel(null);
  };
  const slug = githubAppSlug();
  const manageAccessLink = slug ? `https://github.com/apps/${slug}/installations/new` : null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 pb-4 md:pb-0">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          What should GNSIS work on?
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Choose your repository, describe the task, and start the run.
        </p>
      </div>

      {noReposAvailable ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No repositories are available.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Grant GNSIS access to a repository through GitHub to start your first run.
          </p>
          {manageAccessLink && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="mt-4 h-8 gap-1.5 text-xs"
            >
              <a href={manageAccessLink} target="_blank" rel="noreferrer">
                Manage GitHub access
              </a>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          {/*
            The card is deliberately overflow-VISIBLE so the non-portal Combobox
            dropdowns can extend past the card's bottom edge. Rounded corners are
            preserved on the static top (textarea) and, on mobile, the config
            sheet — never with overflow-hidden on an ancestor of an open dropdown.
          */}
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the change you want GNSIS to make…"
            className="min-h-28 resize-none border-none shadow-none rounded-t-2xl rounded-b-none px-4 py-3.5 text-sm focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          {publicBetaMode() && prompt.trim().length >= 12 && (() => {
            const fresh = previewFor?.repo === repositoryId && previewFor?.prompt === prompt.trim();
            const shownPreview = fresh ? preview : null;
            const shownState: "idle" | "loading" | "loaded" | "error" = fresh ? previewState : (previewState === "error" ? "error" : "loading");
            return <div className="border-t px-4 py-3 text-xs" aria-live="polite">
              <p className="font-semibold">Repository intelligence</p>
              <p className="mt-0.5 text-muted-foreground">{shownState === "loading" ? "Checking approved intelligence…" : shownState === "error" ? "Intelligence preview is temporarily unavailable." : shownState === "loaded" && shownPreview?.length ? `${shownPreview.length} approved insight${shownPreview.length === 1 ? " is" : "s are"} relevant to this task.` : shownState === "loaded" ? "No approved intelligence is relevant yet." : "The backend selects intelligence authoritatively when the run starts."}</p>
              {!!shownPreview?.length && <details className="mt-1"><summary className="cursor-pointer">Preview candidates</summary><ul className="mt-2 space-y-2">{shownPreview.map((item) => <li key={item.memory_id}><p>{item.content}</p><p className="text-muted-foreground">{item.kind}</p></li>)}</ul></details>}
            </div>;
          })()}

          <Divider orientation="horizontal" />

          {/* Desktop / tablet configuration (md and up) */}
          <div className="hidden md:flex md:flex-col gap-2 px-3 py-3">
            {/*
              Responsive control grid. Below lg the fields stack into a
              two-column layout (Repository full-width, Branch + Model paired,
              Start run on its own row) so nothing compresses; at lg they line
              up as Repository (widest) · Branch · Model · Start run.
            */}
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(7.5rem,0.7fr)_minmax(10rem,1fr)_auto] lg:items-center">
              <div className="col-span-2 lg:col-span-1 min-w-0">
                <Combobox
                  ariaLabel="Repository"
                  icon={<FolderGit className="h-3.5 w-3.5" />}
                  options={repoOptions}
                  value={repositoryId}
                  onChange={setRepositoryId}
                  placeholder="Select repository"
                  searchPlaceholder="Search repositories…"
                  emptyText="No matching repositories."
                  className="h-9 rounded-lg bg-card px-2.5 text-xs font-mono"
                />
              </div>
              <div className="min-w-0">
                <Combobox
                  ariaLabel="Branch"
                  icon={<GitBranch className="h-3.5 w-3.5" />}
                  options={branchOptions}
                  value={branch}
                  onChange={setBranch}
                  placeholder={branchesLoading ? "Loading…" : "Select branch"}
                  searchPlaceholder="Search branches…"
                  emptyText={branchesError ? "Could not load branches." : "No branches found."}
                  loading={branchesLoading}
                  disabled={!repositoryId}
                  className="h-9 rounded-lg bg-card px-2.5 text-xs font-mono"
                />
              </div>
              <div className="min-w-0">
                <Combobox
                  ariaLabel="Model"
                  icon={<Cpu className="h-3.5 w-3.5" />}
                  options={modelOptions}
                  value={model}
                  onChange={setModel}
                  placeholder={modelsError ? "No models available" : "Select model"}
                  searchPlaceholder="Search models…"
                  emptyText="No matching models."
                  disabled={(models ?? []).length === 0}
                  className="h-9 rounded-lg bg-card px-2.5 text-xs"
                />
              </div>
              <div className="col-span-2 lg:col-span-1 flex justify-end">
                <Button
                  size="sm"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                  className="h-9 shrink-0 gap-1.5 rounded-lg px-4"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Start run
                </Button>
              </div>
            </div>

            {/* Advisor — optional, its own row so it never crowds the core flow */}
            {!publicBetaMode() && <div className="flex items-center gap-2 min-w-0">
              {showAdvisor ? (
                <>
                  <span className="shrink-0 text-xs text-muted-foreground">Advisor</span>
                  <div className="min-w-0 w-full max-w-xs">
                    <Combobox
                      ariaLabel="Advisor"
                      icon={<Circle className="h-3.5 w-3.5" />}
                      options={modelOptions}
                      value={advisorModel}
                      onChange={setAdvisorModel}
                      placeholder={modelsError ? "No models available" : "Select Advisor"}
                      searchPlaceholder="Search Advisor models…"
                      emptyText="No matching models."
                      disabled={(models ?? []).length === 0}
                      className="h-9 rounded-lg bg-card px-2.5 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove Advisor"
                    onClick={handleRemoveAdvisor}
                    className="h-8 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvisor(true)}
                  className="h-8 -ml-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  + Add Advisor
                </Button>
              )}
            </div>}
          </div>

          {/* Mobile bottom bar */}
          <div className="flex md:hidden items-center justify-between gap-2 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setShowMobileConfig((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left min-w-0 truncate"
            >
              <span className="font-mono">{selectedRepo?.full_name ?? "Select repository"}</span>
              {branch ? ` · ${branch}` : ""}
              {selectedModelLabel ? ` · ${selectedModelLabel}` : ""}
              {showAdvisor && selectedAdvisorLabel ? ` · Advisor: ${selectedAdvisorLabel}` : ""}
            </button>
            <Button
              size="sm"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="h-9 shrink-0 gap-1.5 rounded-lg px-4"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span className="text-sm">Start</span>
            </Button>
          </div>

          {/* Mobile config sheet — rounded-b so the card's bottom corners stay clean */}
          {showMobileConfig && (
            <div className="md:hidden rounded-b-2xl border-t border-border px-3 py-2.5 space-y-2 bg-muted/50">
              <Combobox
                ariaLabel="Repository"
                icon={<FolderGit className="h-3.5 w-3.5" />}
                options={repoOptions}
                value={repositoryId}
                onChange={setRepositoryId}
                placeholder="Select repository"
                searchPlaceholder="Search repositories…"
                emptyText="No matching repositories."
                className="h-9 rounded-lg bg-card px-2.5 text-xs font-mono"
              />
              <Combobox
                ariaLabel="Branch"
                icon={<GitBranch className="h-3.5 w-3.5" />}
                options={branchOptions}
                value={branch}
                onChange={setBranch}
                placeholder={branchesLoading ? "Loading branches…" : "Select branch"}
                searchPlaceholder="Search branches…"
                emptyText={branchesError ? "Could not load branches." : "No branches found."}
                loading={branchesLoading}
                disabled={!repositoryId}
                className="h-9 rounded-lg bg-card px-2.5 text-xs font-mono"
              />
              <Combobox
                ariaLabel="Model"
                icon={<Cpu className="h-3.5 w-3.5" />}
                options={modelOptions}
                value={model}
                onChange={setModel}
                placeholder={modelsError ? "No models available" : "Select model"}
                searchPlaceholder="Search models…"
                emptyText="No matching models."
                disabled={(models ?? []).length === 0}
                className="h-9 rounded-lg bg-card px-2.5 text-xs"
              />
              {!publicBetaMode() && (showAdvisor ? (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <Combobox
                      ariaLabel="Advisor"
                      icon={<Circle className="h-3.5 w-3.5" />}
                      options={modelOptions}
                      value={advisorModel}
                      onChange={setAdvisorModel}
                      placeholder={modelsError ? "No models available" : "Select Advisor"}
                      searchPlaceholder="Search Advisor models…"
                      emptyText="No matching models."
                      disabled={(models ?? []).length === 0}
                      className="h-9 rounded-lg bg-card px-2.5 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove Advisor"
                    onClick={handleRemoveAdvisor}
                    className="h-9 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvisor(true)}
                  className="h-9 w-full justify-start text-xs"
                >
                  + Add Advisor
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-center text-xs text-red-600">{error}</p>
      )}
      {reposError && (
        <p className="mt-2 text-center text-xs text-red-600">
          Could not load your repositories. Try refreshing.
        </p>
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
// One immutable execution within a conversation: its job, live logs, and
// proposed diff.
interface RunState {
  job: JobRecord;
  logs: LogRecord[];
  diff: DiffRecord | null;
  events: RunEvent[];
  eventsLoading: boolean;
  eventsReconnecting: boolean;
}

// A conversation thread: an ordered list of linked runs (oldest first). The runs
// are never mutated in place — each submitted message appends a new run. The
// follow-up composer keeps its own text/submitting/error state locally so live
// polling of the runs never disturbs what the user is typing.
interface ThreadState {
  threadId: string;
  runs: RunState[];
  // Whether a tip Retry / Run-again is in flight (drives its button spinner).
  retryPending: boolean;
}

// The run whose live activity / receipt the side panel reflects: the tip of the
// conversation (the most recent execution).
function activeRun(thread: ThreadState): RunState {
  return thread.runs[thread.runs.length - 1];
}


// =============================================================================
// THREAD SUB-COMPONENTS
// =============================================================================

// A quiet, self-contained copy action. Independent per instance, keyboard- and
// touch-operable, shows a checkmark + "Copied" on success and a brief failure
// hint if the clipboard is unavailable. Never throws.
function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  /** Accessible name, e.g. "Copy instruction". */
  label: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onCopy = async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("clipboard unavailable");
      }
      setState("copied");
    } catch {
      setState("error");
    }
    timer.current = setTimeout(() => setState("idle"), 1600);
  };

  const title = state === "copied" ? "Copied" : state === "error" ? "Copy failed" : label;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onCopy}
            aria-label={label}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors",
              "text-muted-foreground/70 hover:text-foreground hover:bg-black/[0.04]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              className
            )}
          >
            {state === "copied" ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className={cn(state === "copied" ? "text-emerald-600" : state === "error" && "text-red-500")}>
              {state === "copied" ? "Copied" : state === "error" ? "Copy failed" : "Copy"}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Quiet metadata row under a message: a copy action and a relative timestamp
// (with the full localized datetime on hover).
function MessageMeta({
  copyText,
  copyLabel,
  timestamp,
}: {
  copyText: string;
  copyLabel: string;
  timestamp: string;
}) {
  return (
    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground/60">
      <CopyButton text={copyText} label={copyLabel} />
      {timestamp && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default">{relativeTime(timestamp)}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {fullDateTime(timestamp)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// The conversation header: a deterministic title derived from the first
// instruction (never a model call, never a raw job id) plus quiet context —
// repository, primary model, and the optional Advisor.
function ThreadHeader({ thread }: { thread: ThreadState }) {
  const first = thread.runs[0].job;
  // A single-run thread has exactly one model, worth stating up front. Once a
  // thread has more than one attempt, each may have its own model (the
  // follow-up composer lets a later attempt pick a different one) — showing
  // just the first run's model here would misleadingly imply one model covers
  // the whole thread, so per-attempt model instead shows on each attempt via
  // AttemptSummaryLine below.
  const singleAttempt = thread.runs.length === 1;
  return (
    <div className="border-b border-border pb-4 mb-4">
      <h1 className="text-lg font-semibold text-foreground leading-snug">
        {threadTitle(first.instruction)}
      </h1>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground/80">
        <span className="font-mono">{first.repo}</span>
        {singleAttempt && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span>Model: {displayModel(first)}</span>
          </>
        )}
        {displayAdvisorModel(first) !== "—" && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span>Advisor: {displayAdvisorModel(first)}</span>
          </>
        )}
      </div>
    </div>
  );
}

// One submitted instruction, rendered as a message with a quiet metadata row
// (copy + relative timestamp). Readable width, preserved line breaks.
function InstructionMessage({ job }: { job: JobRecord }) {
  return (
    <ChatMessage sender="user">
      <ChatMessageBubble
        metadata={<MessageMeta copyText={job.instruction} copyLabel="Copy instruction" timestamp={job.created_at} />}
      >
        <p className="whitespace-pre-wrap break-words">{job.instruction}</p>
      </ChatMessageBubble>
    </ChatMessage>
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPatch((v) => !v)}
            className="text-xs font-medium text-foreground underline underline-offset-2 hover:text-foreground/80"
          >
            {showPatch ? "Hide patch" : "View patch"}
          </button>
          <CopyButton text={diff.patch} label="Copy patch" />
        </div>
      )}
      {showPatch && diff.patch && (
        <CodeBlock
          language="diff"
          code={diff.patch}
          width="100%"
          maxHeight={256}
          isCollapsible
          collapsibleThreshold={1}
        />
      )}
    </div>
  );
}


function BetaRunReview({
  job,
  diff,
  onStatusChange,
  disabled = false,
  onPendingChange,
}: {
  job: JobRecord;
  diff: DiffRecord | null;
  onStatusChange: (runId: string, status: JobStatus) => void;
  // True while a different mutually-exclusive run action (e.g. Cancel) is
  // in flight, so approve/publish can't race it.
  disabled?: boolean;
  // Reports this component's own pending state up so a sibling action
  // (Cancel) can disable itself while approve/publish is in flight.
  onPendingChange?: (pending: boolean) => void;
}) {
  const [proposals, setProposals] = useState<IntelligenceProposal[]>([]);
  const [choices, setChoices] = useState<Record<string, { selected: boolean; content: string }>>({});
  const [proposalState, setProposalState] = useState<"loading" | "loaded" | "error">(job.status === "awaiting_approval" ? "loading" : "loaded");
  const [proposalAttempt, setProposalAttempt] = useState(0);
  const [pending, setPendingState] = useState<"approve" | "reject" | "publish" | null>(null);
  const setPending = (value: "approve" | "reject" | "publish" | null) => {
    setPendingState(value);
    onPendingChange?.(value !== null);
  };
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (job.status !== "awaiting_approval") return;
    let cancelled = false;
    void getRunIntelligenceProposals(job.id).then((result) => {
      if (cancelled) return;
      setProposals(result.data);
      setChoices(Object.fromEntries(result.data.map((item) => [item.id, { selected: true, content: item.content }])));
      setProposalState("loaded");
    }, () => { if (!cancelled) { setError("Proposed intelligence could not be loaded."); setProposalState("error"); } });
    return () => { cancelled = true; };
  }, [job.id, job.status, proposalAttempt]);

  const approve = async () => {
    if (proposalState !== "loaded") return;
    setPending("approve"); setError(null);
    const intelligence: IntelligenceApprovalSelection[] = proposals.map((item) => ({ proposal_id: item.id, selected: choices[item.id]?.selected ?? false, ...(choices[item.id]?.selected && choices[item.id]?.content !== item.content ? { content: choices[item.id].content } : {}) }));
    try {
      const response = await approveRun(job.id, intelligence);
      onStatusChange(response.id, response.status);
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Approval failed."); } finally { setPending(null); }
  };
  const publish = async () => { setPending("publish"); setError(null); try { const response = await publishRun(job.id); onStatusChange(response.id, response.status); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Publishing failed. The approval remains recorded."); } finally { setPending(null); } };
  const reject = async () => { setPending("reject"); setError(null); try { const response = await rejectRun(job.id); onStatusChange(response.id, response.status); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Rejection failed."); } finally { setPending(null); } };

  const diffBlock = <div className="mt-3 rounded-xl border p-4 space-y-3">
    <p className="text-sm font-semibold">Proposed changes</p>
    {diff ? <DiffSummary diff={diff} /> : <p className="text-xs text-muted-foreground">Loading the proposed diff…</p>}
  </div>;

  if (job.status === "approved") return <>
    {diffBlock}
    <div className="mt-3 rounded-xl border p-4"><p className="text-sm font-semibold">Run approved</p><p className="mt-1 text-xs text-muted-foreground">Approved intelligence is recorded independently of publishing.</p>{error && <p className="mt-2 text-xs text-red-600">{error}</p>}<Button size="sm" className="mt-3" onClick={publish} disabled={pending !== null || disabled}>{pending === "publish" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Publish pull request</Button></div>
  </>;
  if (job.status !== "awaiting_approval") return null;
  return <>
    {diffBlock}
    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
      <h3 className="text-sm font-semibold">Proposed intelligence</h3>
      <p className="mt-1 text-xs text-muted-foreground">Nothing becomes approved intelligence until you select it and approve the run.</p>
      {proposalState === "loading" ? <p className="mt-3 text-xs">Loading proposals…</p> : proposalState === "loaded" && proposals.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">No intelligence was proposed. You can still approve the run.</p> : proposalState === "loaded" ? <ul className="mt-3 space-y-3">{proposals.map((item) => <li key={item.id} className="flex items-start gap-2">
        <input aria-label={`Select proposal ${item.id}`} type="checkbox" checked={choices[item.id]?.selected ?? false} onChange={(event) => setChoices((current) => ({ ...current, [item.id]: { selected: event.target.checked, content: current[item.id]?.content ?? item.content } }))} />
        <div className="flex-1"><Textarea aria-label={`Edit proposal ${item.id}`} value={choices[item.id]?.content ?? item.content} disabled={!choices[item.id]?.selected} onChange={(event) => setChoices((current) => ({ ...current, [item.id]: { selected: current[item.id]?.selected ?? true, content: event.target.value } }))} className="min-h-16 text-xs" /><p className="mt-1 text-xs text-muted-foreground">{item.kind}</p></div>
      </li>)}</ul> : null}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {proposalState === "error" && <Button size="sm" variant="outline" className="mt-3" onClick={() => { setError(null); setProposalState("loading"); setProposalAttempt((value) => value + 1); }}>Retry</Button>}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={approve} disabled={pending !== null || proposalState !== "loaded" || disabled}>{pending === "approve" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Approve run</Button>
        <Button size="sm" variant="outline" onClick={reject} disabled={pending !== null || disabled}>{pending === "reject" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Reject</Button>
      </div>
    </div>
  </>;
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

// The first line of the error is a concise, human summary; the rest (stack /
// provider payload) is technical detail kept out of the way behind a toggle.
function splitError(error: string | null): { summary: string; details: string | null } {
  const raw = (error || "").trim();
  if (!raw) return { summary: "The attempt stopped before it could finish.", details: null };
  const nl = raw.indexOf("\n");
  if (nl === -1) return { summary: raw, details: null };
  return { summary: raw.slice(0, nl).trim(), details: raw.slice(nl + 1).trim() || null };
}

function FailedMessage({ job }: { job: JobRecord }) {
  const { summary, details } = splitError(job.error);
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div className="py-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <CircleX className="h-4 w-4 text-red-500 shrink-0" />
        <p className="text-sm font-semibold text-red-600">Attempt stopped</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-6 break-words">{summary}</p>
      {details && (
        <div className="pl-6">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {showDetails ? "Hide technical details" : "Show technical details"}
          </button>
          {showDetails && (
            <div className="mt-2">
              <CodeBlock language="plaintext" code={details} width="100%" maxHeight={224} isWrapped />
            </div>
          )}
        </div>
      )}
      <div className="pl-6">
        <CopyButton text={job.error || summary} label="Copy error" />
      </div>
    </div>
  );
}

// Shared neutral-terminal-state message: rejected and cancelled render
// identically apart from their heading/body text.
function TerminalMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <CircleX className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-6">{description}</p>
    </div>
  );
}

// Lets the user stop a run at any point before it reaches a terminal state.
// Self-contained (mirrors BetaRunReview): calls the API directly and reports
// the authoritative {id, status} response through the same centralized
// onStatusChange updater every other mutation uses.
function CancelRunControl({
  job,
  disabled = false,
  onPendingChange,
  onStatusChange,
}: {
  job: JobRecord;
  // True while a different mutually-exclusive run action (approve/reject/
  // publish) is in flight, so Cancel can't race it.
  disabled?: boolean;
  // Reports this component's own pending state up so a sibling action
  // (approve/reject/publish) can disable itself while cancellation runs.
  onPendingChange?: (pending: boolean) => void;
  onStatusChange: (runId: string, status: JobStatus) => void;
}) {
  const [pending, setPendingState] = useState(false);
  const setPending = (value: boolean) => {
    setPendingState(value);
    onPendingChange?.(value);
  };
  const [error, setError] = useState<string | null>(null);

  if (isTerminalStatus(job.status)) return null;

  const cancel = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await cancelJob(job.id);
      onStatusChange(result.id, result.status);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to cancel the run.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="pt-3 flex items-center gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        disabled={pending || disabled}
        onClick={cancel}
        className="h-8 gap-1.5 rounded-lg text-muted-foreground"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        Cancel run
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// =============================================================================
// RUN THREAD
// =============================================================================

// The execution beneath one instruction: its live status, approval gate, and
// terminal result.
function RunExecution({
  run,
  onStatusChange,
}: {
  run: RunState;
  onStatusChange: (runId: string, status: JobStatus) => void;
}) {
  const { job, diff, logs } = run;
  // Cancel and approve/reject/publish are mutually exclusive mutations on the
  // same run: each disables the other while it's in flight, so a user can't
  // fire both at once and race their responses (or hit an avoidable 409).
  const [cancelPending, setCancelPending] = useState(false);
  const [reviewPending, setReviewPending] = useState(false);
  return (
    <>
      <AttemptActivityStrip job={job} events={run.events} isTerminal={isTerminalStatus(job.status)} />

      <CancelRunControl
        job={job}
        disabled={reviewPending}
        onPendingChange={setCancelPending}
        onStatusChange={onStatusChange}
      />

      {(job.status === "awaiting_approval" || job.status === "approved") && (
        <BetaRunReview
          job={job}
          diff={diff}
          onStatusChange={onStatusChange}
          disabled={cancelPending}
          onPendingChange={setReviewPending}
        />
      )}

      {job.status === "completed" && <RunCompleteMessage job={job} diff={diff} logs={logs} />}
      {(job.status === "failed" || job.status === "blocked") && !run.events.some(isFailureEvent) && <FailedMessage job={job} />}
      {job.status === "rejected" && <TerminalMessage title="Run rejected" description="The proposed change was reviewed and rejected before publishing." />}
      {job.status === "cancelled" && <TerminalMessage title="Run cancelled" description="This run was cancelled before it finished." />}
    </>
  );
}

// Retry (failed) or Run-again (completed/rejected): a quiet action that queues a
// new linked run with the same instruction + config. Offered only on the
// conversation tip so the thread stays linear.
function RunActions({
  job,
  pending,
  onRetry,
}: {
  job: JobRecord;
  pending: boolean;
  onRetry: () => void;
}) {
  if (job.status !== "failed" && job.status !== "blocked" && job.status !== "completed" && job.status !== "rejected" && job.status !== "cancelled") return null;
  const retry = job.status === "failed" || job.status === "blocked" || job.status === "cancelled";
  return (
    <div className="mt-3">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={onRetry}
        className="h-8 gap-1.5 rounded-lg"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        {retry ? "Retry run" : "Run again"}
      </Button>
    </div>
  );
}

// One turn of the conversation: the submitted instruction and the execution it
// produced. Immutable — a new turn is appended for every follow-up.
// Shown above the instruction only when a task has more than one attempt —
// a single-attempt thread has nothing to disambiguate.
function AttemptSummaryLine({ job, attemptNumber }: { job: JobRecord; attemptNumber: number }) {
  const summary = getAttemptSummary(job, attemptNumber);
  return (
    <>
      Attempt {summary.attemptNumber} · <span className={cn("font-medium", lifecycleStageCls[summary.lifecycle.stage])}>{summary.lifecycle.label}</span>
      {summary.model !== "—" && <> · {summary.model}</>}
      {summary.elapsedLabel && <> · {summary.elapsedLabel}</>}
    </>
  );
}

function ConversationTurn({
  run,
  isTip,
  attemptNumber,
  totalAttempts,
  retryPending,
  onStatusChange,
  onRetry,
}: {
  run: RunState;
  isTip: boolean;
  attemptNumber: number;
  totalAttempts: number;
  retryPending: boolean;
  onStatusChange: (runId: string, status: JobStatus) => void;
  onRetry: () => void;
}) {
  return (
    <div className="border-b border-border pb-5 mb-5 last:border-b-0 last:mb-0 last:pb-1">
      {totalAttempts > 1 && (
        <ChatSystemMessage>
          <AttemptSummaryLine job={run.job} attemptNumber={attemptNumber} />
        </ChatSystemMessage>
      )}
      <InstructionMessage job={run.job} />
      <ChatMessage sender="assistant" avatar={<Avatar name="Genesis" size="md" />}>
        <ChatMessageBubble variant="ghost">
          <RunExecution run={run} onStatusChange={onStatusChange} />
        </ChatMessageBubble>
      </ChatMessage>
      {isTip && isTerminalStatus(run.job.status) && (
        <RunActions job={run.job} pending={retryPending} onRetry={onRetry} />
      )}
    </div>
  );
}

// The trailing run of earlier attempts that stopped/were rejected/cancelled,
// collapsed by default so a retried task doesn't read as several unrelated
// conversations. Each attempt's own record stays fully intact and individually
// reachable via "Show attempts" — nothing here merges or discards a run.
function EarlierAttemptsSummary({ collapsedJobs, expanded, onToggle }: { collapsedJobs: JobRecord[]; expanded: boolean; onToggle: () => void }) {
  if (collapsedJobs.length === 0) return null;
  if (expanded) {
    return (
      <button type="button" onClick={onToggle} className="mb-3 text-xs text-muted-foreground underline underline-offset-2">
        Hide earlier attempts
      </button>
    );
  }
  return (
    <p className="mb-3 text-xs text-muted-foreground">
      {summarizeCollapsedAttempts(collapsedJobs)}{" "}
      <button type="button" onClick={onToggle} className="underline underline-offset-2">
        Show attempts
      </button>
    </p>
  );
}

function RunThread({
  thread,
  onStatusChange,
  onRetry,
}: {
  thread: ThreadState;
  onStatusChange: (runId: string, status: JobStatus) => void;
  onRetry: (parentRunId: string) => void;
}) {
  const [attemptsExpanded, setAttemptsExpanded] = useState(false);
  const jobs = thread.runs.map((run) => run.job);
  const collapsibleIds = collapsibleAttemptIds(jobs);
  const numbered = thread.runs.map((run, i) => ({ run, attemptNumber: i + 1 }));
  const visible = attemptsExpanded ? numbered : numbered.filter(({ run }) => !collapsibleIds.has(run.job.id));

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <ThreadHeader thread={thread} />
      <EarlierAttemptsSummary
        collapsedJobs={jobs.filter((job) => collapsibleIds.has(job.id))}
        expanded={attemptsExpanded}
        onToggle={() => setAttemptsExpanded((v) => !v)}
      />
      <ChatMessageList density="balanced">
        {visible.map(({ run, attemptNumber }) => (
          <ConversationTurn
            key={run.job.id}
            run={run}
            isTip={run.job.id === thread.runs[thread.runs.length - 1].job.id}
            attemptNumber={attemptNumber}
            totalAttempts={thread.runs.length}
            retryPending={thread.retryPending}
            onStatusChange={onStatusChange}
            onRetry={() => onRetry(run.job.id)}
          />
        ))}
      </ChatMessageList>
    </div>
  );
}

// =============================================================================
// THREAD COMPOSER (sticky, clear status)
// =============================================================================

// The follow-up composer: submitting a message appends a new linked run to the
// same conversation. Multiline; Enter submits, Shift+Enter inserts a newline;
// the submit is disabled when empty or already in flight (so a message can't be
// double-sent); the text is preserved on failure with an inline error and
// cleared only on success. The model picker defaults to the conversation
// tip's current model (`currentModel`) — a normal follow-up always submits
// whichever model is selected; Retry / Run-again bypass this composer
// entirely (`handleRetryRun` omits model, inheriting the parent's verbatim).
function FollowUpComposer({
  currentModel,
  onSubmit,
}: {
  // Legacy jobs created before model selection carry no model — never invent one.
  currentModel: string | null;
  // `model` is omitted whenever the picker still shows the inherited value —
  // never resent as an explicit override, so an unchanged follow-up for a
  // model since retired from the catalog can't get rejected by the same
  // allowlist check that only an *explicit* choice must pass.
  onSubmit: (instruction: string, model?: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [model, setModel] = useState(currentModel);

  // A new tip (after a prior follow-up lands) re-anchors the default selection.
  useEffect(() => {
    setModel(currentModel);
  }, [currentModel]);

  useEffect(() => {
    if (!isApiConfigured()) return;
    let cancelled = false;
    listModels()
      .then(({ items }) => {
        if (!cancelled) setModels(items);
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The current model is always a valid, already-approved choice even if it's
  // missing from (or not yet loaded from) the server catalog — never let that
  // make the picker show a blank placeholder for it.
  const modelOptions: ComboboxOption[] = useMemo(() => {
    const fromCatalog = (models ?? []).map((m) => ({ value: m.id, label: m.label, keywords: [m.provider] }));
    if (currentModel == null || fromCatalog.some((o) => o.value === currentModel)) return fromCatalog;
    return [{ value: currentModel, label: currentModel }, ...fromCatalog];
  }, [models, currentModel]);

  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && !submitting && !!model;

  const submit = async () => {
    if (!canSubmit || !model) return;
    setSubmitting(true);
    setError(null);
    // Only an actively-chosen, different model is ever sent as an explicit
    // override; an untouched picker (still showing the inherited value)
    // omits it so the backend inherits the parent's model exactly as it
    // would for Retry / Run-again — never resending a value that may no
    // longer pass the current allowlist just because it happens to match.
    const modelOverride = model !== currentModel ? model : undefined;
    try {
      await onSubmit(trimmed, modelOverride);
      setText(""); // clear only on success
    } catch (err) {
      // Preserve the typed text so the user doesn't lose it; surface the reason.
      setError(err instanceof ApiError ? err.message : "Couldn't send the follow-up. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 pb-4 md:pb-6">
      {error && <p className="mb-2 text-xs text-red-600" role="alert">{error}</p>}
      {/*
        Deliberately overflow-VISIBLE (not overflow-hidden) so the non-portal
        model Combobox's dropdown can extend past the card's bottom edge —
        same reasoning as NewRunComposer. Rounded corners are preserved
        explicitly on the top (textarea) and bottom (footer row) children
        instead of being clipped by the card.
      */}
      <div className="rounded-2xl border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/30">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={submitting}
          placeholder="Send a follow-up… (Enter to send, Shift+Enter for a new line)"
          aria-label="Follow-up message"
          className="min-h-16 resize-none border-none shadow-none rounded-t-2xl rounded-b-none px-4 py-3 text-sm focus-visible:ring-0 disabled:opacity-60"
        />
        <Divider orientation="horizontal" />
        <div className="flex items-center justify-between gap-2 rounded-b-2xl px-3 py-2">
          <div className="min-w-0 w-40">
            <Combobox
              ariaLabel="Follow-up model"
              icon={<Cpu className="h-3.5 w-3.5" />}
              options={modelOptions}
              value={model}
              onChange={setModel}
              placeholder="Select model"
              searchPlaceholder="Search models…"
              emptyText="No matching models."
              disabled={submitting}
              className="h-8 rounded-lg bg-card px-2.5 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            aria-label="Send follow-up"
            title="Send follow-up"
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "disabled:opacity-40 disabled:pointer-events-none"
            )}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Reply className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// ACTIVITY PANEL (structured lifecycle stream from GET /v1/runs/{id}/events)
// =============================================================================

function ActivityPanel({ run, receiptState, onRetryReceipt }: { run: RunState; receiptState?: ReceiptActivityState; onRetryReceipt?: () => void }) {
  return <RunActivityTimeline run={run.job} events={run.events} loading={run.eventsLoading} polling={!isTerminalStatus(run.job.status)} reconnecting={run.eventsReconnecting} receiptState={receiptState} onRetryReceipt={onRetryReceipt} />;
}

// =============================================================================
// RECEIPT PANEL (the backend receipt is the sole source of receipt semantics)
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

function formatCheckStatus(status: string): string {
  if (status === "not_run") return "Not run";
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed";
  if (status === "unknown") return "Unknown";
  return status.replaceAll("_", " ");
}

function ReceiptPanel({ receipt, job }: { receipt: RunReceipt; job: JobRecord }) {
  const sections = getReceiptSections(receipt, job);
  const supplied = receipt.intelligence?.supplied ?? [];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* HEADER */}
      <Section padding={4} dividers={["bottom"]}>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Run receipt</p>
          <p className="text-sm font-semibold text-foreground line-clamp-2">{receipt.task}</p>
          <p className="text-xs text-muted-foreground font-mono">{receipt.repository}</p>
          <div className="flex items-center gap-1.5 pt-1">
            {sections.header.failed ? (
              <CircleX className="h-3.5 w-3.5 text-red-400" />
            ) : (
              <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span className={cn("text-sm font-semibold", sections.header.failed ? "text-red-400" : "text-emerald-400")}>
              {sections.header.title}
              {sections.header.qualifier && <span className="font-normal text-muted-foreground"> · {sections.header.qualifier}</span>}
            </span>
          </div>
          {sections.header.description && <p className="text-sm text-foreground leading-relaxed">{sections.header.description}</p>}
        </div>
      </Section>

      {/* CHANGES */}
      <Section padding={4} dividers={["bottom"]}>
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Changes</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <SummaryItem label="Files changed" value={String(sections.changes.filesChanged.length)} />
            <SummaryItem label="Model" value={sections.agent.model} />
          </div>
          {sections.changes.filesChanged.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1 font-mono">
              {sections.changes.filesChanged.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      {/* VERIFICATION */}
      <Section padding={4} dividers={["bottom"]}>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Verification</p>
          <p className="text-sm text-foreground">
            Output validation{" "}
            {sections.verification.outputValidation === "passed" ? "passed" : sections.verification.outputValidation === "failed" ? "failed" : "unavailable"}
          </p>
          {sections.verification.checks.map((check) => (
            <p key={check.name} className={cn("text-sm", check.passed === false ? "text-amber-400 font-medium" : "text-foreground")}>
              {check.name} · <span>{formatCheckStatus(check.status)}</span>
            </p>
          ))}
        </div>
      </Section>

      {/* AGENT */}
      <Section padding={4} dividers={["bottom"]}>
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Agent</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <SummaryItem label="Tokens" value={sections.agent.tokensSummary} emphasize />
            <SummaryItem label="Provider cost" value={sections.agent.cost.label} />
          </div>
        </div>
      </Section>

      {/* REPOSITORY INTELLIGENCE */}
      <Section padding={4} dividers={["bottom"]}>
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repository intelligence</p>
          <div className="grid grid-cols-1 gap-y-3">
            <SummaryItem label="Previous intelligence" value={sections.intelligence.selected.label} />
            <SummaryItem label="Delivered intelligence" value={sections.intelligence.delivered.label} />
            <SummaryItem label="New reusable intelligence" value={sections.intelligence.proposed.label} />
            <SummaryItem label="Approved from this run" value={sections.intelligence.approved.label} />
          </div>
          {supplied.length > 0 && (
            <ul className="mt-1 space-y-4">
              {supplied.map((item) => (
                <li key={item.memory_id} className="text-xs">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border px-2 py-0.5 font-medium">Selected by GNSIS</span>
                    <span className={cn("rounded-full border px-2 py-0.5", item.delivered ? "text-emerald-400" : "text-muted-foreground")}>
                      {item.delivered ? "Delivered to model request" : "Delivery not attested"}
                    </span>
                  </div>
                  {item.content != null && <p className="mt-2 text-sm">{item.content}</p>}
                  {item.kind != null && <p className="mt-1 text-muted-foreground">{item.kind}</p>}
                  <p className="mt-1 text-muted-foreground">
                    {[
                      item.source_model && `Source model: ${item.source_model}`,
                      item.approved_by && `Approved by ${item.approved_by}`,
                      item.approved_at && new Date(item.approved_at).toLocaleString(),
                      item.destination_model && `Destination model: ${item.destination_model}`,
                    ].filter(Boolean).join(" · ")}
                  </p>
                  {item.source_run_id && (
                    <a className="mt-1 inline-block underline" href={`/runs/${encodeURIComponent(item.source_run_id)}`}>
                      View source run
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      {/* PUBLICATION */}
      <Section padding={4} dividers={["bottom"]}>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Publication</p>
          {sections.publication.phase === "pre_approval" && (
            <p className="text-sm text-foreground">Review and approve the proposed change</p>
          )}
          {sections.publication.phase === "approved_not_published" && <p className="text-sm text-foreground">Approved</p>}
          {sections.publication.phase === "published" && (
            <>
              <p className="text-sm text-foreground">Pull request published</p>
              {sections.publication.pullRequest && (
                <a
                  href={sections.publication.pullRequest.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm underline"
                >
                  View pull request on GitHub <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </>
          )}
        </div>
      </Section>

      {/* TECHNICAL EVIDENCE */}
      <details className="border-b px-4 py-4 text-xs">
        <summary className="cursor-pointer text-sm font-semibold">Technical evidence</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <SummaryItem label="Repository" value={sections.technical.repository} />
          {sections.technical.startingCommit != null && <SummaryItem label="Starting commit" value={sections.technical.startingCommit} />}
          {receipt.advisor_model != null && <SummaryItem label="Historical Advisor" value={receipt.advisor_model} />}
          <SummaryItem
            label="Service fee"
            value={receipt.cost?.gnsis_service_fee != null ? receipt.cost.gnsis_service_fee : "No service fee recorded"}
          />
          <SummaryItem
            label="Execution started"
            value={sections.technical.executionStarted === undefined ? "Unavailable" : sections.technical.executionStarted ? "Yes" : "No"}
          />
          {publicBetaMode() && sections.technical.executionId != null && <SummaryItem label="Execution ID" value={sections.technical.executionId} />}
          {sections.technical.patchHash != null && <SummaryItem label="Patch hash" value={sections.technical.patchHash} />}
          {sections.technical.durationSeconds != null && <SummaryItem label="Duration" value={`${sections.technical.durationSeconds}s`} />}
        </div>
        {sections.technical.failureDetails != null && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Failure details</p>
            <CodeBlock
              language="json"
              code={JSON.stringify(sections.technical.failureDetails, null, 2)}
              width="100%"
              maxHeight={224}
              isWrapped
            />
          </div>
        )}
      </details>
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
  const collapseToggle = (
    <IconButton
      icon={collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
      label={collapsed ? "Expand run panel" : "Collapse run panel"}
      onClick={onToggle}
      className="shrink-0"
    />
  );

  if (collapsed) {
    return <div className="flex items-center h-14 px-0 shrink-0 justify-center">{collapseToggle}</div>;
  }

  return (
    <div className="h-14 flex items-center px-1.5">
      <Toolbar
        label="Run panel"
        startContent={
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
                    Available once a result is ready for review
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        }
        endContent={collapseToggle}
      />
    </div>
  );
}

function CollapsedRunPanel({ job }: { job?: JobRecord }) {
  const status: StatusKind = job ? getRunLifecycleState(job).indicatorKind : "idle";

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
  | { kind: "thread-loading"; runId: string }
  | { kind: "thread-error"; runId: string; message: string }
  | { kind: "runs" }
  | { kind: "intelligence" }
  | { kind: "dashboard" }
  | { kind: "settings" }
  | { kind: "billing" }
  | { kind: "integration-test" }
  | { kind: "github-onboarding" };

function RunPanelRegion({
  collapsed,
  onToggle,
  view,
  width,
}: {
  collapsed: boolean;
  onToggle: () => void;
  view: WorkspaceView;
  width: number;
}) {
  const location = useLocation();
  const hasThread = view.kind === "thread";
  const selectedId = matchPath({ path: "/runs/:runId", end: true }, location.pathname)?.params.runId;
  // A deep link selects that immutable run even though the page renders its
  // complete conversation. Newly appended runs remain the active tip.
  const selectedRun = hasThread
    ? view.thread.runs.find((run) => run.job.id === selectedId) ?? activeRun(view.thread)
    : null;
  const receiptRunId = selectedId ?? selectedRun?.job.id;
  const status = selectedRun?.job.status;
  const threadKey = hasThread ? view.threadKey : null;

  const [tab, setTab] = useState<"activity" | "receipt">("activity");
  const prevStatusRef = useRef<JobStatus | null>(null);
  const [receiptState, setReceiptState] = useState<
    { kind: "idle" } | { kind: "loaded"; runId: string; receipt: RunReceipt } | { kind: "unavailable" | "error"; runId: string; message: string }
  >({ kind: "idle" });
  const [receiptAttempt, setReceiptAttempt] = useState(0);

  useEffect(() => {
    if (!selectedRun || !receiptRunId || !isReceiptEligibleStatus(selectedRun.job.status)) {
      return;
    }
    let cancelled = false;
    void getRunReceipt(receiptRunId).then(
      (receipt) => { if (!cancelled) setReceiptState({ kind: "loaded", runId: receiptRunId, receipt }); },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setReceiptState({ kind: "unavailable", runId: receiptRunId, message: "The canonical receipt is not available for this run." });
        } else {
          setReceiptState({ kind: "error", runId: receiptRunId, message: "The receipt could not be loaded. Try refreshing the page." });
        }
      },
    );
    return () => { cancelled = true; };
  }, [receiptRunId, selectedRun?.job.status, receiptAttempt]);

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
    const initialStatus = selectedRun?.job.status ?? activeRun(view.thread).job.status;
    setTab(isReceiptEligibleStatus(initialStatus) ? "receipt" : "activity");
    activityScrollPos.current = 0;
    receiptScrollPos.current = 0;
    prevStatusRef.current = initialStatus;
  }, [threadKey, selectedRun?.job.id]);

  // Auto-switch to receipt once a result becomes ready for review, not only
  // once fully published — a run reaching awaiting_approval already has a
  // receipt worth showing.
  useEffect(() => {
    if (!hasThread) return;
    const statusNow = activeRun(view.thread).job.status;
    if (prevStatusRef.current && !isReceiptEligibleStatus(prevStatusRef.current) && isReceiptEligibleStatus(statusNow)) {
      handleTabChange("receipt");
    }
    prevStatusRef.current = statusNow;
  }, [hasThread, status]);

  const receiptEnabled = !!status && isReceiptEligibleStatus(status);
  const hasActivity = hasThread && !(status && isTerminalStatus(status));

  return (
    <aside
      style={{ width: collapsed ? 48 : width }}
      className={cn(
        "relative flex flex-col h-full shrink-0 bg-muted/60",
        collapsed && "transition-[width] duration-200 ease-in-out",
        "overflow-hidden"
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
          <CollapsedRunPanel job={selectedRun?.job} />
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
            description="Receipts appear once a run's result is ready for review."
          />
        )
      ) : tab === "activity" && selectedRun ? (
        <div ref={activityScrollRef} className="flex-1 overflow-y-auto">
          <ActivityPanel run={selectedRun} receiptState={receiptState.kind === "idle" ? "idle" : receiptState.kind === "loaded" ? "loaded" : receiptState.kind} onRetryReceipt={() => { setReceiptState({ kind: "idle" }); setReceiptAttempt((value) => value + 1); }} />
        </div>
      ) : selectedRun ? (
        <div ref={receiptScrollRef} className="flex-1 overflow-y-auto">
          {receiptState.kind === "loaded" && receiptState.runId === receiptRunId ? (
            <ReceiptPanel receipt={receiptState.receipt} job={selectedRun.job} />
          ) : (receiptState.kind === "error" || receiptState.kind === "unavailable") && receiptState.runId === receiptRunId ? (
            <div className="p-4"><EmptyState icon={<AlertTriangle className="h-8 w-8" />} title={receiptState.kind === "error" ? "Receipt request failed" : "Receipt unavailable"} description="The run outcome is known, but its detailed receipt could not be loaded." /><Button variant="outline" size="sm" className="mx-auto flex" onClick={() => { setReceiptState({ kind: "idle" }); setReceiptAttempt((value) => value + 1); }}>Retry receipt</Button></div>
          ) : (
            <EmptyState icon={<Loader2 className="h-8 w-8 animate-spin" />} title="Loading receipt" description="Fetching the canonical receipt for this run…" />
          )}
        </div>
      ) : null}
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
  labelFor = (opt) => opt,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  labelFor?: (opt: string) => string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="h-8 text-xs w-auto gap-1.5">
        <SelectValue>
          <span className="text-muted-foreground">{label}:</span>{" "}
          <span>{value === "all" ? "All" : labelFor(value)}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="all">All</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {labelFor(opt)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const runsColumns = "grid-cols-[2fr_1.3fr_0.9fr_0.9fr_0.9fr]";

// Shared by RunsView and DashboardView's "Recent runs" section: a
// responsive (desktop grid / mobile stacked cards) list of runs, differing
// only in column widths, header labels, and the empty-state message.
function RunsTable({
  runs,
  onSelectRun,
  columns,
  headers,
  emptyMessage,
}: {
  runs: RecentRun[];
  onSelectRun: (id: string) => void;
  columns: string;
  headers: [string, string, string, string, string];
  emptyMessage: string;
}) {
  return (
    <>
      <div className={cn("hidden md:grid gap-3 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", columns)}>
        {headers.map((label, i) => (
          <span key={label} className={i === headers.length - 1 ? "text-right" : undefined}>{label}</span>
        ))}
      </div>

      <div className="hidden md:block border-t border-border">
        {runs.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
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
                columns
              )}
            >
              <span className="text-sm text-foreground truncate">
                {run.title}
                {run.attemptCount > 1 && <span className="ml-1.5 text-xs text-muted-foreground">· {run.attemptCount} attempts</span>}
              </span>
              <span className="text-xs font-mono text-muted-foreground truncate">{run.repo}</span>
              <span className="text-xs text-muted-foreground truncate">{run.model}</span>
              <span className="text-xs"><StatusLabel stage={run.status} /></span>
              <span className="text-xs text-muted-foreground/70 text-right">{timeAgo(run.updatedAt)}</span>
            </button>
          ))
        )}
      </div>

      <div className="md:hidden space-y-2 mt-2">
        {runs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => onSelectRun(run.id)}
              className="w-full rounded-lg border border-border bg-card p-3 text-left space-y-1.5 hover:bg-black/[0.02] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground font-semibold truncate">{run.title}</span>
                <span className="text-xs text-muted-foreground/70 shrink-0 ml-2">{timeAgo(run.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{run.repo}</span>
                <span>·</span>
                <span>{run.model}</span>
                {run.attemptCount > 1 && (
                  <>
                    <span>·</span>
                    <span>{run.attemptCount} attempts</span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <StatusLabel stage={run.status} />
              </div>
            </button>
          ))
        )}
      </div>
    </>
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
        <RunsFilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={LIFECYCLE_FILTER_OPTIONS} labelFor={(s) => LIFECYCLE_STAGE_LABELS[s as LifecycleStageId] ?? s} />
        <RunsFilterSelect label="Repository" value={repoFilter} onChange={setRepoFilter} options={repoOptions} />
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        {filtered.length} {filtered.length === 1 ? "run" : "runs"}
      </p>

      <RunsTable
        runs={filtered}
        onSelectRun={onSelectRun}
        columns={runsColumns}
        headers={["Task", "Repository", "Model", "Status", "Updated"]}
        emptyMessage="No runs match your filters."
      />
    </div>
  );
}

// =============================================================================
// GITHUB ONBOARDING CARD
// =============================================================================

function GitHubOnboardingCard({ hasRuns, onNewRun }: { hasRuns: boolean; onNewRun: () => void }) {
  if (hasRuns) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-8">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <CirclePlus className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Start your first run</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Describe a task and point GNSIS at a repository to get started.
          </p>
          <Button
            size="sm"
            onClick={onNewRun}
            className="h-8 mt-3 gap-1.5 rounded-lg text-xs"
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

function usd(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!isFinite(n)) return "$0.00";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function DashboardView({
  runs,
  balances,
  onSelectRun,
  onNewRun,
}: {
  runs: RecentRun[];
  balances: Balances | null;
  onSelectRun: (id: string) => void;
  onNewRun: () => void;
}) {
  const counts = runs.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.status === "published") acc.complete += 1;
      else if (r.status === "attempt_stopped" || r.status === "publication_failed" || r.status === "rejected" || r.status === "cancelled") acc.failed += 1;
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
          className="h-8 shrink-0 gap-1.5 rounded-lg text-xs px-3"
        >
          <CirclePlus className="h-3.5 w-3.5" />
          <span className="hidden md:inline">New run</span>
        </Button>
      </div>

      {/* GitHub onboarding card */}
      <GitHubOnboardingCard hasRuns={runs.length > 0} onNewRun={onNewRun} />

      {/* Run counts (real) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total runs
          </span>
          <p className="text-2xl font-bold text-foreground">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            In progress
          </span>
          <p className="text-2xl font-bold text-foreground">{counts.active}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Completed
          </span>
          <p className="text-2xl font-bold text-foreground">{counts.complete}</p>
        </div>
      </div>

      {/* Prepaid balance (real — from GET /v1/balances) */}
      {balances ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available
            </span>
            <p
              className={cn(
                "text-2xl font-bold",
                Number(balances.available) < 5 ? "text-amber-600" : "text-foreground"
              )}
            >
              {usd(balances.available)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              On hold
            </span>
            <p className="text-2xl font-bold text-foreground">{usd(balances.reserved)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Balance
            </span>
            <p className="text-2xl font-bold text-foreground">{usd(balances.balance)}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-5 mb-8">
          <p className="text-sm font-semibold text-foreground">Prepaid balance</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your available balance appears here once the workspace is reachable.
          </p>
        </div>
      )}

      {/* Recent runs (real) */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-2">Recent runs</p>
        <RunsTable
          runs={runs}
          onSelectRun={onSelectRun}
          columns={dashboardColumns}
          headers={["Run", "Repository", "Model", "Status", "Updated"]}
          emptyMessage="No runs yet."
        />
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
  balances,
  onSubmit,
  onRunStatusChange,
  onRetry,
  onFollowUp,
  onSelectRun,
  onNewRun,
  onSettingsBack,
  onBillingBack,
}: {
  view: WorkspaceView;
  runs: RecentRun[];
  balances: Balances | null;
  onSubmit: (prompt: string, selection: ComposerSelection) => Promise<void>;
  onRunStatusChange: (runId: string, status: JobStatus) => void;
  onRetry: (parentRunId: string) => void;
  onFollowUp: (instruction: string, model?: string) => Promise<void>;
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
              onStatusChange={onRunStatusChange}
              onRetry={onRetry}
            />
          </div>
          <FollowUpComposer
            key={`composer-${view.threadKey}`}
            currentModel={activeRun(view.thread).job.model}
            onSubmit={onFollowUp}
          />
        </>
      )}

      {view.kind === "thread-loading" && (
        <EmptyState
          icon={<Loader2 className="h-8 w-8 animate-spin" />}
          title="Loading run"
          description={`Fetching run ${view.runId}…`}
        />
      )}

      {view.kind === "thread-error" && (
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8" />}
          title="Run not found"
          description={view.message}
          action={{ label: "View all runs", onClick: () => onSelectRun("") }}
        />
      )}

      {view.kind === "runs" && (
        <div className="flex-1 overflow-y-auto">
          <RunsView runs={runs} onSelectRun={onSelectRun} />
        </div>
      )}

      {view.kind === "intelligence" && <div className="flex-1 overflow-y-auto"><IntelligencePage /></div>}

      {view.kind === "dashboard" && (
        <div className="flex-1 overflow-y-auto">
          <DashboardView runs={runs} balances={balances} onSelectRun={onSelectRun} onNewRun={onNewRun} />
        </div>
      )}

      {view.kind === "integration-test" && (
        <div className="flex-1 overflow-y-auto">
          <IntegrationTestPage onBack={onNewRun} />
        </div>
      )}

      {view.kind === "settings" && (
        <div className="flex-1 overflow-y-auto">
          <SettingsPage onBack={onSettingsBack} githubConnected={new URLSearchParams(location.search).get("github") === "connected"} />
        </div>
      )}

      {view.kind === "github-onboarding" && (
        <div className="flex-1 overflow-y-auto">
          <GitHubOnboardingPage />
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

// eslint-disable-next-line react-refresh/only-export-components -- shell hook co-located with its provider
export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useAppShell must be used within AppShell");
  return ctx;
}


function routeFromPathname(pathname: string): { route: RouteViewKind; runId: string | null } {
  const runMatch = matchPath({ path: "/runs/:runId", end: true }, pathname);
  if (runMatch?.params.runId) return { route: "run", runId: runMatch.params.runId };

  if (pathname === "/new") return { route: "new-run", runId: null };
  if (pathname === "/runs") return { route: "runs", runId: null };
  if (pathname === "/intelligence") return { route: "intelligence", runId: null };
  if (pathname === "/dashboard") return { route: "dashboard", runId: null };
  if (pathname === "/settings") return { route: "settings", runId: null };
  if (pathname === "/billing") return { route: "billing", runId: null };
  if (pathname === "/integration-test") return { route: "integration-test", runId: null };
  if (pathname === "/onboarding/github") return { route: "github-onboarding", runId: null };
  // New Run is the workspace default for any other authenticated path.
  return { route: "new-run", runId: null };
}

function navIdFromRoute(route: RouteViewKind): NavId {
  if (route === "runs" || route === "run") return "runs";
  if (route === "intelligence") return "intelligence";
  if (route === "dashboard") return "dashboard";
  if (route === "integration-test") return "integration-test";
  return "new-run";
}

function runStateFromJob(job: JobRecord, logs: LogRecord[] = [], diff: DiffRecord | null = null): RunState {
  return { job, logs, diff, events: [], eventsLoading: true, eventsReconnecting: false };
}

// A run always belongs to a thread; when the backend omits thread_id (older
// payloads) the run is its own single-run thread, keyed by its own id.
function threadIdOf(job: JobRecord): string {
  return job.thread_id ?? job.id;
}

function threadFromRuns(runs: RunState[]): WorkspaceView {
  const threadId = runs.length > 0 ? threadIdOf(runs[0].job) : "";
  return { kind: "thread", thread: { threadId, runs, retryPending: false }, threadKey: threadId };
}

function threadFromJob(job: JobRecord, logs: LogRecord[] = [], diff: DiffRecord | null = null): WorkspaceView {
  return threadFromRuns([runStateFromJob(job, logs, diff)]);
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
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [runPanelCollapsed, setRunPanelCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  // Drag-to-resize width for the expanded run panel. Independent of
  // runPanelCollapsed, which still drives the separate 48px icon-rail state
  // (collapsing to size 0 isn't this panel's UX — it keeps an icon rail).
  const runPanel = useResizable({ defaultSize: 400, minSizePx: 320, maxSizePx: 560 });

  const { route, runId: routeRunId } = routeFromPathname(location.pathname);
  const activeNav = navIdFromRoute(route);
  const activeRunId = routeRunId;
  const [view, setView] = useState<WorkspaceView>({ kind: "composer" });
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [balances, setBalances] = useState<Balances | null>(null);
  const runs = groupJobsIntoThreadRows(jobs);

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);
  const toggleRunPanel = () => setRunPanelCollapsed((v) => !v);

  const refreshJobs = useCallback(async () => {
    if (!isApiConfigured()) return;
    try {
      setJobs(await listJobs());
    } catch {
      // transient network error — keep showing the last known list
    }
    if (!publicBetaMode()) {
      try { setBalances(await getBalances()); } catch { /* keep the last value */ }
    }
  }, []);

  // Background refresh of the run list (sidebar, runs, dashboard).
  useEffect(() => {
    refreshJobs();
    const t = setInterval(refreshJobs, 8000);
    return () => clearInterval(t);
  }, [refreshJobs]);

  // The URL is the source of truth for the workspace screen. Static routes can
  // render immediately; run routes hydrate a thread by ID so direct refreshes do
  // not depend on the sidebar/list request completing first.
  useEffect(() => {
    if (route === "new-run") setView({ kind: "composer" });
    else if (route === "runs") setView({ kind: "runs" });
    else if (route === "intelligence") setView({ kind: "intelligence" });
    else if (route === "dashboard") {
      if (publicBetaMode()) navigate("/new", { replace: true }); else setView({ kind: "dashboard" });
    }
    else if (route === "settings") setView({ kind: "settings" });
    else if (route === "billing") {
      if (publicBetaMode()) navigate("/new", { replace: true }); else setView({ kind: "billing" });
    }
    else if (route === "integration-test") {
      // The route itself is gated, not just the nav link — a direct URL visit
      // when the flag is off must not reach the Integration Lab.
      if (!publicBetaMode() && integrationLabEnabled()) {
        setView({ kind: "integration-test" });
      } else {
        navigate("/new", { replace: true });
      }
    } else if (route === "github-onboarding") setView({ kind: "github-onboarding" });
  }, [route, navigate]);

  useEffect(() => {
    if (route !== "run" || !routeRunId) return;

    setView({ kind: "thread-loading", runId: routeRunId });

    if (!isApiConfigured()) {
      setView({
        kind: "thread-error",
        runId: routeRunId,
        message: "Run details cannot be loaded because VITE_API_BASE_URL is not configured.",
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        // Opening any run resolves its whole conversation. A legacy run with no
        // thread comes back as a single-run thread of just itself.
        const threadJobs = await getJobThread(routeRunId);
        if (cancelled) return;
        if (threadJobs.length === 0) throw new ApiError(404, "Run not found");
        const runs = await Promise.all(
          threadJobs.map(async (j) => {
            const [logs, diff, eventList] = await Promise.all([
              getJobLogs(j.id),
              getJobDiff(j.id),
              getAllRunEvents(j.id).catch(() => null),
            ]);
            return { ...runStateFromJob(j, logs, diff), events: mergeRunEvents([], eventList ?? []), eventsLoading: false, eventsReconnecting: eventList === null };
          })
        );
        if (cancelled) return;
        setJobs((prev) => threadJobs.reduce((acc, j) => upsertJob(acc, j), prev));
        setView(threadFromRuns(runs));
      } catch (err) {
        if (cancelled) return;
        const detail = err instanceof ApiError ? err.message : "The requested run could not be loaded.";
        setView({
          kind: "thread-error",
          runId: routeRunId,
          message: `Run ${routeRunId} was not found or is not accessible. ${detail}`,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [route, routeRunId]);

  const handleNavSelect = (id: NavId) => {
    const nextPath: Record<NavId, string> = {
      "new-run": "/new",
      runs: "/runs",
      intelligence: "/intelligence",
      dashboard: "/dashboard",
      "integration-test": "/integration-test",
    };
    navigate(nextPath[id]);
  };

  const handleRunSelect = (selectedRunId: string) => {
    if (!selectedRunId) {
      navigate("/runs");
      return;
    }
    navigate(`/runs/${encodeURIComponent(selectedRunId)}`);
  };

  const handleComposerSubmit = async (prompt: string, selection: ComposerSelection) => {
    const job = await createJob({
      repository_id: selection.repositoryId,
      instruction: prompt,
      base_branch: selection.branch,
      model: selection.model,
      ...(selection.advisorModel ? { advisor_model: selection.advisorModel } : {}),
    });
    setJobs((prev) => upsertJob(prev, job));
    setView(threadFromJob(job));
    navigate(`/runs/${encodeURIComponent(job.id)}`);
  };

  // Update a single run within the active thread by id (immutable).
  const updateRun = useCallback((runId: string, updater: (r: RunState) => RunState) => {
    setView((prev) => {
      if (prev.kind !== "thread") return prev;
      return {
        ...prev,
        thread: {
          ...prev.thread,
          runs: prev.thread.runs.map((r) => (r.job.id === runId ? updater(r) : r)),
        },
      };
    });
  }, []);

  // Mutation responses are authoritative for their returned status. Apply them
  // immediately while preserving the rest of the cached record; polling may
  // subsequently reconcile the complete JobRecord.
  const applyRunStatus = useCallback((runId: string, status: JobStatus) => {
    updateRun(runId, (run) => ({ ...run, job: { ...run.job, status } }));
    setJobs((current) => current.map((job) => job.id === runId ? { ...job, status } : job));
  }, [updateRun]);

  // Append a new linked run (a follow-up / retry) to the active thread, in place,
  // so the conversation and the follow-up composer stay mounted.
  const appendRun = useCallback((job: JobRecord) => {
    setView((prev) => {
      if (prev.kind !== "thread") return prev;
      if (prev.thread.runs.some((r) => r.job.id === job.id)) return prev;
      return { ...prev, thread: { ...prev.thread, runs: [...prev.thread.runs, runStateFromJob(job)] } };
    });
  }, []);

  // A ref to the live thread so the poll interval always sees the current runs
  // (including follow-ups appended after it was set up).
  const threadRef = useRef<ThreadState | null>(null);
  threadRef.current = view.kind === "thread" ? view.thread : null;
  const finalEventsFetched = useRef(new Set<string>());

  // Poll every non-terminal run in the conversation for live status/logs/diff.
  // The interval runs while a thread is open; when all runs are terminal each
  // tick is a cheap no-op (no requests), so it costs nothing once settled.
  useEffect(() => {
    if (view.kind !== "thread") return;
    let cancelled = false;

    const poll = async () => {
      const thread = threadRef.current;
      if (!thread) return;
      const pending = thread.runs.filter((r) => !isTerminalStatus(r.job.status));
      if (pending.length === 0) return;
      await Promise.all(
        pending.map(async (r) => {
          // Core run state and lifecycle evidence have independent failure
          // boundaries: an events outage must never freeze terminal status,
          // approval, diff, or receipt eligibility.
          const [jobResult, logsResult, diffResult] = await Promise.allSettled([
            getJob(r.job.id), getJobLogs(r.job.id), getJobDiff(r.job.id),
          ]);
          if (cancelled) return;

          const job = jobResult.status === "fulfilled" ? jobResult.value : null;
          if (job) {
            updateRun(job.id, (cur) => ({
              ...cur,
              job,
              logs: logsResult.status === "fulfilled" ? logsResult.value : cur.logs,
              diff: diffResult.status === "fulfilled" ? diffResult.value ?? cur.diff : cur.diff,
            }));
            setJobs((prev) => upsertJob(prev, job));
          }

          try {
            const settledNow = !!job && isTerminalStatus(job.status);
            let events: RunEvent[];
            if (settledNow && !finalEventsFetched.current.has(r.job.id)) {
              // Settlement always reconciles from zero so missed or replaced
              // pages cannot leave an incomplete terminal history.
              events = await getAllRunEvents(r.job.id);
              finalEventsFetched.current.add(r.job.id);
            } else {
              // Offset uses raw backend evidence, never grouped UI row count.
              events = await getRunEventsSince(r.job.id, r.events.length);
            }
            if (cancelled) return;
            updateRun(r.job.id, (cur) => ({ ...cur, events: mergeRunEvents(cur.events, events), eventsLoading: false, eventsReconnecting: false }));
          } catch {
            if (cancelled) return;
            // Preserve previously loaded evidence and retry on the next tick.
            updateRun(r.job.id, (cur) => ({ ...cur, eventsLoading: false, eventsReconnecting: true }));
          }
        })
      );
    };

    poll();
    const timer = setInterval(poll, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind === "thread" ? view.threadKey : null, updateRun]);

  // Send a follow-up message: a new linked run, same conversation. Errors
  // propagate to the composer so it preserves the text and shows the reason.
  const handleFollowUpSubmit = async (instruction: string, model?: string) => {
    if (view.kind !== "thread") return;
    const tip = activeRun(view.thread);
    const job = model != null
      ? await followUpJob(tip.job.id, instruction, model)
      : await followUpJob(tip.job.id, instruction);
    appendRun(job);
    setJobs((prev) => upsertJob(prev, job));
  };

  // Retry (failed) / Run-again (completed/rejected): a new linked run reusing the
  // parent's instruction + config.
  const handleRetryRun = async (parentRunId: string) => {
    if (view.kind !== "thread") return;
    setView((prev) => (prev.kind === "thread" ? { ...prev, thread: { ...prev.thread, retryPending: true } } : prev));
    try {
      const job = await followUpJob(parentRunId);
      appendRun(job);
      setJobs((prev) => upsertJob(prev, job));
    } catch {
      // leave the run as-is; the button simply stops spinning so it can be retried
    } finally {
      setView((prev) => (prev.kind === "thread" ? { ...prev, thread: { ...prev.thread, retryPending: false } } : prev));
    }
  };

  const handleNewRun = () => navigate("/new");
  const handleSettings = () => navigate("/settings");
  const handleBilling = () => navigate("/billing");
  const navigateBackOrHome = () => {
    // "Home" inside the authenticated app is the New Run workspace, not the
    // public marketing homepage at "/".
    if (location.key === "default") navigate("/new");
    else navigate(-1);
  };

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
            available={balances?.available ?? null}
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
          <div className="h-full bg-muted shadow-xl">
            <SidebarRegion
              collapsed={false}
              onToggle={() => setMobileSidebarOpen(false)}
              activeNav={activeNav}
              activeRunId={activeRunId}
              runs={runs}
              available={balances?.available ?? null}
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
            balances={balances}
            onSubmit={handleComposerSubmit}
            onRunStatusChange={applyRunStatus}
            onRetry={handleRetryRun}
            onFollowUp={handleFollowUpSubmit}
            onSelectRun={handleRunSelect}
            onNewRun={handleNewRun}
            onSettingsBack={navigateBackOrHome}
            onBillingBack={navigateBackOrHome}
          />
        </div>

        {/* Desktop right panel */}
        {showRightPanel && (
          <>
            <div className="hidden md:block">
              {runPanelCollapsed ? (
                <Divider orientation="vertical" />
              ) : (
                <ResizeHandle
                  direction="horizontal"
                  isReversed
                  hasDivider
                  label="Resize run panel"
                  resizable={runPanel.props}
                />
              )}
            </div>
            <div
              className={cn(
                "hidden md:block shrink-0 h-full z-20",
                runPanelCollapsed && "transition-all duration-200 ease-in-out"
              )}
              style={{ width: runPanelCollapsed ? 48 : runPanel.size }}
            >
              <RunPanelRegion
                collapsed={runPanelCollapsed}
                onToggle={toggleRunPanel}
                view={view}
                width={runPanel.size}
              />
            </div>
          </>
        )}

        {/* Mobile bottom sheet */}
        {mobilePanelOpen && view.kind === "thread" && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setMobilePanelOpen(false)} />
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-muted rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-center py-2">
                <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
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
                <ActivityPanel run={activeRun(view.thread)} />
              </div>
            </div>
          </>
        )}
      </div>
    </AppShellContext.Provider>
  );
}

export default GNSISWorkspacePreview;
