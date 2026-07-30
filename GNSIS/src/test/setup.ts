import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// With `globals: false`, testing-library doesn't auto-register cleanup, so do it
// here — otherwise rendered DOM accumulates across tests in the same file.
afterEach(() => {
  cleanup();
});

// jsdom has no ResizeObserver; Radix's Popper/Tooltip primitives construct one
// on mount. Without a stub, any test that mounts one throws an uncaught
// ReferenceError outside the test body.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
