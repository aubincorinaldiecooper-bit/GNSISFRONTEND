// Where the operator control plane lives.
//
// The dashboard — runs, repositories, billing, usage, API/MCP access, account
// administration — used to BE the product and sat at the root of the site. It
// is now an internal surface for operating GNSIS, and the public front door is
// the perception landing page at "/".
//
// Every dashboard path is therefore written through `adminPath` and every
// pathname it reads is first put through `stripAdminBase`, so the prefix lives
// in exactly one place. Nothing under this base is reachable without a session:
// main.tsx mounts the whole subtree inside <ProtectedRoute />.

export const ADMIN_BASE = "/admin";

/**
 * The paths the dashboard owned when it was the product.
 *
 * They are now forwarded under ADMIN_BASE so an operator's existing bookmark
 * still lands on the same screen. Forwarding grants nothing on its own: the
 * destination is inside <ProtectedRoute />, so signing in is still required.
 *
 * The list lives here rather than beside the redirect component because a file
 * that exports both a component and a constant breaks Fast Refresh.
 */
export const LEGACY_DASHBOARD_PATHS = [
  "/new",
  "/runs",
  "/runs/:runId",
  "/intelligence",
  "/dashboard",
  "/settings",
  "/billing",
  "/integration-test",
  "/onboarding/github",
];

/** Absolute path to a dashboard route. `adminPath("/runs") === "/admin/runs"`. */
export function adminPath(sub: string): string {
  if (!sub || sub === "/") return ADMIN_BASE;
  return `${ADMIN_BASE}${sub.startsWith("/") ? sub : `/${sub}`}`;
}

/**
 * The dashboard-relative path for a real browser pathname.
 *
 * `/admin/runs` -> `/runs`, `/admin` -> `/`. A pathname that is not under the
 * base is returned unchanged, so this is safe to call on any location and the
 * route table below it never has to know about the prefix.
 *
 * `/administration` must NOT be treated as the admin root, hence the explicit
 * separator check rather than a bare `startsWith(ADMIN_BASE)`.
 */
export function stripAdminBase(pathname: string): string {
  if (pathname === ADMIN_BASE) return "/";
  if (pathname.startsWith(`${ADMIN_BASE}/`)) return pathname.slice(ADMIN_BASE.length);
  return pathname;
}
