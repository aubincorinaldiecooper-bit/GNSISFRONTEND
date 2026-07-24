// /login — GitHub sign-in using the existing GNSIS visual language.
//
// States handled explicitly:
//   - session loading (are we already signed in?)
//   - redirecting (handoff to GitHub)
//   - authentication failure (?error=oauth came back)
//   - backend-session failure (signed in, but the backend rejected the session)

import { useEffect, useState } from "react";
import { AlertTriangle, Github, Loader2, Terminal } from "lucide-react";
import { Navigate, useLocation, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { isApiConfigured, isAuthConfigured } from "@/lib/env";

// The New Run composer is the app's landing spot after sign-in — the public
// marketing homepage lives at "/", so signing in must not drop the user there.
const DEFAULT_SIGNED_IN_PATH = "/new";

function safeNext(raw: string | null): string {
  // Only allow same-app relative paths — never an absolute URL (open-redirect).
  if (!raw) return DEFAULT_SIGNED_IN_PATH;
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {
    // fall through
  }
  return DEFAULT_SIGNED_IN_PATH;
}

export default function LoginPage() {
  const { status, backendState, signInGitHub, refreshMe } = useSession();
  const [params] = useSearchParams();
  const location = useLocation();
  const next = safeNext(params.get("next"));
  const oauthError = params.get("error");

  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(
    oauthError ? "GitHub sign-in didn't complete. Please try again." : null,
  );

  const authConfigured = isAuthConfigured();
  const apiConfigured = isApiConfigured();

  // Already signed in AND the backend accepts us → into the app.
  useEffect(() => {
    // nothing to do here; redirect handled below via <Navigate>
  }, [location]);

  if (status === "authenticated" && backendState !== "unauthorized" && backendState !== "unavailable") {
    return <Navigate to={next} replace />;
  }

  const startSignIn = async () => {
    setError(null);
    setRedirecting(true);
    try {
      await signInGitHub(next);
      // Better Auth performs a full-page redirect to GitHub; if we're still
      // here after a beat, surface that the handoff didn't happen.
      setTimeout(() => setRedirecting(false), 6000);
    } catch {
      setRedirecting(false);
      setError("Couldn't start GitHub sign-in. Check your connection and try again.");
    }
  };

  const backendFailed =
    status === "authenticated" && (backendState === "unauthorized" || backendState === "unavailable");

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white">
            <Terminal className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">GNSIS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your Genesis workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          {status === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your session…
            </div>
          ) : backendFailed ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-800">
                  You're signed in, but the GNSIS backend didn't accept the session
                  {backendState === "unavailable" ? " (it may be unreachable right now)" : ""}.
                </p>
              </div>
              <Button
                onClick={() => void refreshMe()}
                className="w-full bg-neutral-900 text-white hover:bg-neutral-800"
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={startSignIn}
                disabled={redirecting || !authConfigured}
                className="w-full gap-2 bg-neutral-900 text-white hover:bg-neutral-800"
              >
                {redirecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting to GitHub…
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4" />
                    Continue with GitHub
                  </>
                )}
              </Button>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  <span className="text-xs text-red-700">{error}</span>
                </div>
              )}

              {!authConfigured && (
                <p className="text-center text-xs text-amber-600">
                  Auth service URL isn't configured (VITE_AUTH_URL).
                </p>
              )}
              {!apiConfigured && (
                <p className="text-center text-xs text-amber-600">
                  GNSIS API URL isn't configured (VITE_API_BASE_URL).
                </p>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          GitHub is used only to verify your identity. Repository access is granted
          separately through the GNSIS GitHub App.
        </p>
      </div>
    </div>
  );
}
