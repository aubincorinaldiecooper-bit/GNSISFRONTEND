import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

// A rejecting remote sign-out is the case under test.
const signOutMock = vi.fn();
vi.mock("@/lib/authClient", () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: "u1", email: "a@b.c", name: "A" } }, isPending: false }),
    signIn: { social: vi.fn() },
    signOut: (...a: unknown[]) => signOutMock(...a),
  },
}));

const clearBackendToken = vi.fn();
vi.mock("@/lib/authToken", () => ({
  clearBackendToken: () => clearBackendToken(),
  onUnauthorized: () => () => {},
}));

const clearAllSecrets = vi.fn();
vi.mock("@/lib/keySecrets", () => ({ clearAllSecrets: () => clearAllSecrets() }));

vi.mock("@/lib/env", () => ({ isAuthConfigured: () => true }));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  getMe: vi.fn().mockResolvedValue({
    user: { id: "u1", email: "a@b.c", name: "A", avatar_url: null },
    workspace: { id: "w1", name: "Personal" },
    github: { connected: false, installation_count: 0, repository_count: 0 },
  }),
}));

import { SessionProvider, useSession } from "@/lib/session";

function Capture({ onReady }: { onReady: (fn: () => Promise<void>) => void }) {
  const { signOut } = useSession();
  onReady(signOut);
  return null;
}

describe("SessionProvider signOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves even when the remote sign-out rejects, and still clears token + secrets", async () => {
    signOutMock.mockRejectedValue(new Error("network/CORS failure"));
    let signOut: (() => Promise<void>) | null = null;
    render(
      <SessionProvider>
        <Capture onReady={(fn) => (signOut = fn)} />
      </SessionProvider>,
    );
    await waitFor(() => expect(signOut).not.toBeNull());

    // Must NOT reject (the sole caller does `void signOut()` with no handler).
    await expect(signOut!()).resolves.toBeUndefined();
    expect(signOutMock).toHaveBeenCalled();
    // Secrets + token are cleared on both the pre- and post-round-trip passes.
    expect(clearAllSecrets).toHaveBeenCalled();
    expect(clearBackendToken).toHaveBeenCalled();
  });

  it("also resolves on the success path", async () => {
    signOutMock.mockResolvedValue(undefined);
    let signOut: (() => Promise<void>) | null = null;
    render(
      <SessionProvider>
        <Capture onReady={(fn) => (signOut = fn)} />
      </SessionProvider>,
    );
    await waitFor(() => expect(signOut).not.toBeNull());
    await expect(signOut!()).resolves.toBeUndefined();
  });
});
