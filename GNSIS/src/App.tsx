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
  Cpu,
  Send,
  Loader2,
  CircleCheck,
  CircleX,
  Circle,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  TrendingDown,
  Wallet,
  Activity as ActivityGlyph,
  Menu,
  X,
} from "lucide-react";
import SettingsPage from "@/pages/SettingsPage";
import BillingPage from "@/pages/BillingPage";
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

type RunStatus = "complete" | "running" | "failed";
type NavId = "new-run" | "runs" | "dashboard";

const repoOptions = ["gnsis/frontend", "gnsis/api", "gnsis/docs"] as const;
const branchOptions = ["main", "staging", "feature/navbar-fix"] as const;
const modelOptions = ["Claude Sonnet", "Claude Opus", "GPT model", "Gemini model"] as const;

type RepoOption = (typeof repoOptions)[number];
type BranchOption = (typeof branchOptions)[number];
type ModelOption = (typeof modelOptions)[number];

interface RecentRun {
  id: string;
  title: string;
  repo: RepoOption;
  model: string;
  source: string;
  time: string;
  status: RunStatus;
  tokens: number;
  cost: number;
}

const recentRuns: RecentRun[] = [
  { id: "run-1", title: "Fix navbar positioning", repo: "gnsis/frontend", model: "Claude Sonnet", source: "Web", time: "2h ago", status: "complete", tokens: 42180, cost: 0.46 },
  { id: "run-2", title: "Check Stripe webhook", repo: "gnsis/api", model: "Claude Opus", source: "API", time: "5h ago", status: "complete", tokens: 58400, cost: 0.63 },
  { id: "run-3", title: "Add authentication guard", repo: "gnsis/frontend", model: "GPT-4o", source: "Web", time: "1d ago", status: "complete", tokens: 36900, cost: 0.4 },
  { id: "run-4", title: "Refactor database schema", repo: "gnsis/api", model: "Claude Sonnet", source: "CLI", time: "Running", status: "running", tokens: 31000, cost: 0.34 },
  { id: "run-5", title: "Update README docs", repo: "gnsis/docs", model: "Claude Haiku", source: "Web", time: "2d ago", status: "failed", tokens: 12200, cost: 0.13 },
  { id: "run-6", title: "Fix Stripe webhook retry", repo: "gnsis/api", model: "Claude Sonnet", source: "Web", time: "3d ago", status: "complete", tokens: 28400, cost: 0.31 },
  { id: "run-7", title: "Update navigation styles", repo: "gnsis/frontend", model: "Gemini Pro", source: "API", time: "4d ago", status: "complete", tokens: 15200, cost: 0.18 },
  { id: "run-8", title: "Add rate limiting", repo: "gnsis/api", model: "Claude Sonnet", source: "CLI", time: "5d ago", status: "failed", tokens: 22100, cost: 0.24 },
];

const runLabelCls: Record<RunStatus, { label: string; cls: string }> = {
  complete: { label: "Complete", cls: "text-emerald-600" },
  running: { label: "Running", cls: "text-blue-600" },
  failed: { label: "Failed", cls: "text-red-600" },
};

function StatusLabel({ status }: { status: RunStatus }) {
  const s = runLabelCls[status];
  return <span className={cn("font-medium", s.cls)}>{s.label}</span>;
}

interface UsageData {
  total: number;
  used: number;
}

const usageData: UsageData = { total: 20.0, used: 7.6 };

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatTokensK(tokens: number) {
  return `${(tokens / 1000).toFixed(1)}k`;
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
  complete: <CircleCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0 self-start mt-0.5" />,
  running: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin motion-reduce:animate-none shrink-0 self-start mt-0.5" />,
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
          {run.time}
        </span>
      </span>
    </button>
  );
}

// =============================================================================
// USAGE METER (sans-serif dollars, "Monthly usage" heading)
// =============================================================================

