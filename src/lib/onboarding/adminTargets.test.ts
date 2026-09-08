import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ADMIN_GROUP_LABEL,
  ADMIN_TARGETS,
  adminTargetsByGroup,
} from "./adminTargets";

/**
 * The launcher's whole value is that every door in it opens. A target pointing
 * at a route that was renamed or removed is worse than no launcher — it looks
 * like the app is broken. So the list is checked against the router's actual
 * file tree rather than against a second hardcoded list.
 */

const ROUTES = join(process.cwd(), "src/routes");

/** Does a TanStack file route exist for this path? */
function routeExists(to: string): boolean {
  if (to === "/") return existsSync(join(ROUTES, "index.tsx"));
  const rel = to.replace(/^\//, "");
  /* "/cycle" -> cycle.tsx or cycle/index.tsx; "/admin/rewards" -> admin/rewards.tsx */
  return (
    existsSync(join(ROUTES, `${rel}.tsx`)) || existsSync(join(ROUTES, rel, "index.tsx"))
  );
}

describe("every admin target resolves to a real route", () => {
  it.each(ADMIN_TARGETS.map((t) => [t.label, t.to] as const))(
    "%s -> %s",
    (_label, to) => {
      expect(routeExists(to)).toBe(true);
    },
  );
});

describe("the target list", () => {
  it("has unique ids", () => {
    const ids = ADMIN_TARGETS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique destinations", () => {
    const tos = ADMIN_TARGETS.map((t) => t.to);
    expect(new Set(tos).size).toBe(tos.length);
  });

  it("gives every entry a label and a one-line detail", () => {
    for (const t of ADMIN_TARGETS) {
      expect(t.label.trim().length).toBeGreaterThan(0);
      expect(t.detail.trim().length).toBeGreaterThan(0);
      /* a "detail" that runs to three lines defeats the scannable list */
      expect(t.detail.length).toBeLessThan(70);
    }
  });

  it("reaches the surfaces that no navigation links to", () => {
    /* the reason the launcher exists at all */
    const tos = ADMIN_TARGETS.map((t) => t.to);
    for (const hidden of ["/cycle-styles", "/trackers-styles", "/admin/rewards"]) {
      expect(tos).toContain(hidden);
    }
  });
});

describe("grouping", () => {
  it("places every target in exactly one group", () => {
    const grouped = adminTargetsByGroup().flatMap((g) => g.items);
    expect(grouped).toHaveLength(ADMIN_TARGETS.length);
    expect(new Set(grouped.map((t) => t.id)).size).toBe(ADMIN_TARGETS.length);
  });

  it("labels every group it emits", () => {
    for (const g of adminTargetsByGroup()) {
      expect(g.label).toBe(ADMIN_GROUP_LABEL[g.group]);
      expect(g.items.length).toBeGreaterThan(0);
    }
  });
});

describe("route discovery sanity", () => {
  it("actually finds routes (guards the helper itself)", () => {
    /* If routeExists were broken and always returned true, the suite above
       would pass vacuously. Prove it can say no. */
    expect(routeExists("/definitely-not-a-route")).toBe(false);
    expect(readdirSync(ROUTES).length).toBeGreaterThan(0);
  });
});
