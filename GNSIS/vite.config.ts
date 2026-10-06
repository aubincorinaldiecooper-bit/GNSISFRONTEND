import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { SITE_PAGES, withPageMeta } from "./src/panoptic/pageMeta"

// Each Panoptic and studio page gets its own copy of the built index.html, with its own
// title, description and preview picture, so link previews (which never run
// the page) show the page and not the console. Caddy serves /privacy from
// privacy.html and so on; everything else still gets index.html.
function panopticPageHtml(): Plugin {
  return {
    name: "panoptic-page-html",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const index = bundle["index.html"]
      if (!index || index.type !== "asset") {
        throw new Error("panoptic-page-html: the build produced no index.html")
      }
      for (const page of SITE_PAGES) {
        this.emitFile({ type: "asset", fileName: page.file, source: withPageMeta(String(index.source), page) })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react(), panopticPageHtml()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
