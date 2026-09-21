import { describe, it, expect } from "vitest";

import { ADMIN_BASE, adminPath, stripAdminBase } from "./adminRoutes";

describe("adminPath", () => {
  it("prefixes a dashboard-relative path", () => {
    expect(adminPath("/runs")).toBe("/admin/runs");
    expect(adminPath("/runs/run-1")).toBe("/admin/runs/run-1");
  });

  it("accepts a path without a leading slash", () => {
    expect(adminPath("runs")).toBe("/admin/runs");
  });

  it("returns the base itself for the root and for an empty value", () => {
    expect(adminPath("/")).toBe(ADMIN_BASE);
    expect(adminPath("")).toBe(ADMIN_BASE);
  });
});

describe("stripAdminBase", () => {
  it("removes the base from a real pathname", () => {
    expect(stripAdminBase("/admin/runs")).toBe("/runs");
    expect(stripAdminBase("/admin/runs/run-1")).toBe("/runs/run-1");
  });

  it("maps the bare base to the dashboard root", () => {
    expect(stripAdminBase("/admin")).toBe("/");
  });

  it("leaves a path outside the base untouched", () => {
    expect(stripAdminBase("/")).toBe("/");
    expect(stripAdminBase("/login")).toBe("/login");
  });

  it("does not treat a path that merely starts with the same letters as admin", () => {
    // "/administration" is not "/admin" + "/istration"; without the separator
    // check this would be silently rewritten to "istration".
    expect(stripAdminBase("/administration")).toBe("/administration");
    expect(stripAdminBase("/adminx/runs")).toBe("/adminx/runs");
  });

  it("round-trips with adminPath", () => {
    for (const path of ["/new", "/runs", "/runs/run-1", "/settings", "/billing"]) {
      expect(stripAdminBase(adminPath(path))).toBe(path);
    }
  });
});
