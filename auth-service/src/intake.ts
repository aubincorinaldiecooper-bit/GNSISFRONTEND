/**
 * The two public forms on the Panoptic pages of gnsis.studio:
 *
 *   POST /api/intake/early-access  { email, task?, source }
 *   POST /api/intake/contact       { email, message, source }
 *
 * Each is written to its own table in this service's Postgres database
 * (early_access_signups, contact_messages), created on first use. Nothing
 * here touches Better Auth's tables or the live experience.
 *
 * These routes take no credentials, so everything is checked here: a JSON
 * body only (which also makes a browser on any other origin preflight, and
 * CORS refuses it), a size cap, field-by-field validation, and a per-client
 * rate limit. The task a visitor typed is stored exactly as sent, so it can be
 * handed back to them when their access opens. Submitted values are never
 * logged.
 */

import { randomUUID } from "node:crypto";
import type http from "node:http";

import { Pool } from "pg";

import { redactError } from "./redact.js";

export const MAX_BODY_BYTES = 16 * 1024;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_TASK_LENGTH = 2000;
export const MAX_MESSAGE_LENGTH = 5000;

// "page" or "page:control", e.g. "video-search:hero". A shape rather than a
// list, so a new button on the site does not need a deploy here.
const SOURCE_PATTERN = /^[a-z0-9-]{1,40}(?::[a-z0-9-]{1,40})?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EarlyAccessSignup {
  email: string;
  originalTask: string | null;
  source: string;
}

export interface ContactMessage {
  email: string;
  message: string;
  source: string;
}

export type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; field: string; detail: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEmail(raw: unknown): Parsed<string> {
  if (typeof raw !== "string") {
    return { ok: false, field: "email", detail: "email is required" };
  }
  const email = raw.trim();
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { ok: false, field: "email", detail: "email is not a valid address" };
  }
  return { ok: true, value: email };
}

function parseSource(raw: unknown): Parsed<string> {
  if (typeof raw !== "string" || !SOURCE_PATTERN.test(raw)) {
    return { ok: false, field: "source", detail: "source is missing or malformed" };
  }
  return { ok: true, value: raw };
}

/** Postgres text cannot hold NUL, and nothing a person types contains one. */
function hasNul(value: string): boolean {
  return value.includes("\u0000");
}

export function parseEarlyAccess(body: unknown): Parsed<EarlyAccessSignup> {
  if (!isRecord(body)) return { ok: false, field: "body", detail: "expected a JSON object" };
  const email = parseEmail(body.email);
  if (!email.ok) return email;
  const source = parseSource(body.source);
  if (!source.ok) return source;

  let originalTask: string | null = null;
  if (body.task !== undefined && body.task !== null) {
    if (typeof body.task !== "string") {
      return { ok: false, field: "task", detail: "task must be text" };
    }
    if (body.task.length > MAX_TASK_LENGTH || hasNul(body.task)) {
      return { ok: false, field: "task", detail: `task must be at most ${MAX_TASK_LENGTH} characters` };
    }
    // Kept exactly as typed. Only a task with nothing in it is no task.
    originalTask = body.task.trim() === "" ? null : body.task;
  }

  return { ok: true, value: { email: email.value, originalTask, source: source.value } };
}

export function parseContact(body: unknown): Parsed<ContactMessage> {
  if (!isRecord(body)) return { ok: false, field: "body", detail: "expected a JSON object" };
  const email = parseEmail(body.email);
  if (!email.ok) return email;
  const source = parseSource(body.source);
  if (!source.ok) return source;

  if (typeof body.message !== "string" || body.message.trim() === "") {
    return { ok: false, field: "message", detail: "message is required" };
  }
  if (body.message.length > MAX_MESSAGE_LENGTH || hasNul(body.message)) {
    return { ok: false, field: "message", detail: `message must be at most ${MAX_MESSAGE_LENGTH} characters` };
  }

  return { ok: true, value: { email: email.value, message: body.message, source: source.value } };
}

/**
 * Sliding-window limit per client, held in memory only. Enough to blunt a
 * script. A client's address is forgotten once its window has passed: a sweep
 * runs every minute while anything is held, so the privacy page can say how
 * long an address is kept.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private sweeper: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly limit = 8,
    private readonly windowMs = 10 * 60 * 1000,
    private readonly maxKeys = 10_000,
  ) {}

  /** Records a hit; returns seconds to wait when over the limit, else 0. */
  take(key: string, now = Date.now()): number {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return Math.max(1, Math.ceil((recent[0] + this.windowMs - now) / 1000));
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) {
      // Drop the oldest key rather than grow without bound.
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
    this.startSweeping();
    return 0;
  }

  /** Forgets every client whose last hit is outside the window. */
  sweep(now = Date.now()): void {
    for (const [key, times] of this.hits) {
      if (times.length === 0 || now - times[times.length - 1] >= this.windowMs) {
        this.hits.delete(key);
      }
    }
    if (this.hits.size === 0 && this.sweeper) {
      clearInterval(this.sweeper);
      this.sweeper = null;
    }
  }

  /** How many clients are currently remembered. */
  get size(): number {
    return this.hits.size;
  }

  private startSweeping(): void {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => this.sweep(), 60_000);
    // Never the reason the process stays up.
    this.sweeper.unref?.();
  }
}

