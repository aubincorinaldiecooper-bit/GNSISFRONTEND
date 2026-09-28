import http from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clientKey,
  createIntakeHandler,
  MAX_BODY_BYTES,
  MAX_TASK_LENGTH,
  parseContact,
  parseEarlyAccess,
  postgresIntakeStore,
  RateLimiter,
  SCHEMA_SQL,
  type ContactMessage,
  type EarlyAccessSignup,
  type IntakeDeps,
} from "./intake.js";

describe("early-access form", () => {
  it("keeps the typed task exactly, spaces and all", () => {
    const task = "  Find me a flight to Montréal next Friday — window seat \n";
    const parsed = parseEarlyAccess({ email: " ada@example.com ", task, source: "video-search:hero" });
    expect(parsed).toEqual({
      ok: true,
      value: { email: "ada@example.com", originalTask: task, source: "video-search:hero" },
    });
  });

  it("records no task when none was typed", () => {
    for (const task of [undefined, null, "", "   "]) {
      const parsed = parseEarlyAccess({ email: "ada@example.com", task, source: "video-search:nav" });
      expect(parsed.ok && parsed.value.originalTask).toBeNull();
    }
  });

  it("names the field that is wrong", () => {
    expect(parseEarlyAccess({ email: "not-an-email", source: "video-search:nav" })).toMatchObject({ ok: false, field: "email" });
    expect(parseEarlyAccess({ email: "ada@example.com", source: "Video Search!" })).toMatchObject({ ok: false, field: "source" });
    expect(parseEarlyAccess({ email: "ada@example.com", source: "a", task: 42 })).toMatchObject({ ok: false, field: "task" });
    expect(
      parseEarlyAccess({ email: "ada@example.com", source: "a", task: "x".repeat(MAX_TASK_LENGTH + 1) }),
    ).toMatchObject({ ok: false, field: "task" });
    expect(parseEarlyAccess({ email: "ada@example.com", source: "a", task: "a\u0000b" })).toMatchObject({ ok: false, field: "task" });
    expect(parseEarlyAccess(["ada@example.com"])).toMatchObject({ ok: false, field: "body" });
  });
});

describe("contact form", () => {
  it("needs a message", () => {
    expect(parseContact({ email: "ada@example.com", source: "footer", message: "  " })).toMatchObject({ ok: false, field: "message" });
    expect(parseContact({ email: "ada@example.com", source: "footer", message: "Hello" })).toEqual({
      ok: true,
      value: { email: "ada@example.com", message: "Hello", source: "footer" },
    });
  });
});

describe("rate limit", () => {
  it("lets a few through per client, then says how long to wait", () => {
    const limiter = new RateLimiter(2, 60_000);
    expect(limiter.take("a", 0)).toBe(0);
    expect(limiter.take("a", 1_000)).toBe(0);
    expect(limiter.take("a", 2_000)).toBe(58);
    expect(limiter.take("b", 2_000)).toBe(0);
    expect(limiter.take("a", 61_000)).toBe(0);
  });

  it("forgets a client once its window has passed", () => {
    const limiter = new RateLimiter(2, 60_000);
    limiter.take("a", 0);
    limiter.take("b", 30_000);
    limiter.sweep(60_000);
    expect(limiter.size).toBe(1);
    limiter.sweep(90_000);
    expect(limiter.size).toBe(0);
  });
});

