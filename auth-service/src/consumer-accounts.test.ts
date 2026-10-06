import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BetterAuthOptions } from "better-auth";
import { assertProductionEnv, missingProductionVars } from "./env.js";

const mail = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mail.send }; } }));

const authOrigin = "http://localhost:3001";
const frontend = "http://localhost:5173";
const callback = `${frontend}/video-search`;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("AUTH_DATABASE_URL", "");
  vi.stubEnv("BETTER_AUTH_SECRET", "consumer-account-tests-not-a-production-secret");
  vi.stubEnv("BETTER_AUTH_URL", authOrigin);
  vi.stubEnv("GNSIS_FRONTEND_URL", frontend);
  vi.stubEnv("GITHUB_CLIENT_ID", "test-github-client-id");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "test-github-client-secret");
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-google-client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-google-client-secret");
  vi.stubEnv("RESEND_API_KEY", "test-email-provider-key");
  vi.stubEnv("AUTH_EMAIL_FROM", "Panoptic <signin@example.test>");
  mail.send.mockReset().mockResolvedValue({ data: { id: "test-email-id" }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

async function setup() {
  const { auth } = await import("./auth.js");
  const context = await auth.$context;
  // Better Auth skips origin guards in tests and defaults to cookie-only dev sessions.
  context.skipOriginCheck = false;
  context.skipCSRFCheck = false;
  const options: BetterAuthOptions = context.options;
  options.session = { ...options.session, cookieCache: { enabled: false } };
  const post = (path: string, body: unknown, cookie = "") => auth.handler(new Request(`${authOrigin}/api/auth${path}`, {
    method: "POST", headers: { Origin: frontend, "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(body),
  }));
  const requestLink = async () => {
    const response = await post("/sign-in/magic-link", {
      email: "ada@example.test", name: "Ada Lovelace", callbackURL: callback,
      newUserCallbackURL: callback, errorCallbackURL: `${callback}?authError=email`,
    });
    expect(response.status).toBe(200);
    const payload = mail.send.mock.calls.at(-1)?.[0] as { text: string };
    const url = payload.text.match(/https?:\/\/[^\s]+/)?.[0];
    if (!url) throw new Error("No sign-in link in delivered email");
    return url;
  };
  return { auth, post, requestLink };
}

describe("Panoptic consumer authentication", () => {
  it("supports Google identity-only OAuth while retaining GitHub for admin", async () => {
    const { auth, post } = await setup();
    expect(auth.options.socialProviders?.github).toBeDefined();
    const response = await post("/sign-in/social", { provider: "google", callbackURL: callback });
    expect(response.status).toBe(200);
    const url = new URL((await response.json() as { url: string }).url);
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("redirect_uri")).toBe(`${authOrigin}/api/auth/callback/google`);
    expect(url.searchParams.get("scope")?.split(" ").sort()).toEqual(["email", "openid", "profile"]);
  });

  it("delivers a one-time link, creates a verified session, updates the profile and signs out", async () => {
    const { auth, post, requestLink } = await setup();
    const url = await requestLink();
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: "ada@example.test", subject: "Sign in to Panoptic" }));
    const verified = await auth.handler(new Request(url));
    expect(verified.status).toBe(302);
    expect(verified.headers.get("location")).toBe(callback);
    const cookie = verified.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    const getSession = () => auth.handler(new Request(`${authOrigin}/api/auth/get-session`, { headers: { Cookie: cookie } }));
    const session = await (await getSession()).json() as { user: { email: string; emailVerified: boolean; name: string } };
    expect(session.user).toMatchObject({ email: "ada@example.test", emailVerified: true, name: "Ada Lovelace" });
    const updated = await post("/update-user", { name: "Ada Byron" }, cookie);
    expect(updated.status).toBe(200);
    expect((await (await getSession()).json() as { user: { name: string } }).user.name).toBe("Ada Byron");
    const reused = await auth.handler(new Request(url));
    expect(reused.headers.get("location")).toContain("authError=email");
    expect(reused.headers.get("location")).toContain("error=INVALID_TOKEN");
    expect((await post("/sign-out", {}, cookie)).status).toBe(200);
    expect(await (await getSession()).json()).toBeNull();
  });

  it("rejects expired links and untrusted callback destinations", async () => {
    const { auth, post, requestLink } = await setup();
    const rejected = await post("/sign-in/magic-link", { email: "ada@example.test", callbackURL: "https://untrusted.example/steal" });
    expect(rejected.status).toBe(403);
    expect(mail.send).not.toHaveBeenCalled();
    const url = await requestLink();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 601_000);
    const expired = await auth.handler(new Request(url));
    expect(expired.headers.get("location")).toContain("error=INVALID_TOKEN");
    expect(expired.headers.get("set-cookie")).toBeNull();
  });

  it("propagates email-delivery failures instead of falsely reporting a sent link", async () => {
    const { post } = await setup();
    mail.send.mockResolvedValue({ data: null, error: { message: "provider rejected" } });
    const response = await post("/sign-in/magic-link", { email: "ada@example.test", callbackURL: callback });
    expect(response.ok).toBe(false);
  });

  it("keeps existing deployments valid but rejects partially configured credential pairs", () => {
    const source = Object.fromEntries([
      "AUTH_DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET",
      "GNSIS_FRONTEND_URL", "GNSIS_API_AUDIENCE", "GNSIS_AUTH_INTERNAL_SECRET",
    ].map((name) => [name, "test-value"]));
    expect(missingProductionVars(source)).toEqual([]);
    expect(missingProductionVars({ ...source, GOOGLE_CLIENT_ID: "test-id", RESEND_API_KEY: "test-key" })).toEqual(["GOOGLE_CLIENT_SECRET", "AUTH_EMAIL_FROM"]);
    expect(() => assertProductionEnv({ ...source, NODE_ENV: "production", GOOGLE_CLIENT_ID: "test-id" })).toThrow("GOOGLE_CLIENT_SECRET");
  });

  it("reports only configured methods to the frontend through the public CORS endpoint", async () => {
    const { server } = await import("./server.js");
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP listener");
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/accounts/options`, { headers: { Origin: frontend } });
      expect(await response.json()).toEqual({ google: true, email: true });
      expect(response.headers.get("access-control-allow-origin")).toBe(frontend);
      expect(response.headers.get("cache-control")).toBe("no-store");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
