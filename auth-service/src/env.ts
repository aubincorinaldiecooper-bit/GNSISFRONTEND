/**
 * Environment configuration with startup validation.
 *
 * Fails loudly and actionably in production when a required variable is
 * missing, instead of booting into a broken state that only surfaces at
 * request time. Never logs a variable's *value* — only its name.
 */

export interface Env {
  nodeEnv: string;
  port: number;
  authDatabaseUrl: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  githubClientId: string;
  githubClientSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  resendApiKey: string;
  authEmailFrom: string;
  frontendUrl: string;
  apiAudience: string;
  internalSecret: string;
}

const REQUIRED_IN_PRODUCTION = [
  "AUTH_DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GNSIS_FRONTEND_URL",
  "GNSIS_API_AUDIENCE",
  "GNSIS_AUTH_INTERNAL_SECRET",
] as const;

export function missingProductionVars(source: NodeJS.ProcessEnv = process.env): string[] {
  const missing: string[] = REQUIRED_IN_PRODUCTION.filter((name) => !source[name]);
  for (const group of [["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], ["RESEND_API_KEY", "AUTH_EMAIL_FROM"]]) {
    if (group.some((name) => source[name])) missing.push(...group.filter((name) => !source[name]));
  }
  return missing;
}

export function assertProductionEnv(source: NodeJS.ProcessEnv = process.env): void {
  if (source.NODE_ENV !== "production") return;
  const missing = missingProductionVars(source);
  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}. ` +
        "Set these in the hosting platform's environment configuration before deploying.",
    );
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const nodeEnv = source.NODE_ENV ?? "development";
  return {
    nodeEnv,
    port: Number(source.PORT ?? 3001),
    authDatabaseUrl: source.AUTH_DATABASE_URL ?? "",
    betterAuthSecret: source.BETTER_AUTH_SECRET ?? "dev-only-insecure-secret",
    betterAuthUrl: source.BETTER_AUTH_URL ?? `http://localhost:${source.PORT ?? 3001}`,
    githubClientId: source.GITHUB_CLIENT_ID ?? "",
    githubClientSecret: source.GITHUB_CLIENT_SECRET ?? "",
    googleClientId: source.GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: source.GOOGLE_CLIENT_SECRET ?? "",
    resendApiKey: source.RESEND_API_KEY ?? "",
    authEmailFrom: source.AUTH_EMAIL_FROM ?? "",
    frontendUrl: source.GNSIS_FRONTEND_URL ?? "http://localhost:5173",
    apiAudience: source.GNSIS_API_AUDIENCE ?? "gnsis-api",
    internalSecret: source.GNSIS_AUTH_INTERNAL_SECRET ?? "",
  };
}
