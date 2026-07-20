import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// A dedicated test config: the React plugin + the `@` alias, without the dev-only
// inspect plugin from vite.config.ts. jsdom gives components a DOM to render into.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    restoreMocks: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
