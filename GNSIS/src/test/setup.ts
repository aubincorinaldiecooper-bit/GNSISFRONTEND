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

// jsdom has no IntersectionObserver either; Motion's scroll reveals construct
// one on mount. This stand-in reports every element as in view at once.
if (!("IntersectionObserver" in globalThis)) {
  globalThis.IntersectionObserver = class {
    private readonly callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    observe(target: Element) {
      this.callback(
        [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    readonly root = null;
    readonly rootMargin = "0px";
    readonly thresholds = [0];
  } as unknown as typeof IntersectionObserver;
}
