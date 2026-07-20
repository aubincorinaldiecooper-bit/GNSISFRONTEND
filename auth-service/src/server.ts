/**
 * Entry point: mounts Better Auth's own handler for everything under
 * /api/auth/*, plus two small routes of our own — /health and the internal
 * installation-ownership check.
 */

import http from "node:http";

import { toNodeHandler } from "better-auth/node";

import { auth } from "./auth.js";
import { assertProductionEnv, loadEnv } from "./env.js";
import { redactError } from "./redact.js";
import { verifyInstallation } from "./verify-installation.js";

const env = loadEnv();
assertProductionEnv();

const authHandler = toNodeHandler(auth);

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;

  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

function requireInternalSecret(req: http.IncomingMessage): boolean {
  if (!env.internalSecret) return false;

  const header = req.headers.authorization ?? "";
  const expected = `Bearer ${env.internalSecret}`;

  return (
    typeof header === "string" &&
    timingSafeEqual(header, expected)
  );
}

async function readJsonBody(
  req: http.IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf-8");

  if (!raw) return {};

  return JSON.parse(raw);
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);

  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });

  res.end(payload);
}

function appendVary(
  res: http.ServerResponse,
  value: string,
): void {
  const existing = res.getHeader("Vary");

  if (!existing) {
    res.setHeader("Vary", value);
    return;
  }

  const values = String(existing)
    .split(",")
    .map((item) => item.trim());

  if (!values.includes(value)) {
    values.push(value);
    res.setHeader("Vary", values.join(", "));
  }
}

function applyCors(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): boolean {
  const origin = req.headers.origin;
  const allowedOrigin =
    typeof origin === "string" &&
    origin === env.frontendUrl;

  if (allowedOrigin) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin,
    );

    res.setHeader(
      "Access-Control-Allow-Credentials",
      "true",
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );

    const requestedHeaders =
      req.headers["access-control-request-headers"];

    res.setHeader(
      "Access-Control-Allow-Headers",
      typeof requestedHeaders === "string"
        ? requestedHeaders
        : "Content-Type, Authorization",
    );

    res.setHeader(
      "Access-Control-Max-Age",
      "600",
    );

    appendVary(res, "Origin");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(allowedOrigin ? 204 : 403);
    res.end();
    return true;
  }

  return false;
}

export const server = http.createServer((req, res) => {
  void handleRequest(req, res);
});

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  // CORS must run before Better Auth handles the request so both
  // preflight and actual responses contain the browser headers.
  if (applyCors(req, res)) {
    return;
  }

  const url = new URL(
    req.url ?? "/",
    env.betterAuthUrl,
  );

  if (
    req.method === "GET" &&
    url.pathname === "/health"
  ) {
    sendJson(res, 200, {
      status: "ok",
      github_configured: Boolean(
        env.githubClientId &&
          env.githubClientSecret,
      ),
      database_configured: Boolean(
        env.authDatabaseUrl,
      ),
    });

    return;
  }

  if (
    req.method === "POST" &&
    url.pathname ===
      "/internal/github/verify-installation"
  ) {
    if (!requireInternalSecret(req)) {
      sendJson(res, 401, {
        valid: false,
        reason:
          "invalid or missing internal credential",
      });

      return;
    }

    try {
      const body = await readJsonBody(req);
      const result = await verifyInstallation(
        body,
        { auth },
      );

      sendJson(
        res,
        result.status,
        result.body,
      );
    } catch (err) {
      const safe = redactError(err);

      // eslint-disable-next-line no-console
      console.error(
        "[verify-installation] unhandled error:",
        safe.name,
        safe.message,
      );

      sendJson(res, 500, {
        valid: false,
        reason: "internal error",
      });
    }

    return;
  }

  if (url.pathname.startsWith("/api/auth")) {
    await authHandler(req, res);
    return;
  }

  sendJson(res, 404, {
    detail: "not found",
  });
}

/* c8 ignore start -- exercised via a live listener in real deployment only */
if (process.env.VITEST !== "true") {
  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `gnsis-auth-service listening on :${env.port}`,
    );
  });
}
/* c8 ignore stop */
