// The Better Auth browser client, pointed at the auth-service (VITE_AUTH_URL).
//
// The client talks to `${VITE_AUTH_URL}/api/auth/*` with `credentials: include`
// so the session cookie flows on cross-origin requests. It never sees any
// server secret — only the session cookie and the short-lived JWT.

import { createAuthClient } from "better-auth/react";

import { authBaseUrl } from "./env";

export const authClient = createAuthClient({
  baseURL: authBaseUrl() || undefined,
  fetchOptions: { credentials: "include" },
});

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  githubLogin: string | null;
}
