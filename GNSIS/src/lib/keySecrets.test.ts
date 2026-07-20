import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  rememberSecret,
  getSecret,
  hasSecret,
  forgetSecret,
  clearAllSecrets,
  subscribeSecrets,
  _secretCount,
} from "@/lib/keySecrets";

describe("keySecrets (in-memory only)", () => {
  beforeEach(() => clearAllSecrets());

  it("remembers and returns a secret", () => {
    rememberSecret("k1", "gns_test_abc");
    expect(getSecret("k1")).toBe("gns_test_abc");
    expect(hasSecret("k1")).toBe(true);
  });

  it("forgets one secret and clears all", () => {
    rememberSecret("k1", "s1");
    rememberSecret("k2", "s2");
    forgetSecret("k1");
    expect(getSecret("k1")).toBeNull();
    expect(_secretCount()).toBe(1);
    clearAllSecrets();
    expect(_secretCount()).toBe(0);
  });

  it("never writes secrets to localStorage / sessionStorage", () => {
    const localSet = vi.spyOn(Storage.prototype, "setItem");
    rememberSecret("k1", "gns_test_super_secret_value");
    forgetSecret("k1");
    clearAllSecrets();
    expect(localSet).not.toHaveBeenCalled();
    expect(JSON.stringify(window.localStorage)).not.toContain("gns_test_super_secret_value");
    expect(JSON.stringify(window.sessionStorage)).not.toContain("gns_test_super_secret_value");
  });

  it("notifies subscribers and supports unsubscribe", () => {
    const cb = vi.fn();
    const unsub = subscribeSecrets(cb);
    rememberSecret("k1", "s");
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    forgetSecret("k1");
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
