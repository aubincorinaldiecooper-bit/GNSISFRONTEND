/**
 * POST /internal/github/verify-installation
 *
 * Confirms a GitHub App installation is accessible to a specific,
 * already-authenticated Better Auth user, before the backend claims it under
 * that user's workspace. This is the only place in the system that reads a
 * user's GitHub OAuth token — it is retrieved here, used once against
 * GitHub's API, and never returned to the caller.
 */

import type { auth as AuthType } from "./auth.js";
import { redactError } from "./redact.js";

export interface VerifyInstallationRequest {
  auth_subject: string;
  installation_id: number;
}

export type VerifyInstallationResponse =
  | {
      valid: true;
      installation_id: number;
      account: { id: number; login: string; type: string };
    }
  | { valid: false; reason: string };

interface GithubInstallation {
  id: number;
  account: { id: number; login?: string; slug?: string; type?: string } | null;
}

interface GithubInstallationsResponse {
  installations: GithubInstallation[];
}

export interface VerifyInstallationDeps {
  auth: typeof AuthType;
  fetchImpl?: typeof fetch;
}

const GITHUB_API = "https://api.github.com";

export async function verifyInstallation(
  body: unknown,
  deps: VerifyInstallationDeps,
): Promise<{ status: number; body: VerifyInstallationResponse }> {
  const parsed = parseRequest(body);
  if (!parsed) {
    return { status: 400, body: { valid: false, reason: "invalid request body" } };
  }
  const { auth_subject, installation_id } = parsed;
  const fetchImpl = deps.fetchImpl ?? fetch;

  let accessToken: string;
  try {
    const tokenResult = await deps.auth.api.getAccessToken({
      body: { providerId: "github", userId: auth_subject },
    });
    if (!tokenResult?.accessToken) {
      return { status: 403, body: { valid: false, reason: "no linked GitHub account" } };
    }
    accessToken = tokenResult.accessToken;
  } catch (err) {
    // Covers: unknown user, no linked account, expired/unrefreshable token.
    logSafely("getAccessToken failed", err);
    return { status: 403, body: { valid: false, reason: "no linked GitHub account" } };
  }

  let installations: GithubInstallation[];
  try {
    installations = await listUserInstallations(accessToken, fetchImpl);
  } catch (err) {
    logSafely("GitHub installations lookup failed", err);
    return { status: 502, body: { valid: false, reason: "GitHub rejected the token" } };
  }

  const match = installations.find((inst) => inst.id === installation_id);
  if (!match || !match.account) {
    return { status: 403, body: { valid: false, reason: "installation not accessible to this user" } };
  }

  return {
    status: 200,
    body: {
      valid: true,
      installation_id: match.id,
      account: {
        id: match.account.id,
        login: match.account.login ?? match.account.slug ?? "",
        type: match.account.type ?? "User",
      },
    },
  };
}

async function listUserInstallations(
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<GithubInstallation[]> {
  const all: GithubInstallation[] = [];
  let page = 1;
  for (;;) {
    const res = await fetchImpl(
      `${GITHUB_API}/user/installations?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!res.ok) {
      throw new Error(`GitHub API responded ${res.status}`);
    }
    const data = (await res.json()) as GithubInstallationsResponse;
    const batch = data.installations ?? [];
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all;
}

function parseRequest(body: unknown): VerifyInstallationRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const authSubject = record.auth_subject;
  const installationId = record.installation_id;
  if (typeof authSubject !== "string" || !authSubject) return null;
  if (typeof installationId !== "number" || !Number.isFinite(installationId)) return null;
  return { auth_subject: authSubject, installation_id: installationId };
}

/** Logs an error's name/message only — never the token, never raw headers. */
function logSafely(context: string, err: unknown): void {
  const safe = redactError(err);
  // eslint-disable-next-line no-console
  console.error(`[verify-installation] ${context}:`, safe.name, safe.message);
}
