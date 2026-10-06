import { authClient, type SessionUser } from "./authClient";
import { clearBackendToken } from "./authToken";
import { clearAllSecrets } from "./keySecrets";

export function mapSessionUser(raw: unknown): SessionUser | null {
  if (!raw || typeof raw !== "object") return null;
  const user = raw as Record<string, unknown>;
  if (typeof user.id !== "string") return null;
  const field = (key: string) => typeof user[key] === "string" ? user[key] as string : null;
  return {
    id: user.id,
    email: field("email"),
    name: field("name"),
    image: field("image"),
    githubLogin: field("githubLogin"),
  };
}

export async function signOutIdentity(): Promise<void> {
  clearAllSecrets();
  clearBackendToken();
  try {
    const result = await authClient.signOut();
    if (result?.error) throw new Error("Sign-out failed");
  } finally {
    // An exchange racing with remote sign-out must not survive into another account.
    clearBackendToken();
    clearAllSecrets();
  }
}
