// Shared state for a searchable, paginated, toggleable repository list — used
// by Settings' "Connected repositories" and the first-connection selection
// step. Search + pagination are server-side (GET /v1/repositories?q=&limit=&
// offset=); toggling optimistically updates the row and reverts on failure.

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, listRepositories, setRepositoryEnabled, type RepositoryRecord } from "./api";

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 250;

export interface RepositoryPickerApi {
  repos: RepositoryRecord[];
  query: string;
  setQuery: (q: string) => void;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  mutatingId: string | null;
  toggle: (id: string, enabled: boolean) => Promise<void>;
  reload: () => void;
}

export function useRepositoryPicker(enabledOnly = false): RepositoryPickerApi {
  const [repos, setRepos] = useState<RepositoryRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  // Discards a stale response if a newer search superseded it.
  const requestId = useRef(0);

  const fetchPage = useCallback(
    async (q: string, offset: number, append: boolean) => {
      const id = ++requestId.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const page = await listRepositories({ enabledOnly, q, limit: PAGE_SIZE, offset });
        if (id !== requestId.current) return;
        setRepos((prev) => (append ? [...prev, ...page] : page));
        setHasMore(page.length === PAGE_SIZE);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof ApiError ? err.message : "Could not load repositories.");
      } finally {
        if (id === requestId.current) {
          if (append) setLoadingMore(false);
          else setLoading(false);
        }
      }
    },
    [enabledOnly],
  );

  useEffect(() => {
    const t = setTimeout(() => void fetchPage(query, 0, false), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    void fetchPage(query, repos.length, true);
  }, [fetchPage, query, repos.length, hasMore, loadingMore]);

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      setMutatingId(id);
      setError(null);
      const previous = repos;
      // Immediate feedback: flip the row before the request resolves.
      setRepos((rs) => rs.map((r) => (r.id === id ? { ...r, enabled } : r)));
      try {
        await setRepositoryEnabled(id, enabled);
      } catch (err) {
        setRepos(previous); // revert on failure
        setError(err instanceof ApiError ? err.message : "Could not update the repository.");
      } finally {
        setMutatingId(null);
      }
    },
    [repos],
  );

  const reload = useCallback(() => void fetchPage(query, 0, false), [fetchPage, query]);

  return { repos, query, setQuery, loading, loadingMore, error, hasMore, loadMore, mutatingId, toggle, reload };
}
