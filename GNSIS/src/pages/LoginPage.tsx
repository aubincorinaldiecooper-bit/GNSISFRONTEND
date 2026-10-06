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

import { UIThemeProvider } from "@/components/ui/theme";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { isApiConfigured, isAuthConfigured } from "@/lib/env";
import { adminPath } from "@/lib/adminRoutes";

// Signing in is an operator action: it leads into the control plane under
// /admin, never to "/", which is the public perception landing page and has no
// sign-in of its own.
const DEFAULT_SIGNED_IN_PATH = adminPath("/new");

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
    <UIThemeProvider theme="light"><div className="light flex min-h-screen w-full items-center justify-center bg-canvas px-4 font-sans text-ink">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-card bg-ink text-canvas">
            <Terminal className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">GNSIS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your GNSIS workspace.
          </p>
        </div>

        <div className="rounded-window bg-surface p-6 shadow-card">
          {status === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your session…
            </div>
          ) : backendFailed ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-control border border-orange/20 bg-orange-tint px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
                <p className="text-xs leading-relaxed text-ink">
                  You're signed in, but the GNSIS backend didn't accept the session
                  {backendState === "unavailable" ? " (it may be unreachable right now)" : ""}.
                </p>
              </div>
              <Button
                onClick={() => void refreshMe()}
                className="w-full"
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={startSignIn}
                disabled={redirecting || !authConfigured}
                className="w-full gap-2"
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
                <div role="alert" className="flex items-start gap-2 rounded-control border border-red/20 bg-red-tint px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                  <span className="text-xs text-red-400">{error}</span>
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
    </div></UIThemeProvider>
  );
}