describe("who counts as the same client", () => {
  const socket = { remoteAddress: "10.0.0.9" } as never;

  it("uses the address the proxy appended, not one the caller wrote", () => {
    expect(clientKey({ headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.7" }, socket })).toBe("203.0.113.7");
    expect(clientKey({ headers: { "x-forwarded-for": "5.6.7.8, 203.0.113.7" }, socket })).toBe("203.0.113.7");
  });

  it("falls back to the connection itself", () => {
    expect(clientKey({ headers: {}, socket })).toBe("10.0.0.9");
  });
});

describe("Postgres store", () => {
  it("creates the tables once, then inserts into the right one", async () => {
    const query = vi.fn(async (_sql: string, _values?: unknown[]) => ({}));
    const store = postgresIntakeStore({ query });
    await store.addSignup({ email: "ada@example.com", originalTask: "Find a flight", source: "video-search:hero" });
    await store.addContactMessage({ email: "ada@example.com", message: "Hi", source: "footer" });

    expect(query.mock.calls.filter(([sql]) => sql === SCHEMA_SQL)).toHaveLength(1);
    const [signupSql, signupValues] = query.mock.calls[1] as unknown as [string, unknown[]];
    expect(signupSql).toMatch(/^INSERT INTO early_access_signups \(id, email, original_task, source\)/);
    expect(signupValues.slice(1)).toEqual(["ada@example.com", "Find a flight", "video-search:hero"]);
    const [contactSql, contactValues] = query.mock.calls[2] as unknown as [string, unknown[]];
    expect(contactSql).toMatch(/^INSERT INTO contact_messages \(id, email, message, source\)/);
    expect(contactValues.slice(1)).toEqual(["ada@example.com", "Hi", "footer"]);
  });

  it("tries the tables again after a failed first attempt", async () => {
    const query = vi
      .fn<(sql: string, values?: unknown[]) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error("connection refused"))
      .mockResolvedValue({});
    const store = postgresIntakeStore({ query });
    const signup = { email: "ada@example.com", originalTask: null, source: "video-search:nav" };
    await expect(store.addSignup(signup)).rejects.toThrow("connection refused");
    await store.addSignup(signup);
    expect(query.mock.calls.map(([sql]) => sql === SCHEMA_SQL)).toEqual([true, true, false]);
  });
});

describe("intake routes", () => {
  let server: http.Server | null = null;

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = null;
  });

  function fakeStore() {
    const signups: EarlyAccessSignup[] = [];
    const messages: ContactMessage[] = [];
    return {
      signups,
      messages,
      store: {
        addSignup: async (s: EarlyAccessSignup) => void signups.push(s),
        addContactMessage: async (m: ContactMessage) => void messages.push(m),
      },
    };
  }

  async function start(deps: IntakeDeps): Promise<string> {
    const handler = createIntakeHandler(deps);
    server = http.createServer((req, res) => void handler(req, res, new URL(req.url ?? "/", "http://x").pathname));
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
  }

  const post = (base: string, path: string, body: unknown, type = "application/json") =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": type },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  it("stores a sign-up with its task and a contact message, each in its own place", async () => {
    const { store, signups, messages } = fakeStore();
    const base = await start({ store });

    const signup = await post(base, "/api/intake/early-access", {
      email: "ada@example.com",
      task: "Find me a flight to Montreal next Friday",
      source: "video-search:hero",
    });
    expect(signup.status).toBe(201);
    expect(await signup.json()).toEqual({ status: "received" });

    const contact = await post(base, "/api/intake/contact", { email: "ada@example.com", message: "Hello", source: "privacy:contact" });
    expect(contact.status).toBe(201);

    expect(signups).toEqual([
      { email: "ada@example.com", originalTask: "Find me a flight to Montreal next Friday", source: "video-search:hero" },
    ]);
    expect(messages).toEqual([{ email: "ada@example.com", message: "Hello", source: "privacy:contact" }]);
  });

  it("refuses what it should, and stores none of it", async () => {
    const { store, signups } = fakeStore();
    const base = await start({ store });

    expect((await post(base, "/api/intake/early-access", "email=ada@example.com", "application/x-www-form-urlencoded")).status).toBe(415);
    expect((await post(base, "/api/intake/early-access", "{not json")).status).toBe(400);
    const big = await post(base, "/api/intake/contact", { email: "ada@example.com", source: "footer", message: "x".repeat(MAX_BODY_BYTES) });
    expect(big.status).toBe(413);
    const bad = await post(base, "/api/intake/early-access", { email: "nope", source: "video-search:nav" });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ field: "email" });
    expect((await fetch(`${base}/api/intake/early-access`)).status).toBe(405);
    expect((await post(base, "/api/intake/newsletter", {})).status).toBe(404);

    expect(signups).toEqual([]);
  });

  it("slows down a client that keeps submitting, whatever it claims to be", async () => {
    const { store } = fakeStore();
    const base = await start({ store, limiter: new RateLimiter(1, 60_000) });
    const body = JSON.stringify({ email: "ada@example.com", source: "video-search:nav" });
    const send = (spoofed: string) =>
      fetch(`${base}/api/intake/early-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": `${spoofed}, 198.51.100.4` },
        body,
      });
    expect((await send("1.1.1.1")).status).toBe(201);
    const again = await send("2.2.2.2");
    expect(again.status).toBe(429);
    expect(Number(again.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("says so, rather than pretending, when there is no database", async () => {
    const base = await start({ store: null });
    const res = await post(base, "/api/intake/early-access", { email: "ada@example.com", source: "video-search:nav" });
    expect(res.status).toBe(503);
  });

  it("answers 500, without echoing what was sent, when the database fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const base = await start({
      store: {
        addSignup: async () => {
          throw new Error("relation does not exist");
        },
        addContactMessage: async () => {},
      },
    });
    const res = await post(base, "/api/intake/early-access", { email: "ada@example.com", task: "secret plans", source: "a" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(error.mock.calls)).not.toContain("secret plans");
    expect(JSON.stringify(error.mock.calls)).not.toContain("ada@example.com");
  });
});

describe("intake routes in the running service", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("are mounted, and answer the site's origin with CORS headers", async () => {
    vi.resetModules();
    for (const [key, value] of Object.entries({
      NODE_ENV: "development",
      AUTH_DATABASE_URL: "",
      GNSIS_FRONTEND_URL: "http://localhost:5173",
      VITEST: "true",
    })) {
      vi.stubEnv(key, value);
    }
    const { server } = await import("./server.js");
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const { port } = server.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${port}/api/intake/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:5173" },
        body: JSON.stringify({ email: "ada@example.com", message: "Hi", source: "footer" }),
      });
      // No database in this environment: the route is there and says so.
      expect(res.status).toBe(503);
      expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
