import { describe, it, expect, vi } from "vitest";

import { onUnauthorized, emitUnauthorized } from "@/lib/authToken";

describe("authToken unauthorized bus (session expiry signal)", () => {
  it("notifies listeners and can unsubscribe", () => {
    const cb = vi.fn();
    const off = onUnauthorized(cb);
    emitUnauthorized();
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    emitUnauthorized();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("keeps notifying other listeners if one throws", () => {
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    const off1 = onUnauthorized(bad);
    const off2 = onUnauthorized(good);
    expect(() => emitUnauthorized()).not.toThrow();
    expect(good).toHaveBeenCalled();
    off1();
    off2();
  });
});
