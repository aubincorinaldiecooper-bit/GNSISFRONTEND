/**
 * The Better Auth instance — social/email login, Postgres-backed sessions,
 * and the JWT/JWKS bridge the FastAPI backend verifies against.
 *
 * This file is also the entry point the Better Auth CLI reads for
 * `auth:generate` / `auth:migrate` (see package.json), so it must export a
 * top-level `auth` built from `betterAuth()` with no side effects beyond that.
 */

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { jwt, magicLink } from "better-auth/plugins";
import { Pool } from "pg";

import { loadEnv } from "./env.js";
import { createSignInMailer } from "./account-email.js";

const env = loadEnv();

export const auth = betterAuth({
  database: env.authDatabaseUrl
    ? new Pool({ connectionString: env.authDatabaseUrl })
    : // Falls through to Better Auth's in-memory adapter only when unset —
      // this only happens in local dev without a database configured; the
      // CLI's own `auth:generate`/`auth:migrate` require a real DATABASE_URL.
      undefined,
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,

  // Only these origins may complete an OAuth flow or receive session cookies.
  trustedOrigins: [env.frontendUrl],

  socialProviders: {
    ...(env.googleClientId && env.googleClientSecret ? {
      google: {
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
      },
    } : {}),
    github: {
      clientId: env.githubClientId,
      clientSecret: env.githubClientSecret,
      // Identity only — this token is never used to touch repositories.
      // Repo access always goes through the platform's GitHub App
      // installation tokens, minted server-side by the FastAPI backend.
      scope: ["read:user", "user:email"],
      // GitHub's profile.login (the username) isn't one of Better Auth's
      // standard user fields — persist it via the additionalFields below so
      // the JWT payload can safely include it.
      mapProfileToUser: (profile) => ({ githubLogin: profile.login }),
    },
  },

  user: {
    additionalFields: {
      githubLogin: { type: "string", required: false, input: false },
    },
  },

  account: {
    // GitHub OAuth tokens are only ever used server-side (installation
    // ownership verification); encrypt them at rest.
    encryptOAuthTokens: true,
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/token") return;
      const session = await getSessionFromCtx(ctx);
      if (!session) throw new APIError("UNAUTHORIZED", { message: "Sign in with GitHub for developer access" });
      const accounts = await ctx.context.internalAdapter.findAccounts(session.user.id);
      if (!accounts.some((account) => account.providerId === "github")) {
        throw new APIError("FORBIDDEN", { message: "GitHub is required for developer API access" });
      }
    }),
  },

  advanced: {
    useSecureCookies: env.nodeEnv === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      secure: env.nodeEnv === "production",
    },
  },

  plugins: [
    ...(env.resendApiKey && env.authEmailFrom ? [magicLink({
      expiresIn: 600,
      storeToken: "hashed",
      rateLimit: { window: 60, max: 5 },
      sendMagicLink: createSignInMailer(env),
    })] : []),
    jwt({
      disableSettingJwtHeader: true,
      jwt: {
        issuer: env.betterAuthUrl,
        audience: env.apiAudience,
        expirationTime: "15m",
        // Minimal claims only — no provider tokens, no session token, no
        // secrets. `sub` is the Better Auth user id the backend keys
        // workspaces off of.
        definePayload: ({ user }) => ({
          email: user.email,
          name: user.name,
          image: user.image,
          github_login: (user as unknown as { githubLogin?: string }).githubLogin,
        }),
      },
    }),
  ],
});

export type AuthInstance = typeof auth;
