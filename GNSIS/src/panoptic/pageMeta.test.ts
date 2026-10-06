import { describe, expect, it } from "vitest";

import {
  DEVELOPERS_GNSIS01_META,
  DEVELOPERS_PANOPTIC_META,
  LAB_META,
  MODELS_META,
  PANOPTIC_PAGES,
  PREVIEW_IMAGE,
  SITE_ORIGIN,
  STUDIO_PAGES,
  withPageMeta,
} from "./pageMeta";

const INDEX = `<head>
    <meta charset="UTF-8" />
    <!-- page-meta -->
    <title>GNSIS Developer Console</title>
    <meta property="og:title" content="GNSIS Developer Console" />
    <!-- /page-meta -->
    <script src="/env.js"></script>
  </head>`;

describe("each Panoptic page's own HTML", () => {
  it("swaps the console's title and preview for the page's, and keeps everything else", () => {
    const html = withPageMeta(INDEX, { title: "Privacy — Panoptic", description: "What we collect." });
    expect(html).toContain("<title>Privacy — Panoptic</title>");
    expect(html).toContain('<meta property="og:title" content="Privacy — Panoptic" />');
    expect(html).toContain('<meta name="description" content="What we collect." />');
    expect(html).toContain(`<meta property="og:image" content="${SITE_ORIGIN}${PREVIEW_IMAGE.path}" />`);
    expect(html).not.toContain("GNSIS Developer Console");
    expect(html).toContain('<script src="/env.js"></script>');
    // Still marked, so the block could be found again.
    expect(html).toContain("<!-- page-meta -->");
    expect(html).toContain("<!-- /page-meta -->");
  });

  it("escapes what it writes into attributes", () => {
    const html = withPageMeta(INDEX, { title: 'A "quoted" <title> & more', description: "d" });
    expect(html).toContain('content="A &quot;quoted&quot; &lt;title&gt; &amp; more"');
  });

  it("refuses to guess when the block is missing", () => {
    expect(() => withPageMeta("<head><title>x</title></head>", { title: "t", description: "d" })).toThrow(/page-meta/);
  });

  it("gives every page a file of its own, and the landing its dormant address", () => {
    const files = PANOPTIC_PAGES.map((page) => page.file);
    expect(new Set(files).size).toBe(files.length);
    expect(PANOPTIC_PAGES.map((page) => page.path)).toEqual([
      "/video-search",
      "/use-cases/agentic-web-steering",
      "/privacy",
      "/terms",
    ]);
    for (const page of PANOPTIC_PAGES) expect(`/${page.file}`).toBe(`${page.path}.html`);
  });

  it("includes the Studio lab's static page metadata", () => {
    expect(LAB_META).toEqual({
      path: "/lab",
      file: "lab.html",
      title: "GNSIS — an AI research lab in Toronto",
      description:
        "GNSIS is a research lab building AI that sees, listens and remembers in real time, so it can work alongside people, not just answer them.",
    });
    expect(STUDIO_PAGES).toContain(LAB_META);
  });

  it("keeps GNSIS 1.0 developer metadata out of the generated pages", () => {
    expect(MODELS_META.description).toBe(
      "Models from the GNSIS lab. Panoptic, our first release, gives agents real-time visual perception of the web.",
    );
    expect(DEVELOPERS_PANOPTIC_META).toEqual({
      path: "/developers/panoptic",
      file: "developers/panoptic.html",
      title: "Panoptic for developers — GNSIS",
      description:
        "Give your agent a live view of the screen. Request developer access to the Panoptic API, SDKs and MCP server.",
    });
    expect(DEVELOPERS_GNSIS01_META).toEqual({
      path: "/developers/gnsis-01",
      file: "developers/gnsis-01.html",
      title: "GNSIS 1.0 for developers — GNSIS",
      description: "Hand GNSIS 1.0 a task through the API and follow it to the finish. Request developer access.",
    });
    expect(STUDIO_PAGES).toContain(DEVELOPERS_PANOPTIC_META);
    expect(STUDIO_PAGES).not.toContain(DEVELOPERS_GNSIS01_META);
  });
});
