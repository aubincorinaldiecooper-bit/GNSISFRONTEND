// Forwarding for the paths the dashboard owned when it was the product.
//
// Those pages now live under /admin, so an operator's existing bookmark or a
// link in an old email lands on the same screen instead of the front door.
// Forwarding grants nothing by itself: every destination is still inside
// <ProtectedRoute />, so an unauthenticated visitor is bounced to /login from
// there exactly as if they had typed the /admin path.
//
// This lives in its own module rather than inside main.tsx so the routing test
// can mount the real component, instead of a copy that can quietly drift away
// from what ships. The path list it is used with is LEGACY_DASHBOARD_PATHS in
// lib/adminRoutes.

import { Navigate, useLocation } from "react-router";

import { ADMIN_BASE } from "@/lib/adminRoutes";

export default function LegacyDashboardRedirect() {
  const location = useLocation();
  return <Navigate to={`${ADMIN_BASE}${location.pathname}${location.search}`} replace />;
}
