import { afterEach, describe, expect, it } from "vitest";

import { currentAccess, handOffTask, routeTask, takePendingTask } from "./taskFlow";

afterEach(() => window.sessionStorage.clear());

describe("where a submitted task goes", () => {
  it("goes to early access today, because nobody has access yet", () => {
    expect(currentAccess().enabled).toBe(false);
    expect(routeTask(" Find me a flight to Montreal next Friday ")).toEqual({
      kind: "early-access",
      task: " Find me a flight to Montreal next Friday ",
    });
  });

  it("goes into a session, task and all, once access and a session address exist", () => {
    expect(routeTask("find the summit", { enabled: true, sessionPath: "/video-search/session" })).toEqual({
      kind: "session",
      task: "find the summit",
      path: "/video-search/session",
    });
  });

  it("never sends anyone to a session with nowhere to go", () => {
    expect(routeTask("find the summit", { enabled: true, sessionPath: null }).kind).toBe("early-access");
  });

  it("hands a task to the session screen once", () => {
    handOffTask("find the summit");
    expect(takePendingTask()).toBe("find the summit");
    expect(takePendingTask()).toBeNull();
  });
});