function UsageMeter({ data }: { data: UsageData }) {
  const remaining = Math.max(data.total - data.used, 0);
  const percentUsed = Math.min((data.used / data.total) * 100, 100);
  const isLow = percentUsed >= 85;

  return (
    <div className="px-3 pb-2.5 pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Usage balance
        </span>
        {isLow && (
          <span className="text-[11px] font-semibold text-amber-600">Running low</span>
        )}
      </div>
      <p className="text-sm font-semibold text-foreground">
        {formatUsd(remaining)} remaining
      </p>
      <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
            isLow ? "bg-amber-500" : "bg-blue-500"
          )}
          style={{ width: `${percentUsed}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatUsd(data.used)} of {formatUsd(data.total)} used
      </p>
    </div>
  );
}

function CollapsedUsageIndicator({ data }: { data: UsageData }) {
  const remaining = Math.max(data.total - data.used, 0);
  const percentUsed = Math.min((data.used / data.total) * 100, 100);
  const isLow = percentUsed >= 85;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="px-4 pb-2.5 pt-3 flex justify-center cursor-pointer">
            <div className="h-1.5 w-9 rounded-full bg-neutral-200/80 overflow-hidden">
              <div
                className={cn("h-full rounded-full", isLow ? "bg-amber-500" : "bg-blue-500/70")}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {formatUsd(remaining)} remaining
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
              {recentRuns.length === 0 && !collapsed && (
                <p className="px-2.5 py-4 text-xs text-muted-foreground text-center">
                  No recent runs
                </p>
              )}
              {recentRuns.slice(0, 5).map((run) => (
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
      {collapsed ? <CollapsedUsageIndicator data={usageData} /> : <UsageMeter data={usageData} />}

      <Divider orientation="horizontal" />

      {/* Account — fixed */}
      <AccountRow collapsed={collapsed} onSettings={onSettings} onBilling={onBilling} />
    </aside>
  );
}


// =============================================================================
// COMPACT SELECT
// =============================================================================

function CompactSelect<T extends string>({
  icon,
  value,
  options,
  onChange,
  mono,
  label,
}: {
  icon: React.ReactNode;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  mono?: boolean;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger
              size="sm"
              className={cn(
                "h-7 gap-1.5 rounded-md border-none bg-transparent px-2 shadow-none text-xs text-muted-foreground",
                "hover:bg-black/[0.04] hover:text-foreground focus-visible:ring-0 data-[state=open]:bg-black/[0.05]",
                "[&_svg]:h-3.5 [&_svg]:w-3.5"
              )}
            >
              <span className="shrink-0 text-muted-foreground/70">{icon}</span>
              <SelectValue>
                <span className={cn(mono && "font-mono", "truncate")}>{value}</span>
              </SelectValue>
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SelectContent align="start" className="max-h-60">
        {options.map((opt) => (
          <SelectItem key={opt} value={opt} className={cn(mono && "font-mono")}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// =============================================================================
// NEW RUN COMPOSER (with duplicate submission prevention)
// =============================================================================

interface ComposerSelection {
  repo: RepoOption;
  branch: BranchOption;
  routing: "automatic" | "specific";
  routingModel?: ModelOption;
}

interface NewRunComposerProps {
  onSubmit: (prompt: string, selection: ComposerSelection) => void;
}

function NewRunComposer({ onSubmit }: NewRunComposerProps) {
  const [prompt, setPrompt] = useState("");
  const [repo, setRepo] = useState<RepoOption>("gnsis/frontend");
  const [branch, setBranch] = useState<BranchOption>("main");
  const [routing, setRouting] = useState<"automatic" | "specific">("automatic");
  const [routingModel, setRoutingModel] = useState<ModelOption>("Claude Sonnet");
  const [showMobileConfig, setShowMobileConfig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = prompt.trim().length > 0 && !isSubmitting;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    onSubmit(prompt.trim(), {
      repo,
      branch,
      routing,
      routingModel: routing === "specific" ? routingModel : undefined,
    });
  }, [canSubmit, prompt, repo, branch, routing, routingModel, onSubmit]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 pb-4 md:pb-0">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          What should Genesis work on?
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Choose your workspace, describe the task, and start the run.
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

        {/* Desktop selectors */}
        <div className="hidden md:flex items-center justify-between gap-2 px-2.5 py-2">
          <div className="flex items-center gap-0.5 flex-wrap min-w-0">
            <CompactSelect icon={<FolderGit />} value={repo} options={repoOptions} onChange={setRepo} mono label="Repository" />
            <CompactSelect icon={<GitBranch />} value={branch} options={branchOptions} onChange={setBranch} mono label="Branch" />
            {/* Routing control */}
            <Select value={routing} onValueChange={(v) => setRouting(v as "automatic" | "specific")}>
              <TooltipProvider delayDuration={400}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger
                      size="sm"
                      className="h-7 gap-1.5 rounded-md border-none bg-transparent px-2 shadow-none text-xs text-muted-foreground hover:bg-black/[0.04] hover:text-foreground focus-visible:ring-0 data-[state=open]:bg-black/[0.05] [&_svg]:h-3.5 [&_svg]:w-3.5"
                    >
                      <span className="shrink-0 text-muted-foreground/70"><Cpu className="h-3.5 w-3.5" /></span>
                      <SelectValue>
                        <span>{routing === "automatic" ? "Automatic" : routingModel}</span>
                      </SelectValue>
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Routing</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <SelectContent align="start">
                <SelectItem value="automatic">Automatic</SelectItem>
                <SelectItem value="specific">Specific model…</SelectItem>
              </SelectContent>
            </Select>
            {routing === "specific" && (
              <CompactSelect icon={<Cpu />} value={routingModel} options={modelOptions} onChange={setRoutingModel} label="Model" />
            )}
          </div>

          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="h-8 shrink-0 gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            <Send className="h-3.5 w-3.5" />
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
            <span className="font-mono">{repo}</span> · {branch} · {routing === "automatic" ? "Auto" : routingModel}
          </button>
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="h-9 shrink-0 gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white px-4"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="text-sm">Start</span>
          </Button>
        </div>

        {/* Mobile config sheet */}
        {showMobileConfig && (
          <div className="md:hidden border-t border-border px-3 py-2.5 space-y-2 bg-neutral-50/50">
            <CompactSelect icon={<FolderGit />} value={repo} options={repoOptions} onChange={setRepo} mono label="Repository" />
            <CompactSelect icon={<GitBranch />} value={branch} options={branchOptions} onChange={setBranch} mono label="Branch" />
            <Select value={routing} onValueChange={(v) => setRouting(v as "automatic" | "specific")}>
              <SelectTrigger size="sm" className="h-8 text-xs w-full"><SelectValue placeholder="Routing" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic</SelectItem>
                <SelectItem value="specific">Specific model…</SelectItem>
              </SelectContent>
            </Select>
            {routing === "specific" && (
              <CompactSelect icon={<Cpu />} value={routingModel} options={modelOptions} onChange={setRoutingModel} label="Model" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// RUN THREAD STATE MACHINE
// =============================================================================

type ThreadPhase =
  | "inspecting"
  | "awaiting-approval"
  | "applying"
  | "testing"
  | "verifying"
  | "completed"
  | "failed";

interface ThreadState {
  task: string;
  repo: RepoOption;
  branch: BranchOption;
  routing: "automatic" | "specific";
  routingModel?: ModelOption;
  phase: ThreadPhase;
  planSummary: string;
  approvedPlan?: string;
}

const defaultPlanSummary =
  "The agent plans to update components/Navbar.tsx and styles/navigation.css to correct fixed positioning across desktop and mobile layouts.";

const revisedPlanSummary =
  "The agent will update components/Navbar.tsx and adjust only the desktop rules in styles/navigation.css. Mobile behavior will remain unchanged.";

function buildFixNavbarThread(): ThreadState {
  return {
    task: "Fix the navbar so it remains fixed while scrolling without overlapping the page content.",
    repo: "gnsis/frontend",
    branch: "main",
    routing: "specific",
    routingModel: "Claude Sonnet",
    phase: "completed",
    planSummary: defaultPlanSummary,
    approvedPlan: defaultPlanSummary,
  };
}

function buildGenericThread(run: RecentRun): ThreadState {
  let phase: ThreadPhase;
  if (run.status === "failed") phase = "failed";
  else if (run.status === "running") phase = "inspecting";
  else phase = "completed";

  return {
    task: run.title,
    repo: run.repo,
    branch: "main",
    routing: "specific",
    routingModel: run.model as ModelOption,
    phase,
    planSummary: defaultPlanSummary,
    approvedPlan: phase === "completed" ? defaultPlanSummary : undefined,
  };
}

// =============================================================================
// THREAD SUB-COMPONENTS
// =============================================================================

function ThreadContextRow({ thread }: { thread: ThreadState }) {
  const routingLabel = thread.routing === "automatic"
    ? "Automatic routing"
    : thread.routingModel || "Claude Sonnet";

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground/80 pb-4">
      <span className="font-mono">{thread.repo}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className="font-mono">{thread.branch}</span>
      <span className="text-muted-foreground/40">·</span>
      <span>{routingLabel}</span>
    </div>
  );
}

function TaskMessage({ task }: { task: string }) {
  return (
    <div className="border-b border-border pb-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        Task
      </p>
      <p className="text-sm text-foreground leading-relaxed">{task}</p>
    </div>
  );
}

function AgentInspectingMessage() {
  return (
    <div className="flex items-center gap-2.5 py-4 border-b border-border">
      <Loader2 className="h-4 w-4 text-blue-500 animate-spin motion-reduce:animate-none shrink-0" />
      <p className="text-sm text-muted-foreground">Genesis is inspecting the repository and preparing a plan…</p>
    </div>
  );
}

function AgentInspectedMessage() {
  return (
    <div className="py-4 border-b border-border space-y-1.5">
      <div className="flex items-center gap-2">
        <CircleCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-sm font-semibold text-foreground">Repository inspected</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-6">
        Genesis located the navbar component, reviewed the positioning styles,
        and identified the responsive layout constraints.
      </p>
    </div>
  );
}

function ChangesApprovedMessage({ plan }: { plan?: string }) {
  return (
    <div className="py-3 border-b border-border space-y-1.5">
      <div className="flex items-center gap-2">
        <CircleCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-sm font-semibold text-foreground">Changes approved</p>
      </div>
      {plan && (
        <p className="text-xs text-muted-foreground leading-relaxed pl-6">
          Approved plan: {plan}
        </p>
      )}
    </div>
  );
}

function ApplyingMessage() {
  return (
    <div className="flex items-center gap-2.5 py-4 border-b border-border">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-60 animate-ping motion-reduce:animate-none" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
      </span>
      <p className="text-sm text-muted-foreground">Genesis is applying approved changes…</p>
    </div>
  );
}

function TestingMessage() {
  return (
    <div className="flex items-center gap-2.5 py-4 border-b border-border">
      <Loader2 className="h-4 w-4 text-blue-500 animate-spin motion-reduce:animate-none shrink-0" />
      <p className="text-sm text-muted-foreground">Running tests…</p>
    </div>
  );
}

function VerifyingMessage() {
  return (
    <div className="flex items-center gap-2.5 py-4 border-b border-border">
      <Loader2 className="h-4 w-4 text-blue-500 animate-spin motion-reduce:animate-none shrink-0" />
      <p className="text-sm text-muted-foreground">Genesis is verifying the run…</p>
    </div>
  );
}

function RunCompleteMessage() {
  return (
    <div className="py-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <CircleCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-sm font-semibold text-foreground">Run complete</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-6">
        Navbar positioning was updated across desktop and mobile layouts without
        changing unrelated components.
      </p>
      <p className="text-xs text-muted-foreground pl-6">
        42,180 tokens · {formatUsd(0.46)} spent · 2 files changed · 8 tests passed
      </p>
    </div>
  );
}

function FailedMessage() {
  return (
    <div className="py-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <CircleX className="h-4 w-4 text-red-500 shrink-0" />
        <p className="text-sm font-semibold text-red-600">Run failed</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-6">
        This run failed before changes were applied. Two responsive-layout tests failed.
      </p>
      <p className="text-xs text-muted-foreground pl-6">
        31,260 tokens · {formatUsd(0.34)} spent · 6 passed, 2 failed
      </p>
    </div>
  );
}

function ApprovalBlock({
  planSummary,
  onApply,
  onRevise,
}: {
  planSummary: string;
  onApply: () => void;
  onRevise: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <StatusIndicator status="waiting" />
        <p className="text-sm font-semibold text-foreground">Genesis is ready to make changes</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{planSummary}</p>
      <ul className="text-xs text-muted-foreground space-y-1.5">
        <li className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
          2 files expected to change
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
          No new dependencies planned
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
          Tests will run after implementation
        </li>
      </ul>
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <Button
          size="sm"
          onClick={onApply}
          className="h-8 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white"
        >
          Apply changes
        </Button>
        <Button size="sm" variant="outline" onClick={onRevise} className="h-8 rounded-lg">
          Revise plan
        </Button>
      </div>
    </div>
  );
}

function RevisePlanInput({
  value,
  onChange,
  onUpdate,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onUpdate: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 space-y-2.5">
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tell Genesis what to change about the plan…"
        className="h-9 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") onUpdate();
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onUpdate}
          disabled={value.trim().length === 0}
          className="h-8 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white"
        >
          Update plan
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-8 rounded-lg">
          Cancel
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// RUN THREAD (with approval audit entry)
// =============================================================================

function RunThread({
  thread,
  onThreadChange,
}: {
  thread: ThreadState;
  onThreadChange: (updater: (t: ThreadState) => ThreadState) => void;
}) {
  const [revising, setRevising] = useState(false);
  const [reviseValue, setReviseValue] = useState("");
  const [inspectionResolved, setInspectionResolved] = useState(thread.phase !== "inspecting");

  useEffect(() => {
    setInspectionResolved(thread.phase !== "inspecting");
  }, [thread.task]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;

    if (thread.phase === "inspecting" && !inspectionResolved) {
      t = setTimeout(() => {
        setInspectionResolved(true);
        onThreadChange((x) => ({ ...x, phase: "awaiting-approval" }));
      }, 1600);
    } else if (thread.phase === "applying") {
      t = setTimeout(() => onThreadChange((x) => ({ ...x, phase: "testing" })), 1400);
    } else if (thread.phase === "testing") {
      t = setTimeout(() => onThreadChange((x) => ({ ...x, phase: "verifying" })), 1400);
    } else if (thread.phase === "verifying") {
      t = setTimeout(() => onThreadChange((x) => ({ ...x, phase: "completed" })), 1200);
    }

    return () => { if (t) clearTimeout(t); };
  }, [thread.phase, inspectionResolved]);

  const handleApply = () => {
    onThreadChange((t) => ({
      ...t,
      phase: "applying",
      approvedPlan: t.planSummary,
    }));
  };

  const handleRevise = () => {
    setRevising(true);
    setReviseValue("");
  };

  const handleUpdatePlan = () => {
    onThreadChange((t) => ({ ...t, planSummary: revisedPlanSummary }));
    setRevising(false);
  };

  const handleCancelRevise = () => setRevising(false);

  const showInspecting = thread.phase === "inspecting" && !inspectionResolved;
  const showInspected = thread.phase !== "inspecting" || inspectionResolved;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <ThreadContextRow thread={thread} />
      <TaskMessage task={thread.task} />

      {showInspecting && <AgentInspectingMessage />}

      {showInspected && thread.phase !== "failed" && (
        <>
          <AgentInspectedMessage />

          {thread.phase === "awaiting-approval" && (
            <div className="pt-4">
              {revising ? (
                <RevisePlanInput
                  value={reviseValue}
                  onChange={setReviseValue}
                  onUpdate={handleUpdatePlan}
                  onCancel={handleCancelRevise}
                />
              ) : (
                <ApprovalBlock
                  planSummary={thread.planSummary}
                  onApply={handleApply}
                  onRevise={handleRevise}
                />
              )}
            </div>
          )}

          {thread.phase === "applying" && (
            <>
              <ChangesApprovedMessage plan={thread.approvedPlan} />
              <ApplyingMessage />
            </>
          )}

          {thread.phase === "testing" && (
            <>
              <ChangesApprovedMessage plan={thread.approvedPlan} />
              <TestingMessage />
            </>
          )}

          {thread.phase === "verifying" && (
            <>
              <ChangesApprovedMessage plan={thread.approvedPlan} />
              <VerifyingMessage />
            </>
          )}

          {thread.phase === "completed" && (
            <>
              <ChangesApprovedMessage plan={thread.approvedPlan} />
              <RunCompleteMessage />
            </>
          )}
        </>
      )}

      {thread.phase === "failed" && <FailedMessage />}
    </div>
  );
}

// =============================================================================
// THREAD COMPOSER (sticky, clear status)
// =============================================================================

function ThreadComposer({ phase }: { phase: ThreadPhase }) {
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const isBusy = phase === "applying" || phase === "testing" || phase === "verifying";
  const isCompleted = phase === "completed";

  const placeholder = isCompleted
    ? "Ask for another change…"
    : isBusy
    ? "Genesis is working…"
    : "Send a follow-up to Genesis…";

  const canSend = !isBusy && value.trim().length > 0 && !isSending;

  const handleSend = () => {
    if (!canSend) return;
    setIsSending(true);
    setTimeout(() => {
      setValue("");
      setIsSending(false);
    }, 300);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 pb-4 md:pb-6">
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isBusy}
          placeholder={placeholder}
          className="min-h-16 resize-none border-none shadow-none rounded-none px-4 py-3 text-sm focus-visible:ring-0 disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Divider orientation="horizontal" />
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {isBusy
              ? "Genesis is working…"
              : isCompleted
              ? "This run is complete."
              : "A follow-up will be sent once this run finishes."}
          </span>
          <Button
            size="sm"
            disabled={!canSend}
            onClick={handleSend}
            className="h-7 gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// ACTIVITY DATA
// =============================================================================

type ActivityPhaseId = "understand" | "inspect" | "approval" | "apply" | "test" | "verify";
type ActivityStatus = "pending" | "active" | "awaiting" | "complete" | "failed";

interface ActivityLine {
  label: string;
  value: string;
}

interface ActivityPhaseDef {
  id: ActivityPhaseId;
  title: string;
  summary: string;
  lines: ActivityLine[];
  tokens: number;          // per-phase token count
  cumulativeTokens: number; // running total for receipt compatibility
  cumulativeCost: number;
  duration: string;
}

const activityPhaseDefs: ActivityPhaseDef[] = [
  {
    id: "understand",
    title: "Understand the request",
    summary: "Parsed the user task and identified constraints.",
    lines: [
      { label: "Parse", value: "User task" },
      { label: "Identify", value: "Responsive layout constraints" },
      { label: "Plan", value: "Minimal implementation path" },
    ],
    tokens: 4620,
    cumulativeTokens: 4620,
    cumulativeCost: 0.05,
    duration: "2s",
  },
  {
    id: "inspect",
    title: "Inspect the codebase",
    summary: "Located the navbar component and relevant styling logic.",
    lines: [
      { label: "Read", value: "components/Navbar.tsx" },
      { label: "Read", value: "styles/navigation.css" },
      { label: "Search", value: "Existing fixed-position logic" },
      { label: "Check", value: "Responsive breakpoints" },
    ],
    tokens: 10540,
    cumulativeTokens: 15160,
    cumulativeCost: 0.16,
    duration: "6s",
  },
  {
    id: "approval",
    title: "Await approval",
    summary: "Waiting for user approval before editing files.",
    lines: [
      { label: "Plan", value: "2 files expected to change" },
      { label: "Check", value: "No new dependencies planned" },
      { label: "Wait", value: "User approval required" },
    ],
    tokens: 0,
    cumulativeTokens: 15160,
    cumulativeCost: 0.16,
    duration: "—",
  },
  {
    id: "apply",
    title: "Apply changes",
    summary: "Editing navbar positioning across desktop and mobile.",
    lines: [
      { label: "Edit", value: "components/Navbar.tsx" },
      { label: "Edit", value: "styles/navigation.css" },
      { label: "Check", value: "No unrelated components changed" },
    ],
    tokens: 15870,
    cumulativeTokens: 31030,
    cumulativeCost: 0.34,
    duration: "14s",
  },
  {
    id: "test",
    title: "Test the result",
    summary: "Ran navbar and layout tests to confirm the fix.",
    lines: [
      { label: "Test", value: "navbar.spec.ts" },
      { label: "Test", value: "responsive-layout.spec.ts" },
      { label: "Result", value: "8 passed, 0 failed" },
    ],
    tokens: 6340,
    cumulativeTokens: 37370,
    cumulativeCost: 0.41,
    duration: "8s",
  },
  {
    id: "verify",
    title: "Verify the run",
    summary: "Confirmed all required run checks passed.",
    lines: [
      { label: "Check", value: "Required tests passed" },
      { label: "Check", value: "No new dependencies added" },
      { label: "Check", value: "Scope remained within task" },
    ],
    tokens: 4810,
    cumulativeTokens: 42180,
    cumulativeCost: 0.46,
    duration: "3s",
  },
];

const activityOrder: ActivityPhaseId[] = ["understand", "inspect", "approval", "apply", "test", "verify"];

const phaseIdx: Record<Exclude<ThreadPhase, "failed">, number> = {
  inspecting: 1,
  "awaiting-approval": 2,
  applying: 3,
  testing: 4,
  verifying: 5,
  completed: 6,
};

function computeActivityStatus(id: ActivityPhaseId, threadPhase: ThreadPhase): ActivityStatus {
  const idx = activityOrder.indexOf(id);
  if (threadPhase === "failed") {
    const testIdx = activityOrder.indexOf("test");
    if (id === "test") return "failed";
    return idx < testIdx ? "complete" : "pending";
  }
  const activeIdx = phaseIdx[threadPhase];
  if (activeIdx === 6) return "complete";
  if (idx < activeIdx) return "complete";
  if (idx === activeIdx) return id === "approval" ? "awaiting" : "active";
  return "pending";
}

const activityIcon: Record<ActivityStatus, React.ReactNode> = {
  pending: <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />,
  active: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin motion-reduce:animate-none" />,
  awaiting: (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-60 animate-ping motion-reduce:animate-none" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
    </span>
  ),
  complete: <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />,
  failed: <CircleX className="h-3.5 w-3.5 text-red-500" />,
};

// =============================================================================
// ACTIVITY PHASE ROW (exclusive accordion)
// =============================================================================

function ActivityPhaseRow({
  def,
  status,
  expanded,
  onToggle,
}: {
  def: ActivityPhaseDef;
  status: ActivityStatus;
  expanded: boolean;
  onToggle: () => void;
}) {
  const canExpand = status !== "pending";

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => canExpand && onToggle()}
        disabled={!canExpand}
        className={cn(
          "w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors duration-150",
          canExpand
            ? "hover:bg-black/[0.03] focus-visible:outline-none focus-visible:bg-black/[0.03]"
            : "cursor-default opacity-50"
        )}
      >
        <span className="shrink-0">{activityIcon[status]}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-foreground truncate">
            {def.title}
          </span>
          <span className="block text-xs text-muted-foreground truncate mt-0.5">
            {def.summary}
          </span>
        </span>
        <span className="shrink-0 text-right">
          {status === "complete" && (
            <span className="block text-xs text-muted-foreground font-mono">
              {def.tokens > 0 ? `${def.tokens.toLocaleString()} tok · ` : ""}{def.duration}
            </span>
          )}
          {status === "active" && <span className="block text-xs text-blue-600">In progress…</span>}
          {status === "awaiting" && <span className="block text-xs text-amber-600">Waiting…</span>}
          {status === "failed" && <span className="block text-xs text-red-600">Failed</span>}
        </span>
        {canExpand && (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200 shrink-0",
              expanded && "rotate-90"
            )}
          />
        )}
      </button>
      {expanded && canExpand && (
        <div className="px-4 pb-3 pl-10 space-y-1">
          {def.lines.map((line, i) => (
            <div key={i} className="flex items-baseline gap-2 text-xs">
              <span className="text-muted-foreground/70 w-14 shrink-0">{line.label}</span>
              <span className="font-mono text-foreground/80 truncate">{line.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ACTIVITY PANEL (exclusive accordion, live tokens)
// =============================================================================

function ActivityPanel({ thread }: { thread: ThreadState }) {
  const [expandedId, setExpandedId] = useState<ActivityPhaseId | null>(null);

  const handleToggle = useCallback((id: ActivityPhaseId) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const rows = activityPhaseDefs.map((def) => ({
    def,
    status: computeActivityStatus(def.id, thread.phase),
  }));

  // Compute total tokens from completed phases
  const completeRows = rows.filter((r) => r.status === "complete");
  const last = completeRows[completeRows.length - 1];
  const totalTokens = last ? last.def.cumulativeTokens : 0;
  const totalCost = last ? last.def.cumulativeCost : 0;
  const isComplete = thread.phase === "completed" || thread.phase === "failed";

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="flex-1">
        {rows.map(({ def, status }) => (
          <ActivityPhaseRow
            key={def.id}
            def={def}
            status={status}
            expanded={expandedId === def.id}
            onToggle={() => handleToggle(def.id)}
          />
        ))}
      </div>

      {/* Sticky compute footer */}
      {totalTokens > 0 && (
        <div className="shrink-0 sticky bottom-0 bg-white border-t border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Compute used
            </span>
            <span className="text-sm font-mono text-muted-foreground">
              {totalTokens.toLocaleString()} tokens
            </span>
          </div>
          {isComplete && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatUsd(totalCost)} total run cost
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RECEIPT DATA
// =============================================================================

interface ReceiptPhaseDef {
  id: ActivityPhaseId;
  title: string;
  summary: string;
  tokens: number;
  percent: number;
  duration: string;
  lines: ActivityLine[];
}

const receiptPhases: ReceiptPhaseDef[] = [
  {
    id: "understand",
    title: "Understand the request",
    summary: "Identified layout constraints and expected behavior.",
    tokens: 4600,
    percent: 11,
    duration: "2s",
    lines: [
      { label: "Parse", value: "User task" },
      { label: "Identify", value: "Responsive constraints" },
      { label: "Plan", value: "Minimal implementation path" },
    ],
  },
  {
    id: "inspect",
    title: "Inspect the codebase",
    summary: "Located the navbar and relevant styling logic.",
    tokens: 10500,
    percent: 25,
    duration: "6s",
    lines: [
      { label: "Read", value: "components/Navbar.tsx" },
      { label: "Read", value: "styles/navigation.css" },
      { label: "Search", value: "Existing positioning logic" },
      { label: "Check", value: "Responsive breakpoints" },
    ],
  },
  {
    id: "apply",
    title: "Update navbar",
    summary: "Corrected positioning across desktop and mobile.",
    tokens: 15900,
    percent: 38,
    duration: "14s",
    lines: [
      { label: "Read", value: "components/Navbar.tsx" },
      { label: "Edit", value: "components/Navbar.tsx" },
      { label: "Edit", value: "styles/navigation.css" },
      { label: "Check", value: "No unrelated components changed" },
    ],
  },
  {
    id: "test",
    title: "Test the result",
    summary: "Ran eight tests and checked for regressions.",
    tokens: 6300,
    percent: 15,
    duration: "8s",
    lines: [
      { label: "Test", value: "navbar.spec.ts" },
      { label: "Test", value: "responsive-layout.spec.ts" },
      { label: "Result", value: "8 passed, 0 failed" },
      { label: "Check", value: "No regressions detected" },
    ],
  },
  {
    id: "verify",
    title: "Verify the run",
    summary: "Confirmed all required run checks passed.",
    tokens: 4800,
    percent: 11,
    duration: "3s",
    lines: [
      { label: "Check", value: "No unrelated files changed" },
      { label: "Check", value: "No new dependencies added" },
      { label: "Check", value: "Required tests passed" },
      { label: "Capture", value: "Full execution trace" },
    ],
  },
];

interface ReceiptSummary {
  outcome: string;
  tokens: number;
  cost: number;
  modelCalls: number;
  toolCalls: number;
  filesChanged: number;
  testsPassed: number;
  testsFailed: number;
}

const successReceipt: ReceiptSummary = {
  outcome: "Updated navbar positioning across desktop and mobile layouts without changing unrelated components.",
  tokens: 42180,
  cost: 0.46,
  modelCalls: 6,
  toolCalls: 7,
  filesChanged: 2,
  testsPassed: 8,
  testsFailed: 0,
};

const failedReceipt: ReceiptSummary = {
  outcome: "The navbar update was stopped because two responsive-layout tests failed.",
  tokens: 31260,
  cost: 0.34,
  modelCalls: 5,
  toolCalls: 6,
  filesChanged: 2,
  testsPassed: 6,
  testsFailed: 2,
};

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

// =============================================================================
// RECEIPT PANEL
// =============================================================================

function ReceiptPanel({ thread }: { thread: ThreadState }) {
  const failed = thread.phase === "failed";
  const [expandedId, setExpandedId] = useState<ActivityPhaseId | null>(null);
  const summary = failed ? failedReceipt : successReceipt;

  const displayPhases = receiptPhases.map((p) => {
    if (failed && p.id === "test") {
      return {
        ...p,
        summary: "Two layout tests failed; the run halted before verification.",
        lines: [
          { label: "Test", value: "navbar.spec.ts" },
          { label: "Test", value: "responsive-layout.spec.ts" },
          { label: "Result", value: "6 passed, 2 failed" },
        ],
        rowFailed: true,
      };
    }
    if (failed && p.id === "verify") {
      return {
        ...p,
        summary: "Run halted; verification was not completed.",
        lines: [{ label: "Check", value: "Run halted after failing tests" }],
        rowFailed: false,
      };
    }
    return { ...p, rowFailed: false };
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4 border-b border-border space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Run receipt
        </p>
        <p className="text-sm font-semibold text-foreground">{thread.task}</p>
        <p className="text-xs text-muted-foreground font-mono">
          {thread.routing === "automatic" ? "Automatic" : thread.routingModel || "Claude Sonnet"} · run_8f3ac1e2 · 43s
        </p>
        <div className="flex items-center gap-1.5 pt-1">
          {failed ? (
            <CircleX className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
          )}
          <span className={cn("text-sm font-semibold", failed ? "text-red-600" : "text-emerald-600")}>
            {failed ? "Failed" : "Complete"}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-border space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Outcome
        </p>
        <p className="text-sm text-foreground leading-relaxed">{summary.outcome}</p>
      </div>

      <div className="px-4 py-4 border-b border-border space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <SummaryItem label="Tokens" value={summary.tokens.toLocaleString()} emphasize />
          <SummaryItem label="Spent" value={formatUsd(summary.cost)} emphasize />
          <SummaryItem label="Model calls" value={String(summary.modelCalls)} />
          <SummaryItem label="Tool calls" value={String(summary.toolCalls)} />
          <SummaryItem label="Files changed" value={String(summary.filesChanged)} />
          <SummaryItem
            label="Tests"
            value={failed ? `${summary.testsPassed} passed, ${summary.testsFailed} failed` : `${summary.testsPassed} passed`}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {failed ? (
            <CircleX className="h-3.5 w-3.5 text-red-500 shrink-0" />
          ) : (
            <CircleCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          )}
          <span className="text-xs text-muted-foreground">
            {failed ? "Run checks failed" : "Run checks passed"}
          </span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-1">
        <p className="text-sm font-semibold text-foreground">Token spend by work phase</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {summary.tokens.toLocaleString()} tokens across {receiptPhases.length} work phases
        </p>
      </div>
      <div>
        {displayPhases.map((phase) => (
          <div key={phase.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => setExpandedId((id) => (id === phase.id ? null : phase.id))}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-black/[0.03] transition-colors duration-150 focus-visible:outline-none focus-visible:bg-black/[0.03]"
            >
              {phase.rowFailed ? (
                <CircleX className="h-3.5 w-3.5 text-red-500 shrink-0" />
              ) : (
                <CircleCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-foreground truncate">
                  {phase.title}
                </span>
                <span className="block text-xs text-muted-foreground truncate mt-0.5">
                  {phase.summary}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xs text-muted-foreground font-mono">
                  {(phase.tokens / 1000).toFixed(1)}k · {phase.percent}% · {phase.duration}
                </span>
              </span>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200 shrink-0",
                  expandedId === phase.id && "rotate-90"
                )}
              />
            </button>
            {expandedId === phase.id && (
              <div className="px-4 pb-3 pl-10 space-y-1">
                {phase.lines.map((line, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-xs">
                    <span className="text-muted-foreground/70 w-14 shrink-0">{line.label}</span>
                    <span className="font-mono text-foreground/80 truncate">{line.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
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

function CollapsedRunPanel({ phase }: { phase?: ThreadPhase }) {
  const status: StatusKind = !phase
    ? "idle"
    : phase === "completed"
    ? "completed"
    : phase === "failed"
    ? "failed"
    : phase === "awaiting-approval"
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
  const phase = hasThread ? view.thread.phase : undefined;
  const threadKey = hasThread ? view.threadKey : null;

  const [tab, setTab] = useState<"activity" | "receipt">("activity");
  const prevPhaseRef = useRef<ThreadPhase | null>(null);

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
      prevPhaseRef.current = null;
      setTab("activity");
      activityScrollPos.current = 0;
      receiptScrollPos.current = 0;
      return;
    }
    const initialPhase = view.thread.phase;
    setTab(initialPhase === "completed" || initialPhase === "failed" ? "receipt" : "activity");
    activityScrollPos.current = 0;
    receiptScrollPos.current = 0;
    prevPhaseRef.current = initialPhase;
  }, [threadKey]);

  // Auto-switch to receipt when run completes
  useEffect(() => {
    if (!hasThread) return;
    const phaseNow = view.thread.phase;
    if (prevPhaseRef.current && prevPhaseRef.current !== "completed" && phaseNow === "completed") {
      handleTabChange("receipt");
    }
    prevPhaseRef.current = phaseNow;
  }, [hasThread, phase]);

  const receiptEnabled = phase === "completed" || phase === "failed";
  const hasActivity = hasThread && (phase !== "completed" && phase !== "failed");

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
          <CollapsedRunPanel phase={phase} />
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

const modelOptionsForFilter = ["Claude Sonnet", "Claude Opus", "Claude Haiku", "GPT-4o", "Gemini Pro"] as const;
const sourceOptions = ["Web", "CLI", "API"] as const;

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

const runsColumns = "grid-cols-[1.8fr_1fr_1fr_0.7fr_0.7fr_0.8fr_0.7fr]";

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
      <span className="text-xs text-muted-foreground truncate">{run.model}</span>
      <span className="text-xs text-muted-foreground truncate">{run.source}</span>
      <span className="text-xs"><StatusLabel status={run.status} /></span>
      <span className="text-xs font-mono text-muted-foreground">{run.tokens.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground/70 text-right">{run.status === "running" ? "Now" : run.time}</span>
    </button>
  );
}

function RunsView({ onSelectRun }: { onSelectRun: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [repoFilter, setRepoFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filtered = recentRuns.filter((run) => {
    if (statusFilter !== "all" && run.status !== statusFilter) return false;
    if (repoFilter !== "all" && run.repo !== repoFilter) return false;
    if (modelFilter !== "all" && run.model !== modelFilter) return false;
    if (sourceFilter !== "all" && run.source !== sourceFilter) return false;
    if (
      query.trim().length > 0 &&
      !`${run.title} ${run.repo} ${run.model} ${run.source} ${run.id}`.toLowerCase().includes(query.trim().toLowerCase())
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
          placeholder="Search tasks, repositories, models, or run IDs…"
          className="h-10 max-w-md"
        />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <RunsFilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={["complete", "running", "failed"]} />
        <RunsFilterSelect label="Repository" value={repoFilter} onChange={setRepoFilter} options={repoOptions} />
        <RunsFilterSelect label="Model" value={modelFilter} onChange={setModelFilter} options={modelOptionsForFilter} />
        <RunsFilterSelect label="Source" value={sourceFilter} onChange={setSourceFilter} options={sourceOptions} />
        <RunsFilterSelect label="Date" value={dateFilter} onChange={setDateFilter} options={["Today", "This week", "This month"]} />
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        {filtered.length} {filtered.length === 1 ? "run" : "runs"}
      </p>

      {/* Desktop header */}
      <div className={cn("hidden md:grid gap-3 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", runsColumns)}>
        <span>Task</span>
        <span>Repository</span>
        <span>Model</span>
        <span>Source</span>
        <span>Status</span>
        <span>Tokens</span>
        <span className="text-right">Time</span>
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
                <span className="text-xs text-muted-foreground/70 shrink-0 ml-2">{run.status === "running" ? "Now" : run.time}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{run.repo}</span>
                <span>·</span>
                <span>{run.model}</span>
                <span>·</span>
                <span>{run.source}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">{run.tokens.toLocaleString()} tokens</span>
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
// DASHBOARD VIEW (with empty state, stacked mobile rows)
// =============================================================================

const dashboardColumns = "grid-cols-[1.6fr_1fr_1fr_0.8fr_0.8fr_0.7fr_0.7fr]";

// =============================================================================
// PERIOD SELECTOR
// =============================================================================

type Period = "7d" | "14d" | "30d" | "all";

const periodOptions: { value: Period; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "30d", label: "30D" },
  { value: "all", label: "All" },
];

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-white p-0.5 gap-0.5">
      {periodOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-7 px-3 rounded-md text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            value === opt.value
              ? "bg-black/[0.04] text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// VERIFIED SAVINGS
// =============================================================================

interface SavingsRecord {
  id: string;
  type: "lower-cost-model" | "cached-token" | "retry-reduction" | "reduced-repeated-work";
  runId: string;
  baselineRunId: string;
  baselineModel: string;
  actualModel: string;
  baselineCost: number;
  actualCost: number;
  verifiedSavings: number;
  status: "verified" | "pending";
  timestamp: string;
}

const savingsRecords: SavingsRecord[] = [
  {
    id: "sv-1",
    type: "lower-cost-model",
    runId: "run-2",
    baselineRunId: "bl-1",
    baselineModel: "Claude Opus",
    actualModel: "Claude Sonnet",
    baselineCost: 1.24,
    actualCost: 0.63,
    verifiedSavings: 0.61,
    status: "verified",
    timestamp: "2026-07-10T14:00:00Z",
  },
  {
    id: "sv-2",
    type: "cached-token",
    runId: "run-1",
    baselineRunId: "bl-2",
    baselineModel: "Claude Sonnet",
    actualModel: "Claude Sonnet",
    baselineCost: 0.92,
    actualCost: 0.46,
    verifiedSavings: 0.46,
    status: "verified",
    timestamp: "2026-07-11T10:00:00Z",
  },
  {
    id: "sv-3",
    type: "retry-reduction",
    runId: "run-3",
    baselineRunId: "bl-3",
    baselineModel: "Claude Sonnet",
    actualModel: "Claude Sonnet",
    baselineCost: 0.95,
    actualCost: 0.40,
    verifiedSavings: 0.55,
    status: "verified",
    timestamp: "2026-07-09T09:00:00Z",
  },
  {
    id: "sv-4",
    type: "reduced-repeated-work",
    runId: "run-4",
    baselineRunId: "bl-4",
    baselineModel: "Claude Sonnet",
    actualModel: "Claude Sonnet",
    baselineCost: 0.86,
    actualCost: 0.34,
    verifiedSavings: 0.52,
    status: "verified",
    timestamp: "2026-07-08T16:00:00Z",
  },
];

function isWithinPeriod(timestamp: string, period: Period): boolean {
  if (period === "all") return true;
  const days = period === "7d" ? 7 : period === "14d" ? 14 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(timestamp) >= cutoff;
}

function filterByPeriod<T extends { timestamp: string }>(items: T[], period: Period): T[] {
  return period === "all" ? items : items.filter((i) => isWithinPeriod(i.timestamp, period));
}

function savingsTypeLabel(type: SavingsRecord["type"]): string {
  switch (type) {
    case "lower-cost-model": return "Lower-cost model";
    case "cached-token": return "Cached-token discount";
    case "retry-reduction": return "Retry reduction";
    case "reduced-repeated-work": return "Reduced repeated work";
  }
}

// =============================================================================
// SPEND DATA (for charts)
// =============================================================================

interface DailyTokens {
  date: string;
  label: string;
  tokens: number;
}

const dailyTokenData: DailyTokens[] = [
  { date: "2026-07-08", label: "Jul 8", tokens: 22100 },
  { date: "2026-07-09", label: "Jul 9", tokens: 24500 },
  { date: "2026-07-10", label: "Jul 10", tokens: 58400 },
  { date: "2026-07-11", label: "Jul 11", tokens: 42180 },
  { date: "2026-07-12", label: "Jul 12", tokens: 15200 },
  { date: "2026-07-13", label: "Jul 13", tokens: 18400 },
  { date: "2026-07-14", label: "Jul 14", tokens: 36900 },
];

interface ModelUsage {
  model: string;
  tokens: number;
  runs: number;
}

const modelUsageData: ModelUsage[] = [
  { model: "Claude Sonnet", tokens: 118680, runs: 4 },
  { model: "Claude Opus", tokens: 58400, runs: 1 },
  { model: "Claude Haiku", tokens: 12200, runs: 1 },
  { model: "GPT-4o", tokens: 36900, runs: 1 },
  { model: "Gemini Pro", tokens: 15200, runs: 1 },
];

// =============================================================================
// COST BREAKDOWN
// =============================================================================

interface CostBreakdownItem {
  label: string;
  amount: number;
  runCount: number;
  color: string;
}

const costBreakdownData: CostBreakdownItem[] = [
  { label: "Successful run cost", amount: 5.84, runCount: 3, color: "bg-neutral-600" },
  { label: "Retried-call cost", amount: 0.78, runCount: 2, color: "bg-neutral-400" },
  { label: "Failed-call cost", amount: 0.63, runCount: 1, color: "bg-neutral-400" },
  { label: "Interrupted-run cost", amount: 0.21, runCount: 1, color: "bg-neutral-300" },
  { label: "Cancelled-run cost", amount: 0.08, runCount: 1, color: "bg-neutral-300" },
  { label: "Superseded-attempt cost", amount: 0.06, runCount: 1, color: "bg-neutral-200" },
];

// =============================================================================
// COST BREAKDOWN PANEL
// =============================================================================

function CostBreakdownPanel({
  open,
  onClose,
  onSelectRun,
}: {
  open: boolean;
  onClose: () => void;
  onSelectRun: (id: string) => void;
}) {
  if (!open) return null;

  const totalCost = costBreakdownData.reduce((s, i) => s + i.amount, 0);
  const totalRuns = costBreakdownData.reduce((s, i) => s + i.runCount, 0);
  const maxAmt = Math.max(...costBreakdownData.map((r) => r.amount));

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div
        className={cn(
          "fixed z-50 bg-white shadow-xl overflow-y-auto scrollbar-thin",
          "md:right-0 md:top-0 md:bottom-0 md:w-[400px] md:h-full md:border-l md:border-border",
          "max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:max-h-[85vh] max-md:rounded-t-2xl"
        )}
      >
        <div className="md:hidden flex items-center justify-center py-2">
          <div className="h-1 w-8 rounded-full bg-neutral-300" />
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Close cost breakdown"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-semibold text-foreground">Cost breakdown</p>
            <p className="text-xs text-muted-foreground">July 2026</p>
          </div>
        </div>
        <div className="px-4 py-4 border-b border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total cost</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{formatUsd(totalCost)}</p>
          <p className="text-xs text-muted-foreground mt-1">Across {totalRuns} affected runs</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          {costBreakdownData.map((row) => (
            <button
              key={row.label}
              type="button"
              onClick={() => { onSelectRun("run-1"); onClose(); }}
              className="w-full text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-lg"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground">{row.label}</span>
                <span className="text-sm font-semibold text-foreground">{formatUsd(row.amount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-500", row.color)}
                    style={{ width: `${(row.amount / maxAmt) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {row.runCount} {row.runCount === 1 ? "run" : "runs"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// =============================================================================
// VERIFIED SAVINGS PANEL
// =============================================================================

function VerifiedSavingsPanel({
  open,
  onClose,
  records,
}: {
  open: boolean;
  onClose: () => void;
  records: SavingsRecord[];
}) {
  if (!open) return null;

  const total = records.reduce((s, r) => s + r.verifiedSavings, 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div
        className={cn(
          "fixed z-50 bg-white shadow-xl overflow-y-auto scrollbar-thin",
          "md:right-0 md:top-0 md:bottom-0 md:w-[400px] md:h-full md:border-l md:border-border",
          "max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:max-h-[85vh] max-md:rounded-t-2xl"
        )}
      >
        <div className="md:hidden flex items-center justify-center py-2">
          <div className="h-1 w-8 rounded-full bg-neutral-300" />
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Close verified savings"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-semibold text-foreground">Verified savings</p>
            <p className="text-xs text-muted-foreground">{records.length} verified records</p>
          </div>
        </div>

        <div className="px-4 py-4 border-b border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total verified savings</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">{formatUsd(total)}</p>
        </div>

        <div className="divide-y divide-border">
          {records.map((record) => (
            <div key={record.id} className="px-4 py-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{savingsTypeLabel(record.type)}</span>
                <span className="text-sm font-semibold text-emerald-600">{formatUsd(record.verifiedSavings)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Baseline: {record.baselineModel} at {formatUsd(record.baselineCost)}
              </p>
              <p className="text-xs text-muted-foreground">
                Actual: {record.actualModel} at {formatUsd(record.actualCost)}
              </p>
              <div className="flex items-center gap-1.5 pt-0.5">
                <CircleCheck className="h-3 w-3 text-emerald-600" />
                <span className="text-xs text-emerald-600 font-semibold">Verified</span>
                <span className="text-xs text-muted-foreground">· {record.runId}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// =============================================================================
// TOKENS OVER TIME CHART (monochrome bars)
// =============================================================================

function TokensOverTimeChart({ data }: { data: DailyTokens[] }) {
  const maxTokens = Math.max(...data.map((d) => d.tokens), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tokens over time</p>
      </div>
      <div className="flex items-end gap-1 h-20">
        {data.map((day) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="w-full rounded-sm bg-neutral-300 hover:bg-neutral-400 transition-colors cursor-pointer"
                    style={{ height: `${(day.tokens / maxTokens) * 100}%`, minHeight: 2 }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {day.label}: {day.tokens.toLocaleString()} tokens
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-[10px] text-muted-foreground">{day.label.split(" ")[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MODEL USAGE (horizontal bars, token-based)
// =============================================================================

function ModelUsageChart({ data }: { data: ModelUsage[] }) {
  const maxTokens = Math.max(...data.map((d) => d.tokens), 1);

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Model usage</p>
      <div className="space-y-2.5">
        {data.map((m) => (
          <div key={m.model} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground">{m.model}</span>
              <span className="text-muted-foreground font-mono">{m.tokens.toLocaleString()} tok · {m.runs} {m.runs === 1 ? "run" : "runs"}</span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-neutral-500 transition-[width] duration-500"
                style={{ width: `${(m.tokens / maxTokens) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// GITHUB ONBOARDING CARD
// =============================================================================

type OnboardingState = "not-connected" | "connecting" | "no-runs" | "has-runs";

function GitHubOnboardingCard({
  state,
  onConnect,
  onNewRun,
}: {
  state: OnboardingState;
  onConnect: () => void;
  onNewRun: () => void;
}) {
  if (state === "has-runs") return null;

  const content: Record<Exclude<OnboardingState, "has-runs">, { icon: React.ReactNode; title: string; desc: string; action: { label: string; onClick: () => void } | null }> = {
    "not-connected": {
      icon: <FolderGit className="h-5 w-5 text-muted-foreground/60" />,
      title: "Connect a repository",
      desc: "Link a GitHub repository to start running Genesis on your codebase.",
      action: { label: "Connect repository", onClick: onConnect },
    },
    "connecting": {
      icon: <Loader2 className="h-5 w-5 text-muted-foreground/60 animate-spin motion-reduce:animate-none" />,
      title: "Connecting repository…",
      desc: "We're verifying access to your repository. This takes a few seconds.",
      action: null,
    },
    "no-runs": {
      icon: <CirclePlus className="h-5 w-5 text-muted-foreground/60" />,
      title: "Start your first run",
      desc: "Your repository is connected. Describe a task and Genesis will get to work.",
      action: { label: "New run", onClick: onNewRun },
    },
  };

  const c = content[state];

  return (
    <div className="rounded-xl border border-border bg-white p-5 mb-8">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{c.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{c.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{c.desc}</p>
          {c.action && (
            <Button
              size="sm"
              onClick={c.action.onClick}
              className="h-8 mt-3 gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs"
            >
              {c.action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FINOPS DASHBOARD (with period selector, savings, charts)
// =============================================================================

function DashboardView({
  onSelectRun,
  onNewRun,
}: {
  onSelectRun: (id: string) => void;
  onNewRun: () => void;
}) {
  const [period, setPeriod] = useState<Period>("30d");
  const [costBreakdownOpen, setCostBreakdownOpen] = useState(false);
  const [savingsPanelOpen, setSavingsPanelOpen] = useState(false);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>("not-connected");

  const filteredSavings = filterByPeriod(savingsRecords, period);
  const totalSavings = filteredSavings.reduce((s, r) => s + r.verifiedSavings, 0);
  const hasSavings = filteredSavings.length > 0;
  const hasBaselineEver = savingsRecords.length > 0;

  const filteredDailyTokens = period === "all" ? dailyTokenData : dailyTokenData.filter((d) => isWithinPeriod(d.date + "T00:00:00Z", period));

  // Simulate onboarding flow for demo
  const handleConnectRepo = () => {
    setOnboardingState("connecting");
    setTimeout(() => setOnboardingState("no-runs"), 2000);
  };

  const handleFirstRun = () => {
    setOnboardingState("has-runs");
    onNewRun();
  };

  // Total tokens this period
  const totalTokens = filteredDailyTokens.reduce((s, d) => s + d.tokens, 0);

  return (
    <>
      <div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-10">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Compute usage, verified savings, and balance.</p>
          </div>
          <div className="flex items-center gap-2">
            <PeriodSelector value={period} onChange={setPeriod} />
            <Button
              onClick={onNewRun}
              className="h-8 shrink-0 gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs px-3"
            >
              <CirclePlus className="h-3.5 w-3.5" />
              <span className="hidden md:inline">New run</span>
            </Button>
          </div>
        </div>

        {/* GitHub onboarding card */}
        <GitHubOnboardingCard
          state={onboardingState}
          onConnect={handleConnectRepo}
          onNewRun={handleFirstRun}
        />

        {/* Three primary metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {/* Compute used (tokens) */}
          <div className="rounded-xl border border-border bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Compute used
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalTokens.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">tokens</span></p>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Across {recentRuns.length} runs this period</p>
              <button
                type="button"
                onClick={() => setCostBreakdownOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
              >
                View cost breakdown
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Total compute savings */}
          <div className="rounded-xl border border-border bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-emerald-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Verified savings
              </span>
            </div>
            {hasSavings ? (
              <>
                <p className="text-2xl font-bold text-emerald-600">{formatUsd(totalSavings)}</p>
                <button
                  type="button"
                  onClick={() => setSavingsPanelOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
                >
                  View {filteredSavings.length} verified {filteredSavings.length === 1 ? "record" : "records"}
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </>
            ) : hasBaselineEver ? (
              <>
                <p className="text-2xl font-bold text-foreground">{formatUsd(0)}</p>
                <p className="text-xs text-muted-foreground">No verified savings during this period.</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">\u2014</p>
                <p className="text-xs text-muted-foreground">
                  Savings will appear after Genesis records a comparable baseline.
                </p>
              </>
            )}
          </div>

          {/* Available budget */}
          <div className="rounded-xl border border-border bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground/60" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Available budget
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatUsd(12.40)}</p>
            <p className="text-xs text-muted-foreground">Credits do not expire</p>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <TokensOverTimeChart data={filteredDailyTokens} />
          <ModelUsageChart data={modelUsageData} />
        </div>

        {/* Recent runs (supporting, token-focused) */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Recent runs</p>
          <div className={cn("hidden md:grid gap-3 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", dashboardColumns)}>
            <span>Run</span>
            <span>Repository</span>
            <span>Model</span>
            <span>Status</span>
            <span>Tokens</span>
            <span>Source</span>
            <span className="text-right">Time</span>
          </div>
          <div className="hidden md:block border-t border-border">
            {recentRuns.map((run) => (
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
                <span className="text-xs text-muted-foreground truncate">{run.model}</span>
                <span className="text-xs"><StatusLabel status={run.status} /></span>
                <span className="text-xs font-mono text-muted-foreground">{run.tokens.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">{run.source}</span>
                <span className="text-xs text-muted-foreground/70 text-right">{run.status === "running" ? "Now" : run.time}</span>
              </button>
            ))}
          </div>
          <div className="md:hidden space-y-2 mt-2">
            {recentRuns.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelectRun(run.id)}
                className="w-full rounded-lg border border-border bg-white p-3 text-left space-y-1.5 hover:bg-black/[0.02] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground font-semibold truncate">{run.title}</span>
                  <span className="text-xs text-muted-foreground/70 shrink-0 ml-2">{run.status === "running" ? "Now" : run.time}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{run.repo}</span>
                  <span>\u00b7</span>
                  <span>{run.model}</span>
                  <span>\u00b7</span>
                  <StatusLabel status={run.status} />
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                  <span>{formatTokensK(run.tokens)} tokens</span>
                  <span>{run.source}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overlays */}
      <CostBreakdownPanel open={costBreakdownOpen} onClose={() => setCostBreakdownOpen(false)} onSelectRun={onSelectRun} />
      <VerifiedSavingsPanel open={savingsPanelOpen} onClose={() => setSavingsPanelOpen(false)} records={filteredSavings} />
    </>
  );
}

// =============================================================================
// WORKSPACE REGION
// =============================================================================

function WorkspaceRegion({
  view,
  onSubmit,
  onThreadChange,
  onSelectRun,
  onNewRun,
  onSettingsBack,
  onBillingBack,
}: {
  view: WorkspaceView;
  onSubmit: (prompt: string, selection: ComposerSelection) => void;
  onThreadChange: (updater: (t: ThreadState) => ThreadState) => void;
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
              onThreadChange={onThreadChange}
            />
          </div>
          <ThreadComposer phase={view.thread.phase} />
        </>
      )}

      {view.kind === "runs" && (
        <div className="flex-1 overflow-y-auto">
          <RunsView onSelectRun={onSelectRun} />
        </div>
      )}

      {view.kind === "dashboard" && (
        <div className="flex-1 overflow-y-auto">
          <DashboardView onSelectRun={onSelectRun} onNewRun={onNewRun} />
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

function GNSISWorkspacePreview() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [runPanelCollapsed, setRunPanelCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const [activeNav, setActiveNav] = useState<NavId>("new-run");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [view, setView] = useState<WorkspaceView>({ kind: "composer" });

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);
  const toggleRunPanel = () => setRunPanelCollapsed((v) => !v);

  const handleNavSelect = (id: NavId) => {
    setActiveNav(id);
    setActiveRunId(null);
    if (id === "new-run") setView({ kind: "composer" });
    else if (id === "runs") setView({ kind: "runs" });
    else if (id === "dashboard") setView({ kind: "dashboard" });
  };

  const handleRunSelect = (runId: string) => {
    setActiveRunId(runId);
    const run = recentRuns.find((r) => r.id === runId);
    if (!run) return;
    const thread = run.id === "run-1" ? buildFixNavbarThread() : buildGenericThread(run);
    setView({ kind: "thread", thread, threadKey: runId });
  };

  const handleComposerSubmit = (prompt: string, selection: ComposerSelection) => {
    setActiveRunId(null);
    const thread: ThreadState = {
      task: prompt,
      repo: selection.repo,
      branch: selection.branch,
      routing: selection.routing,
      routingModel: selection.routingModel,
      phase: "inspecting",
      planSummary: defaultPlanSummary,
    };
    setView({ kind: "thread", thread, threadKey: `new-${Date.now()}` });
  };

  const handleThreadChange = (updater: (t: ThreadState) => ThreadState) => {
    setView((prev) => {
      if (prev.kind !== "thread") return prev;
      return { ...prev, thread: updater(prev.thread) };
    });
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
            onSubmit={handleComposerSubmit}
            onThreadChange={handleThreadChange}
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
