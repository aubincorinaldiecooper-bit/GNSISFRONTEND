// A small, deterministic bounded poller. Extracted so the "found within budget"
// and "timed out" paths are unit-testable without real timers.

export interface PollOptions<T> {
  fetchItems: () => Promise<T[]>;
  match: (item: T) => boolean;
  budgetMs?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  isCancelled?: () => boolean;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Poll `fetchItems` up to `budgetMs / intervalMs` times, returning the first
 * matching item, or null if the budget is exhausted / cancelled. Deterministic
 * in the number of attempts so tests can inject an instant `sleep`.
 */
export async function pollForMatch<T>({
  fetchItems,
  match,
  budgetMs = 30000,
  intervalMs = 2000,
  sleep = defaultSleep,
  isCancelled = () => false,
}: PollOptions<T>): Promise<T | null> {
  const maxAttempts = Math.max(1, Math.floor(budgetMs / intervalMs));
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (isCancelled()) return null;
    try {
      const items = await fetchItems();
      const found = items.find(match);
      if (found) return found;
    } catch {
      // transient error — keep trying within the budget
    }
    if (attempt < maxAttempts - 1) await sleep(intervalMs);
  }
  return null;
}
