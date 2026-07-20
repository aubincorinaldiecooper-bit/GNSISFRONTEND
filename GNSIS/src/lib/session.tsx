// Session state for the app: combines the Better Auth identity session with the
// backend's `/v1/me` (workspace + GitHub connection), and exposes sign-in /
// sign-out plus the connection sub-states the UI needs to tell the truth about
// what's actually reachable.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authClient, type SessionUser } from "./authClient";
import { clearBackendToken, onUnauthorized } from "./authToken";
import { clearAllSecrets } from "./keySecrets";
import { ApiError, getMe, type MePayload } from "./api";
import { isAuthConfigured } from "./env";

/** Identity session state (driven by Better Auth). */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/** Result of probing the backend `/v1/me` with the session's JWT. */
export type BackendState =
  | "idle" // no session yet
  | "checking" // request in flight
  | "ok" // backend accepted the session
  | "unauthorized" // backend rejected the JWT (session not accepted / expired)
  | "unavailable"; // backend unreachable / errored

interface SessionContextValue {
  status: AuthStatus;
  authConfigured: boolean;
  authUser: SessionUser | null;
  me: MePayload | null;
  backendState: BackendState;
  signInGitHub: (callbackPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function mapUser(raw: unknown): SessionUser | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  if (typeof u.id !== "string") return null;
  return {
    id: u.id,
    email: (u.email as string | undefined) ?? null,
    name: (u.name as string | undefined) ?? null,
    image: (u.image as string | undefined) ?? null,
    githubLogin: (u.githubLogin as string | undefined) ?? null,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const authConfigured = isAuthConfigured();
  // Better Auth's session hook. When auth isn't configured the client still
  // returns a (null, not-pending) session so the app resolves to the login page.
  const sessionQuery = authClient.useSession();
  const rawSession = sessionQuery.data as { user?: unknown } | null;
  const isPending = sessionQuery.isPending;

  const authUser = useMemo(() => mapUser(rawSession?.user), [rawSession]);
  const status: AuthStatus = isPending ? "loading" : authUser ? "authenticated" : "unauthenticated";

  const [me, setMe] = useState<MePayload | null>(null);
  const [backendState, setBackendState] = useState<BackendState>("idle");

  const refreshMe = useCallback(async () => {
    if (!authUser) {
      setMe(null);
      setBackendState("idle");
      return;
    }
    setBackendState("checking");
    try {
      const payload = await getMe();
      setMe(payload);
      setBackendState("ok");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setBackendState("unauthorized");
      else setBackendState("unavailable");
    }
  }, [authUser]);

  useEffect(() => {
    // refreshMe only sets state after resolving the async probe (or synchronously
    // flips to "checking") — an intentional load-on-mount, not a render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshMe();
  }, [refreshMe]);

  // A retried backend request that still 401s means the session is no longer
  // accepted — reflect that rather than showing stale "connected" data.
  useEffect(() => onUnauthorized(() => setBackendState("unauthorized")), []);

  const signInGitHub = useCallback(async (callbackPath = "/") => {
    const origin = window.location.origin;
    await authClient.signIn.social({
      provider: "github",
      callbackURL: `${origin}${callbackPath}`,
      errorCallbackURL: `${origin}/login?error=oauth`,
    });
  }, []);

  const signOut = useCallback(async () => {
    // Wipe every client-held secret BEFORE the network round-trip, so nothing
    // lingers even if sign-out is slow or fails.
    clearAllSecrets();
    clearBackendToken();
    setMe(null);
    setBackendState("idle");
    try {
      await authClient.signOut();
    } catch {
      // Even if the sign-out call fails, local state + secrets are already gone.
    }
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ status, authConfigured, authUser, me, backendState, signInGitHub, signOut, refreshMe }),
    [status, authConfigured, authUser, me, backendState, signInGitHub, signOut, refreshMe],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook co-located with its provider
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
