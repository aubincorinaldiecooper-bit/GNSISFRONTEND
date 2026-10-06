// Titles, descriptions and the link-preview picture for the Panoptic pages.
//
// One source for the two places that need them. The pages use them for the
// tab title once they run (usePageMeta). The build uses them to write each
// page its own HTML file (vite.config.ts), because link previews — Slack and
// the like — read a page without running it, and would otherwise see the
// console's title and no picture. Plain data only: the build imports it too.

/** Where the site lives. Link-preview images must be absolute addresses. */
export const SITE_ORIGIN = "https://gnsis.studio";

/** The genesis horizontal lockup on Paper, 1200 × 630, from the brand kit. */
export const PREVIEW_IMAGE = {
  path: "/og/genesis-preview.png",
  width: 1200,
  height: 630,
  alt: "genesis",
} as const;

export interface PageMeta {
  /** The page's stable public address. */
  path: string;
  /** The HTML file the build writes for it; Caddy serves it for `path`. */
  file: string;
  title: string;
  description: string;
}

export const LANDING_META: PageMeta = {
  path: "/video-search",
  file: "video-search.html",
  title: "Panoptic — ask, and see the exact moment.",
  description:
    "Ask in plain words. Panoptic looks inside videos across platforms and takes you to the exact moments that answer you.",
};

export const WEB_STEERING_META: PageMeta = {
  path: "/use-cases/agentic-web-steering",
  file: "use-cases/agentic-web-steering.html",
  title: "Agentic web steering — Panoptic",
  description:
    "Most agents read a website’s code. Panoptic looks at the screen the way you do, and steers your agent through any site, one move at a time.",
};

export const PRIVACY_META: PageMeta = {
  path: "/privacy",
  file: "privacy.html",
  title: "Privacy — Panoptic",
  description: "What the Panoptic pages on gnsis.studio collect, why, and how to have it deleted.",
};

export const TERMS_META: PageMeta = {
  path: "/terms",
  file: "terms.html",
  title: "Terms — Panoptic",
  description: "The terms for using the Panoptic pages on gnsis.studio and their early-access and contact forms.",
};

export const PANOPTIC_PAGES: readonly PageMeta[] = [LANDING_META, WEB_STEERING_META, PRIVACY_META, TERMS_META];

// The GNSIS Studio pages (src/studio).
export const MODELS_META: PageMeta = {
  path: "/models",
  file: "models.html",
  title: "Models — GNSIS",
  description:
    "Models from the GNSIS lab. Panoptic, our first release, gives agents real-time visual perception of the web.",
};

export const PANOPTIC_MODEL_META: PageMeta = {
  path: "/models/panoptic",
  file: "models/panoptic.html",
  title: "Panoptic — persistent vision for agents",
  description:
    "Agents lose sight of the page between actions. Panoptic keeps watching, so your agent always knows what’s on screen.",
};

export const DEVELOPERS_PANOPTIC_META: PageMeta = {
  path: "/developers/panoptic",
  file: "developers/panoptic.html",
  title: "Panoptic for developers — GNSIS",
  description:
    "Give your agent a live view of the screen. Request developer access to the Panoptic API, SDKs and MCP server.",
};

export const DEVELOPERS_GNSIS01_META: PageMeta = {
  path: "/developers/gnsis-01",
  file: "developers/gnsis-01.html",
  title: "GNSIS 1.0 for developers — GNSIS",
  description: "Hand GNSIS 1.0 a task through the API and follow it to the finish. Request developer access.",
};

export const LAB_META: PageMeta = {
  path: "/lab",
  file: "lab.html",
  title: "GNSIS — an AI research lab in Toronto",
  description:
    "GNSIS is a research lab building AI that sees, listens and remembers in real time, so it can work alongside people, not just answer them.",
};

export const STUDIO_PAGES: readonly PageMeta[] = [
  LAB_META,
  MODELS_META,
  PANOPTIC_MODEL_META,
  DEVELOPERS_PANOPTIC_META,
];

/** Every page the build writes its own HTML copy for. */
export const SITE_PAGES: readonly PageMeta[] = [...PANOPTIC_PAGES, ...STUDIO_PAGES];

const START = "<!-- page-meta -->";
const END = "<!-- /page-meta -->";

function attr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The head tags a page needs for its tab and for link previews. */
export function renderPageMeta({ title, description }: Pick<PageMeta, "title" | "description">): string {
  const image = SITE_ORIGIN + PREVIEW_IMAGE.path;
  return [
    `<title>${attr(title)}</title>`,
    `<meta name="description" content="${attr(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="GNSIS.studio" />`,
    `<meta property="og:title" content="${attr(title)}" />`,
    `<meta property="og:description" content="${attr(description)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="${PREVIEW_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${PREVIEW_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${PREVIEW_IMAGE.alt}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${attr(title)}" />`,
    `<meta name="twitter:description" content="${attr(description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join("\n    ");
}

/**
 * index.html with its marked head block (the console's) swapped for a
 * page's. Throws when the markers are missing, so the build fails rather
 * than shipping a page that previews as something else.
 */
export function withPageMeta(html: string, page: Pick<PageMeta, "title" | "description">): string {
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`index.html has no ${START} … ${END} block to replace`);
  }
  return html.slice(0, start) + `${START}\n    ${renderPageMeta(page)}\n    ` + html.slice(end);
}
