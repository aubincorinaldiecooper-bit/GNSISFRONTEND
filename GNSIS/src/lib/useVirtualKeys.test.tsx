import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock the network + config layers; keySecrets stays real so we can assert it.
vi.mock("@/lib/env", () => ({ isApiConfigured: () => true }));

const createKey = vi.fn();
const listKeys = vi.fn();
const rotateKey = vi.fn();
const disableKey = vi.fn();
vi.mock("@/lib/api", () => ({
  createKey: (...a: unknown[]) => createKey(...a),
  listKeys: (...a: unknown[]) => listKeys(...a),
  rotateKey: (...a: unknown[]) => rotateKey(...a),
  disableKey: (...a: unknown[]) => disableKey(...a),
  ApiError: class ApiError extends Error {},
}));

import { useVirtualKeys } from "@/lib/useVirtualKeys";
import { getSecret, hasSecret, clearAllSecrets } from "@/lib/keySecrets";

beforeEach(() => {
  vi.clearAllMocks();
  clearAllSecrets();
  listKeys.mockResolvedValue({ items: [] });
});

describe("useVirtualKeys", () => {
  it("creates a canonical key, remembers its secret once, and reloads", async () => {
    createKey.mockResolvedValue({
      key: "gns_test_secretvalue",
      virtual_key: { id: "vk1", status: "active", mode: "test", name: "t" },
      warning: "",
    });
    const { result } = renderHook(() => useVirtualKeys());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ name: "Frontend integration test", mode: "test" });
    });

    expect(createKey).toHaveBeenCalledTimes(1);
    expect(createKey).toHaveBeenCalledWith({ name: "Frontend integration test", mode: "test" });
    expect(getSecret("vk1")).toBe("gns_test_secretvalue");
    expect(listKeys).toHaveBeenCalledTimes(2); // initial load + reload after create
  });

  it("prevents a duplicate concurrent create submission", async () => {
    let resolveCreate: (() => void) | undefined;
    createKey.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = () =>
            resolve({ key: "s", virtual_key: { id: "vk2", status: "active" }, warning: "" });
        }),
    );
    const { result } = renderHook(() => useVirtualKeys());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const p1 = result.current.create({ name: "a", mode: "test" });
      const p2 = result.current.create({ name: "b", mode: "test" }); // must be ignored
      resolveCreate!();
      await Promise.all([p1, p2]);
    });

    expect(createKey).toHaveBeenCalledTimes(1);
  });

  it("disable forgets the secret; a disabled key disappears once the backend list excludes it", async () => {
    // The backend (not the frontend) is the source of truth for "active
    // only" — the hook just re-renders with whatever reload() returns.
    listKeys.mockResolvedValueOnce({
      items: [{ id: "vk1", status: "active", mode: "test", name: "prod" }],
    });
    const { result } = renderHook(() => useVirtualKeys());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.keys).toHaveLength(1);

    const { rememberSecret } = await import("@/lib/keySecrets");
    rememberSecret("vk1", "gns_test_secretvalue");

    disableKey.mockResolvedValue(undefined);
    listKeys.mockResolvedValueOnce({ items: [] }); // backend now omits the disabled key

    await act(async () => {
      await result.current.disable("vk1");
    });

    expect(disableKey).toHaveBeenCalledWith("vk1");
    expect(hasSecret("vk1")).toBe(false);
    expect(result.current.keys).toHaveLength(0);
  });

  it("prevents a duplicate concurrent disable submission", async () => {
    listKeys.mockResolvedValueOnce({ items: [{ id: "vk1", status: "active" }] });
    let resolveDisable: (() => void) | undefined;
    disableKey.mockImplementation(
      () => new Promise<void>((resolve) => { resolveDisable = resolve; }),
    );
    const { result } = renderHook(() => useVirtualKeys());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const p1 = result.current.disable("vk1");
      const p2 = result.current.disable("vk1"); // must be ignored
      resolveDisable!();
      await Promise.all([p1, p2]);
    });

    expect(disableKey).toHaveBeenCalledTimes(1);
  });

  it("rotate forgets the old secret and remembers the new one", async () => {
    rotateKey.mockResolvedValue({
      key: "gns_test_newsecret",
      virtual_key: { id: "vk_new", status: "active" },
      warning: "",
    });
    const { result } = renderHook(() => useVirtualKeys());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // pretend the old key still had a secret in memory
    const { rememberSecret } = await import("@/lib/keySecrets");
    rememberSecret("vk_old", "gns_test_oldsecret");

    await act(async () => {
      await result.current.rotate("vk_old");
    });

    expect(hasSecret("vk_old")).toBe(false);
    expect(getSecret("vk_new")).toBe("gns_test_newsecret");
  });
});
