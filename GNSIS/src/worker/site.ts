// The gnsis.studio front door on Cloudflare Workers: the same routing as the
// Caddyfile, over the built bundle in dist/ (served through the ASSETS binding).
// Keep the two in step until the container is retired.

export interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

export interface SiteEnv {
  ASSETS: AssetsBinding;
  GNSIS_HOME_EXPERIENCE?: string;
  GNSIS_LIVE_ENABLED?: string;
  GNSIS_LIVE_UPSTREAM?: string;
  GNSIS_EDGE_SECRET?: string;
  MODAL_PROXY_KEY?: string;
  MODAL_PROXY_SECRET?: string;
  VITE_API_BASE_URL?: string;
  VITE_API_URL?: string;
  VITE_AUTH_URL?: string;
  VITE_PUBLIC_BETA_MODE?: string;
  VITE_ENABLE_INTEGRATION_LAB?: string;
  VITE_GITHUB_APP_SLUG?: string;
}

type HomeExperience = "live" | "video-search" | "studio";

const PUBLIC_CONFIG_KEYS = [
  "VITE_API_BASE_URL",
  "VITE_API_URL",
  "VITE_AUTH_URL",
  "VITE_PUBLIC_BETA_MODE",
  "VITE_ENABLE_INTEGRATION_LAB",
  "VITE_GITHUB_APP_SLUG",
] as const;

const PAGE_PATHS = [
  "/video-search",
  "/use-cases/agentic-web-steering",
  "/privacy",
  "/terms",
  "/models",
  "/models/panoptic",
  "/lab",
  "/developers/panoptic",
  "/developers/gnsis-01",
] as const;

const PAGES = new Set<string>(PAGE_PATHS);

const HOME_PAGE: Record<HomeExperience, string> = {
  live: "/live.html",
  "video-search": "/video-search.html",
  studio: "/lab.html",
};

export function homeExperience(env: SiteEnv): HomeExperience {
  const mode = env.GNSIS_HOME_EXPERIENCE || "live";
  if (mode === "live" || mode === "video-search" || mode === "studio") {
    return mode;
  }
  console.error(
    "GNSIS_HOME_EXPERIENCE must be 'live', 'video-search' or 'studio'; got an unknown value, serving 'live'.",
  );
  return "live";
}

export function publicConfigScript(env: SiteEnv): string {
  const config: Record<string, string> = {};
  for (const key of PUBLIC_CONFIG_KEYS) {
    const value = env[key];
    if (value !== undefined) config[key] = value;
  }
  config.VITE_HOME_EXPERIENCE = homeExperience(env);
  return `window.__GNSIS_CONFIG__ = ${JSON.stringify(config)};\n`;
}

function assetRequest(request: Request, url: URL, path: string): Request {
  const target = new URL(url);
  target.pathname = path;
  return new Request(target, { method: request.method, headers: request.headers });
}

async function serveFirst(
  request: Request,
  url: URL,
  env: SiteEnv,
  paths: string[],
): Promise<Response> {
  let response: Response | undefined;
  for (const path of paths) {
    response = await env.ASSETS.fetch(assetRequest(request, url, path));
    if (response.status !== 404) return response;
  }
  return response ?? new Response("Not found", { status: 404 });
}

function proxySocket(request: Request, url: URL, env: SiteEnv): Promise<Response> | Response {
  let upstream: URL;
  try {
    upstream = new URL(env.GNSIS_LIVE_UPSTREAM || "https://unset.invalid");
  } catch {
    return new Response("Bad gateway", { status: 502 });
  }
  if (upstream.hostname.endsWith(".invalid")) {
    return new Response("Bad gateway", { status: 502 });
  }
  upstream.pathname = url.pathname;
  upstream.search = url.search;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Forwarded-Host", url.host);
  headers.set("Modal-Key", env.MODAL_PROXY_KEY ?? "");
  headers.set("Modal-Secret", env.MODAL_PROXY_SECRET ?? "");
  headers.set("X-GNSIS-Edge", env.GNSIS_EDGE_SECRET ?? "");
  return fetch(
    new Request(upstream, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    }),
  );
}

function withHeader(response: Response, name: string, value: string): Response {
  const copy = new Response(response.body, response);
  copy.headers.set(name, value);
  return copy;
}

export async function handleRequest(request: Request, env: SiteEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const mode = homeExperience(env);

  if (path === "/health") return new Response("ok", { status: 200 });

  const liveEnabled = env.GNSIS_LIVE_ENABLED === "true";

  if (path.startsWith("/ws/")) {
    return liveEnabled ? proxySocket(request, url, env) : new Response("Not found", { status: 404 });
  }

  if (!liveEnabled && (path === "/live" || path === "/live/" || path === "/live.html")) {
    return Response.redirect(new URL("/", url).toString(), 302);
  }

  if (path === "/env.js") {
    return new Response(publicConfigScript(env), {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  if (path === "/welcome" || path === "/home") {
    return Response.redirect(new URL("/", url).toString(), 301);
  }

  if (path === "/developers" || path === "/developers/") {
    return Response.redirect(new URL("/developers/panoptic", url).toString(), 301);
  }

  if (path.endsWith(".html") && PAGES.has(path.slice(0, -".html".length))) {
    const target = new URL(path.slice(0, -".html".length), url);
    target.search = url.search;
    return Response.redirect(target.toString(), 301);
  }

  const page = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

  let response: Response;
  if (path === "/") {
    response = await serveFirst(request, url, env, [HOME_PAGE[mode]]);
  } else if (path === "/live") {
    response = await serveFirst(request, url, env, ["/live.html"]);
  } else if (PAGES.has(page)) {
    response = await serveFirst(request, url, env, [`${page}.html`]);
  } else {
    response = await serveFirst(request, url, env, [path, `${path}.html`, "/index.html"]);
  }

  if (mode === "live" && PAGES.has(page)) {
    return withHeader(response, "X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export default {
  fetch(request: Request, env: SiteEnv): Promise<Response> {
    return handleRequest(request, env);
  },
};
