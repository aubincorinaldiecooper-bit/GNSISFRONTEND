// A compact, searchable, READ-ONLY repository list used by Settings'
// "Connected repositories" section. Shows only full_name, a private
// indicator, and the default branch — never an installation ID or the
// internal repository row ID.
//
// GitHub App access itself IS the permission, so there is no per-repo
// enable/disable toggle to drive from this surface. Changing which
// repositories are available is done through GitHub via the "Manage
// GitHub access" action.

import { AlertCircle, FolderGit, Github, Loader2, Lock, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { githubAppSlug } from "@/lib/env";
import type { RepositoryPickerApi } from "@/lib/useRepositoryPicker";

export default function RepositoryPicker({
  picker,
  emptyTitle = "No repositories are available.",
  emptySubtitle,
  showManageLink = false,
}: {
  picker: RepositoryPickerApi;
  emptyTitle?: string;
  emptySubtitle?: string;
  showManageLink?: boolean;
}) {
  const { repos, query, setQuery, loading, loadingMore, error, hasMore, loadMore } = picker;
  const slug = githubAppSlug();
  const manageLink = slug ? `https://github.com/apps/${slug}/installations/new` : null;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search repositories…"
          aria-label="Search repositories"
          className="h-8 w-full rounded-lg border border-border bg-transparent pl-8 pr-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading repositories…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && repos.length === 0 && (
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              {query ? "No repositories match your search." : emptyTitle}
            </span>
          </div>
          {!query && emptySubtitle && <p className="text-xs text-muted-foreground">{emptySubtitle}</p>}
          {!query && manageLink && (
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <a href={manageLink} target="_blank" rel="noreferrer">
                <Github className="h-3.5 w-3.5" />
                Manage GitHub access
              </a>
            </Button>
          )}
        </div>
      )}

      {!loading && repos.length > 0 && (
        <div className="divide-y divide-border">
          {repos.map((repo) => (
            <div key={repo.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <FolderGit className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-mono text-sm text-foreground">{repo.full_name}</span>
                    {repo.private && (
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Private repository" />
                    )}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{repo.default_branch}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <div className="pt-1 text-center">
          <Button
            size="sm"
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            className="h-7 gap-1.5 text-xs"
          >
            {loadingMore && <Loader2 className="h-3 w-3 animate-spin" />}
            Load more
          </Button>
        </div>
      )}

      {showManageLink && manageLink && repos.length > 0 && (
        <p className="pt-2">
          <a
            href={manageLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground underline decoration-dotted hover:text-foreground"
          >
            Manage GitHub access
          </a>
        </p>
      )}
    </div>
  );
}
