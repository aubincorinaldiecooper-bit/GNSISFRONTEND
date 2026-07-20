import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// With `globals: false`, testing-library doesn't auto-register cleanup, so do it
// here — otherwise rendered DOM accumulates across tests in the same file.
afterEach(() => {
  cleanup();
});
