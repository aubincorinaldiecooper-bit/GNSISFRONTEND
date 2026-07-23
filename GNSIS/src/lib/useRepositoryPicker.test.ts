import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const listRepositories = vi.fn();
vi.mock("@/lib/api", () => ({
  listRepositories: (...a: unknown[]) => listRepositories(...a),
  ApiError: class ApiError extends Error {},
}));

import { useRepositoryPicker } from "@/lib/useRepositoryPicker";
import type { RepositoryRecord } from "@/lib/api";

function repo(overrides: Partial<RepositoryRecord> = {}): RepositoryRecord {
  return {
    id: "repo-1",
    github_repository_id: 1,
    owner: "owner",
    name: "repo",
    full_name: "owner/repo",
    default_branch: "main",
    private: true,
    enabled: true,
    archived: false,
    ...overrides,
  };
}

function page(n: number, offset = 0): RepositoryRecord[] {
  return Array.from({ length: n }, (_, i) =>
    repo({ id: `repo-${offset + i}`, full_name: `owner/repo-${offset + i}` }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listRepositories.mockResolvedValue([]);
});

describe("useRepositoryPicker", () => {
  it("loads the first page on mount, requesting only the currently accessible repos", async () => {
    listRepositories.mockResolvedValue([repo()]);
    const { result } = renderHook(() => useRepositoryPicker());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // No enabledOnly parameter — GitHub App access is the permission.
    expect(listRepositories).toHaveBeenCalledWith({ q: "", limit: 30, offset: 0 });
    expect(result.current.repos).toEqual([repo()]);
  });

  it("debounces search input and refetches from the top", async () => {
    const { result } = renderHook(() => useRepositoryPicker());
    await waitFor(() => expect(result.current.loading).toBe(false));
    listRepositories.mockClear();
    listRepositories.mockResolvedValue([repo({ full_name: "owner/found" })]);

    act(() => result.current.setQuery("found"));

    // Nothing fired synchronously — the 250ms debounce hasn't elapsed.
    expect(listRepositories).not.toHaveBeenCalled();

    await waitFor(() => expect(listRepositories).toHaveBeenCalledWith({
      q: "found", limit: 30, offset: 0,
    }));
    await waitFor(() => expect(result.current.repos).toEqual([repo({ full_name: "owner/found" })]));
  });

  it("discards a stale response when a newer search supersedes it", async () => {
    const { result } = renderHook(() => useRepositoryPicker());
    await waitFor(() => expect(result.current.loading).toBe(false));
    listRepositories.mockClear();

    let resolveSlow: (v: RepositoryRecord[]) => void = () => {};
    listRepositories.mockImplementationOnce(
      () => new Promise((resolve) => { resolveSlow = resolve; }),
    );
    act(() => result.current.setQuery("slow"));
    await waitFor(() => expect(listRepositories).toHaveBeenCalledTimes(1));

    listRepositories.mockResolvedValueOnce([repo({ full_name: "owner/fast" })]);
    act(() => result.current.setQuery("slow-then-fast"));
    await waitFor(() => expect(listRepositories).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.repos).toEqual([repo({ full_name: "owner/fast" })]));

    // The slow, superseded request resolving afterwards must not clobber it.
    resolveSlow([repo({ full_name: "owner/should-not-appear" })]);
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.repos).toEqual([repo({ full_name: "owner/fast" })]);
  });

  it("does not expose any toggle / mutation surface — the hook is read-only", () => {
    const { result } = renderHook(() => useRepositoryPicker());
    // GitHub App access is the permission surface; there is no per-repo
    // enable/disable toggle to drive from the frontend.
    expect((result.current as Record<string, unknown>).toggle).toBeUndefined();
    expect((result.current as Record<string, unknown>).mutatingId).toBeUndefined();
  });

  it("loadMore appends the next page and stops once a short page arrives", async () => {
    listRepositories.mockResolvedValueOnce(page(30, 0));
    const { result } = renderHook(() => useRepositoryPicker());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasMore).toBe(true);
    expect(result.current.repos).toHaveLength(30);

    listRepositories.mockResolvedValueOnce(page(5, 30));
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.loadingMore).toBe(false));
    expect(listRepositories).toHaveBeenLastCalledWith({ q: "", limit: 30, offset: 30 });
    expect(result.current.repos).toHaveLength(35);
    expect(result.current.hasMore).toBe(false);
  });
});
