// Gate for authenticated application routes. While the session is resolving we
// show a quiet loading state; once resolved, an unauthenticated visitor is sent
// to /login (preserving where they were headed).

import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router";

import { useSession } from "@/lib/session";

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your workspace…
      </div>
    </div>
  );
}

export default function ProtectedRoute() {
  const { status } = useSession();
  const location = useLocation();

  if (status === "loading") return <LoadingScreen />;
  if (status === "unauthenticated") {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}
