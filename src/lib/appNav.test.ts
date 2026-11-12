import { describe, expect, it } from "vitest";

import { routeShowsAppNav } from "./appNav";

/**
 * The root layout mounts the app chrome once, through AppNavGate, on
 * exactly the routes that rendered it when every page carried its own
 * copy. These cases pin that set: a route gaining or losing the rail is
 * a visible product change (a public page with a signed-in rail, or a
 * main section with no navigation), so it should fail loudly here.
 */
describe("routeShowsAppNav", () => {
  it("shows the chrome on every main section", () => {
    for (const p of [
      "/",
      "/trackers",
      "/cycle",
      "/mood",
      "/rewards",
      "/coach",
      "/profile",
      "/report",
    ]) {
      expect(routeShowsAppNav(p), p).toBe(true);
    }
  });

  it("shows the chrome on nested app routes", () => {
    for (const p of ["/mood/intelligence", "/rewards/atelier", "/admin/progression"]) {
      expect(routeShowsAppNav(p), p).toBe(true);
    }
  });

  it("keeps the chrome off the public surfaces", () => {
    for (const p of ["/privacy", "/terms", "/@maelix", "/someone"]) {
      expect(routeShowsAppNav(p), p).toBe(false);
    }
  });

  it("keeps the chrome off the pages that carry their own headers", () => {
    for (const p of ["/dashboard", "/admin/rewards", "/admin"]) {
      expect(routeShowsAppNav(p), p).toBe(false);
    }
  });

  it("keeps the chrome off unmatched paths, so the 404 stands alone", () => {
    for (const p of ["/nope", "/trackersx", "/moodboard", "/coaching"]) {
      expect(routeShowsAppNav(p), p).toBe(false);
    }
  });
});
