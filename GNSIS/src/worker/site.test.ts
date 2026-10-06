// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleRequest, type SiteEnv } from "./site";

const FILES: Record<string, string> = {
  "/index.html": '<div id="root"></div>',
  "/live.html": "live page",
  "/lab.html": "lab page",
  "/video-search.html": "video search page",
  "/models.html": "models page",
  "/models/panoptic.html": "panoptic page",
  "/developers/panoptic.html": "developers panoptic page",
  "/developers/gnsis-01.html": "developers gnsis page",
  "/assets/app.js": "console.log(1)",
  "/live/qr.svg": "<svg></svg>",
};

function makeEnv(overrides: Partial<SiteEnv> = {}): SiteEnv {
  return {
    ASSETS: {
      async fetch(request: Request) {
        const body = FILES[new URL(request.url).pathname];
        return body === undefined
          ? new Response("missing", { status: 404 })
          : new Response(body, { status: 200 });
      },
    },
    GNSIS_LIVE_ENABLED: "true",
    ...overrides,
  };
}

async function get(path: string, env: SiteEnv = makeEnv(), init?: RequestInit) {
  return handleRequest(new Request(`https://gnsis.studio${path}`, init), env);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gnsis.studio worker", () => {
  it("answers /health", async () => {
    const response = await get("/health");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("serves only allowlisted public config in /env.js, uncached", async () => {
    const response = await get(
      "/env.js",
      makeEnv({
        VITE_API_BASE_URL: "https://api.gnsis.test",
        VITE_ENABLE_INTEGRATION_LAB: "",
        GNSIS_EDGE_SECRET: "edge",
        MODAL_PROXY_KEY: "key",
        MODAL_PROXY_SECRET: "secret",
        GNSIS_HOME_EXPERIENCE: "studio",
      }),
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const window: { __GNSIS_CONFIG__?: Record<string, string> } = {};
    new Function("window", await response.text())(window);
    expect(window.__GNSIS_CONFIG__).toEqual({
      VITE_API_BASE_URL: "https://api.gnsis.test",
      VITE_ENABLE_INTEGRATION_LAB: "",
      VITE_HOME_EXPERIENCE: "studio",
    });
  });

  it.each([
    [undefined, "live page"],
    ["live", "live page"],
    ["video-search", "video search page"],
    ["studio", "lab page"],
    ["nonsense", "live page"],
  ])("serves the home page for mode %s", async (mode, body) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await get("/", makeEnv({ GNSIS_HOME_EXPERIENCE: mode }));
    expect(await response.text()).toBe(body);
  });

  it("keeps /live as the live page in every mode", async () => {
    const response = await get("/live", makeEnv({ GNSIS_HOME_EXPERIENCE: "studio" }));
    expect(await response.text()).toBe("live page");
  });

  it("serves studio pages with and without a trailing slash", async () => {
    const env = makeEnv({ GNSIS_HOME_EXPERIENCE: "studio" });
    expect(await (await get("/models/panoptic", env)).text()).toBe("panoptic page");
    expect(await (await get("/developers/gnsis-01/", env)).text()).toBe(
      "developers gnsis page",
    );
    expect((await get("/lab", env)).headers.get("X-Robots-Tag")).toBeNull();
  });

  it("marks studio pages noindex while the live page is home", async () => {
    const response = await get("/models");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("redirects page copies and old aliases", async () => {
    const copy = await get("/models/panoptic.html");
    expect(copy.status).toBe(301);
    expect(copy.headers.get("Location")).toBe("https://gnsis.studio/models/panoptic");
    const alias = await get("/welcome");
    expect(alias.status).toBe(301);
    expect(alias.headers.get("Location")).toBe("https://gnsis.studio/");
  });

  it("serves real assets and falls back to the bundle for app routes", async () => {
    expect(await (await get("/assets/app.js")).text()).toBe("console.log(1)");
    expect(await (await get("/live/qr.svg")).text()).toBe("<svg></svg>");
    expect(await (await get("/runs/example-id?x=1")).text()).toContain('<div id="root">');
  });

  it("answers 502 for sockets when no upstream is configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await get("/ws/duplex");
    expect(response.status).toBe(502);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards sockets to the runtime with the edge and Modal credentials", async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    await get(
      "/ws/screen?session=abc",
      makeEnv({
        GNSIS_LIVE_UPSTREAM: "https://runtime.example.modal.run",
        GNSIS_EDGE_SECRET: "edge",
        MODAL_PROXY_KEY: "key",
        MODAL_PROXY_SECRET: "secret",
      }),
      { headers: { Upgrade: "websocket" } },
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const forwarded = (fetchSpy.mock.calls[0] as unknown as [Request])[0];
    expect(forwarded.url).toBe("https://runtime.example.modal.run/ws/screen?session=abc");
    expect(forwarded.headers.get("Upgrade")).toBe("websocket");
    expect(forwarded.headers.get("X-GNSIS-Edge")).toBe("edge");
    expect(forwarded.headers.get("Modal-Key")).toBe("key");
    expect(forwarded.headers.get("Modal-Secret")).toBe("secret");
    expect(forwarded.headers.get("X-Forwarded-Proto")).toBe("https");
    expect(forwarded.headers.get("X-Forwarded-Host")).toBe("gnsis.studio");
  });

  it("hides the live page and its sockets unless the live surface is enabled", async () => {
    const env = makeEnv({ GNSIS_HOME_EXPERIENCE: "studio", GNSIS_LIVE_ENABLED: "false" });
    for (const path of ["/live", "/live/", "/live.html"]) {
      const res = await get(path, env);
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("https://gnsis.studio/");
    }
    expect((await get("/ws/duplex", env)).status).toBe(404);
    expect(await (await get("/", env)).text()).toBe("lab page");
  });
});