export interface IntakeStore {
  addSignup(signup: EarlyAccessSignup): Promise<void>;
  addContactMessage(message: ContactMessage): Promise<void>;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS early_access_signups (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  original_task text,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS early_access_signups_email_idx
  ON early_access_signups (lower(email));
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  message text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

interface Queryable {
  query(text: string, values?: unknown[]): Promise<unknown>;
}

/**
 * Stores submissions in Postgres. The tables are created on the first
 * submission, not at startup, so a database that is briefly unreachable never
 * stops the sign-in service from booting; a failed attempt is retried by the
 * next submission.
 */
export function postgresIntakeStore(db: Queryable): IntakeStore {
  let schema: Promise<void> | null = null;

  function ensureSchema(): Promise<void> {
    if (!schema) {
      schema = db.query(SCHEMA_SQL).then(
        () => undefined,
        (err: unknown) => {
          schema = null;
          throw err;
        },
      );
    }
    return schema;
  }

  return {
    async addSignup({ email, originalTask, source }) {
      await ensureSchema();
      await db.query(
        "INSERT INTO early_access_signups (id, email, original_task, source) VALUES ($1, $2, $3, $4)",
        [randomUUID(), email, originalTask, source],
      );
    },
    async addContactMessage({ email, message, source }) {
      await ensureSchema();
      await db.query(
        "INSERT INTO contact_messages (id, email, message, source) VALUES ($1, $2, $3, $4)",
        [randomUUID(), email, message, source],
      );
    },
  };
}

/** A small pool of its own, opened on first use. */
export function lazyPool(connectionString: string): Queryable {
  let pool: Pool | null = null;
  return {
    query(text, values) {
      pool ??= new Pool({ connectionString, max: 2 });
      return pool.query(text, values);
    },
  };
}

class BodyError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function readBoundedJson(req: http.IncomingMessage): Promise<unknown> {
  const type = String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") {
    throw new BodyError(415, "send the form as application/json");
  }
  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > MAX_BODY_BYTES) throw new BodyError(413, "the form is too large");

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new BodyError(413, "the form is too large");
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch {
    throw new BodyError(400, "the form is not valid JSON");
  }
}

function clientKey(req: http.IncomingMessage): string {
  // Railway's edge appends the caller to X-Forwarded-For; the first entry is
  // the visitor. Used only as a rate-limit key, never stored.
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

function send(res: http.ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(payload);
}

export const INTAKE_PREFIX = "/api/intake/";

export interface IntakeDeps {
  /** null when the service has no database configured. */
  store: IntakeStore | null;
  limiter?: RateLimiter;
}

/** Handles everything under /api/intake/. */
export function createIntakeHandler({ store, limiter = new RateLimiter() }: IntakeDeps) {
  return async function handleIntake(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    pathname: string,
  ): Promise<void> {
    const kind = pathname.slice(INTAKE_PREFIX.length);
    if (kind !== "early-access" && kind !== "contact") {
      send(res, 404, { detail: "not found" });
      return;
    }
    if (req.method !== "POST") {
      send(res, 405, { detail: "use POST" }, { Allow: "POST" });
      return;
    }

    const wait = limiter.take(clientKey(req));
    if (wait > 0) {
      send(res, 429, { detail: "too many submissions; try again later" }, { "Retry-After": String(wait) });
      return;
    }

    let body: unknown;
    try {
      body = await readBoundedJson(req);
    } catch (err) {
      if (err instanceof BodyError) {
        send(res, err.status, { detail: err.message });
        return;
      }
      throw err;
    }

    const parsed = kind === "early-access" ? parseEarlyAccess(body) : parseContact(body);
    if (!parsed.ok) {
      send(res, 400, { detail: parsed.detail, field: parsed.field });
      return;
    }

    if (!store) {
      send(res, 503, { detail: "submissions are not being accepted right now" });
      return;
    }

    try {
      if (kind === "early-access") {
        await store.addSignup(parsed.value as EarlyAccessSignup);
      } else {
        await store.addContactMessage(parsed.value as ContactMessage);
      }
    } catch (err) {
      const safe = redactError(err);
      // eslint-disable-next-line no-console
      console.error(`[intake] could not store a ${kind} submission:`, safe.name, safe.message);
      send(res, 500, { detail: "the submission could not be saved" });
      return;
    }

    send(res, 201, { status: "received" });
  };
}
