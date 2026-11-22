import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Loading-state guard (M-202, Final Audit F-01).
 *
 * The audit's cold-load finding: surfaces whose data had not landed
 * showed a bare "—" or "…" where a number or name belongs (the sidebar
 * points card, the points chip, the rail profile, the Journey hero),
 * and whole Journey sections collapsed to a "Loading…" paragraph.
 * The house pattern already exists — Profile holds its shape with a
 * shaped skeleton screen, Today holds its hero line's space — so the
 * fix holds every waiting surface to it: a skeleton in the slot the
 * content will take, the real layout reserved, the loading word kept
 * for screen readers only. These pins keep the placeholder characters
 * from creeping back into the number/name slots.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), "src", rel), "utf8");

describe("loading guard: waiting surfaces hold their shape (M-202, F-01)", () => {
  it("the points card and chip skeleton their number slots — no dash, no ellipsis", () => {
    for (const rel of ["components/home/RailPointsCard.tsx", "components/system/PointsChip.tsx"]) {
      const src = read(rel);
      expect(src, `${rel} must skeleton its loading slots`).toContain("Skeleton");
      expect(src, `${rel} must not dash its loading balance`).not.toMatch(/loading \? "—"/);
      expect(src, `${rel} must not ellipsis its loading values`).not.toMatch(/loading \? "…"/);
    }
  });

  it("the rail profile skeletons its name and plan lines while the session restores", () => {
    const src = read("components/home/HomeSidebar.tsx");
    expect(src).toContain("Skeleton");
    expect(src).not.toMatch(/\? "…"/);
  });

  it("the Journey hero skeletons its slots and keeps the spoken loading line", () => {
    const src = read("components/progression/JourneyHero.tsx");
    expect(src).not.toMatch(/loading \? "—"/);
    expect(src).not.toContain('"Rank —"');
    /* The screen-reader announcement survives — render.smoke pins it too. */
    expect(src).toContain("Loading your points");
  });

  it("the Journey page's sections wait as shaped skeletons, not bare Loading lines", () => {
    const src = read("components/progression/page.tsx");
    expect(src).not.toContain('<p className="pg-empty">Loading…</p>');
    expect(src).not.toContain('<p className="pg-empty">Loading your achievements…</p>');
    expect(src).toContain("PgLoading");
  });
});
