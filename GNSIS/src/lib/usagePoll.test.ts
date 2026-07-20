import { describe, it, expect, vi } from "vitest";

import { pollForMatch } from "@/lib/usagePoll";

const instantSleep = () => Promise.resolve();

describe("pollForMatch", () => {
  it("returns the first matching item within the budget", async () => {
    let call = 0;
    const fetchItems = vi.fn(async () => {
      call += 1;
      return call >= 2 ? [{ id: "a" }, { id: "target" }] : [{ id: "a" }];
    });
    const found = await pollForMatch<{ id: string }>({
      fetchItems,
      match: (i) => i.id === "target",
      budgetMs: 10000,
      intervalMs: 2000,
      sleep: instantSleep,
    });
    expect(found).toEqual({ id: "target" });
    expect(fetchItems).toHaveBeenCalledTimes(2);
  });

  it("returns null when the budget is exhausted (timeout)", async () => {
    const fetchItems = vi.fn(async () => [{ id: "x" }]);
    const found = await pollForMatch<{ id: string }>({
      fetchItems,
      match: () => false,
      budgetMs: 6000,
      intervalMs: 2000,
      sleep: instantSleep,
    });
    expect(found).toBeNull();
    expect(fetchItems).toHaveBeenCalledTimes(3); // 6000 / 2000
  });

  it("stops immediately when cancelled", async () => {
    const fetchItems = vi.fn(async () => []);
    const found = await pollForMatch<{ id: string }>({
      fetchItems,
      match: () => true,
      budgetMs: 10000,
      intervalMs: 2000,
      sleep: instantSleep,
      isCancelled: () => true,
    });
    expect(found).toBeNull();
    expect(fetchItems).not.toHaveBeenCalled();
  });

  it("keeps polling through a transient fetch error", async () => {
    let call = 0;
    const fetchItems = vi.fn(async () => {
      call += 1;
      if (call === 1) throw new Error("transient");
      return [{ id: "target" }];
    });
    const found = await pollForMatch<{ id: string }>({
      fetchItems,
      match: (i) => i.id === "target",
      budgetMs: 10000,
      intervalMs: 2000,
      sleep: instantSleep,
    });
    expect(found).toEqual({ id: "target" });
  });
});
