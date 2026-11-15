/**
 * The constellation's pure maths: arc geometry, centre-out placement,
 * link tones, and the settled gate the section renders behind.
 */
import { describe, expect, it } from "vitest";

import type { Connection, CrossLink } from "@/lib/home/today";
import {
  STAGE_H,
  STAGE_W,
  arcPoint,
  arcSpine,
  constellationSettled,
  hasConnectionContent,
  linkPath,
  linkTone,
  placeByStrength,
  strongestLinkFor,
} from "./constellation";

const node = (id: Connection["id"], strength: number, days = 5): Connection => ({
  id,
  strength,
  days,
  note: `${id} note`,
});

const link = (from: CrossLink["from"], to: CrossLink["to"], weight: number): CrossLink => ({
  from,
  to,
  weight,
  sentence: `${from} ↔ ${to}`,
});

describe("arc geometry", () => {
  it("keeps every point inside the stage, ends low and apex high", () => {
    for (const count of [2, 3, 5, 6]) {
      const pts = Array.from({ length: count }, (_, i) => arcPoint(i, count));
      for (const p of pts) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(STAGE_W);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(STAGE_H);
      }
      /* left → right, and (with a middle to speak of) the middle rides
         highest — smallest y — above both ends */
      for (let i = 1; i < pts.length; i++) expect(pts[i]!.x).toBeGreaterThan(pts[i - 1]!.x);
      if (count >= 3) {
        const apex = pts.reduce((m, p) => Math.min(m, p.y), Infinity);
        expect(apex).toBeLessThan(pts[0]!.y);
        expect(apex).toBeLessThan(pts[pts.length - 1]!.y);
      }
    }
  });

  it("centres a single signal at the apex", () => {
    const p = arcPoint(0, 1);
    expect(p.x).toBeCloseTo(STAGE_W / 2, 0);
    expect(p.y).toBeLessThan(120);
  });

  it("builds a spine through the arc points", () => {
    const d = arcSpine(6);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.match(/L /g)).toHaveLength(5);
    expect(arcSpine(0)).toBe("");
  });

  it("bows a link inside the arc (control point below the chord)", () => {
    const a = arcPoint(0, 6);
    const b = arcPoint(5, 6);
    const d = linkPath(a, b);
    const m = d.match(/Q ([\d.]+) ([\d.]+)/);
    expect(m).not.toBeNull();
    expect(Number(m![2])).toBeGreaterThan((a.y + b.y) / 2);
  });
});

describe("placeByStrength", () => {
  it("puts the strongest signal at the centre slot", () => {
    const nodes = [
      node("mood", 0.2),
      node("habits", 0.9),
      node("cycle", 0.1),
      node("energy", 0.5),
      node("study", 0.3),
      node("sleep", 0.4),
    ];
    const placed = placeByStrength(nodes);
    expect(placed).toHaveLength(6);
    const centre = placed.slice(2, 4).map((n) => n.id);
    expect(centre).toContain("habits");
    /* nothing lost, nothing duplicated */
    expect(new Set(placed.map((n) => n.id)).size).toBe(6);
  });

  it("is deterministic for equal strengths (model order wins)", () => {
    const nodes = [node("mood", 0.5), node("habits", 0.5), node("sleep", 0.5)];
    expect(placeByStrength(nodes).map((n) => n.id)).toEqual(
      placeByStrength(nodes).map((n) => n.id),
    );
    expect(placeByStrength(nodes)[1]!.id).toBe("mood");
  });

  it("passes through zero and one node untouched", () => {
    expect(placeByStrength([])).toEqual([]);
    expect(placeByStrength([node("mood", 0.3)]).map((n) => n.id)).toEqual(["mood"]);
  });
});

describe("linkTone", () => {
  it("reserves sage for the strongest link only", () => {
    expect(linkTone(link("mood", "sleep", 0.8), 0)).toBe("sage");
    expect(linkTone(link("mood", "sleep", 0.8), 1)).toBe("gold");
  });

  it("earns gold at a solid weight and stays a hairline below it", () => {
    expect(linkTone(link("mood", "sleep", 0.4), 2)).toBe("gold");
    expect(linkTone(link("mood", "sleep", 0.39), 2)).toBe("hairline");
  });

  it("never paints a zero-weight strongest link sage", () => {
    expect(linkTone(link("mood", "sleep", 0), 0)).toBe("hairline");
  });
});

describe("strongestLinkFor", () => {
  const links = [link("mood", "sleep", 0.8), link("habits", "energy", 0.5)];
  it("finds the first (strongest) link touching a signal, either side", () => {
    expect(strongestLinkFor(links, "sleep")?.weight).toBe(0.8);
    expect(strongestLinkFor(links, "energy")?.weight).toBe(0.5);
    expect(strongestLinkFor(links, "study")).toBeNull();
  });
});

describe("constellationSettled — the section's gate", () => {
  const SETTLED = { ready: true, periodHydrated: true, periodSyncState: "saved" };
  it("opens only when the page latch AND the cycle store have settled", () => {
    expect(constellationSettled(SETTLED)).toBe(true);
    expect(constellationSettled({ ...SETTLED, ready: false })).toBe(false);
    expect(constellationSettled({ ...SETTLED, periodHydrated: false })).toBe(false);
    expect(constellationSettled({ ...SETTLED, periodSyncState: "loading" })).toBe(false);
  });

  it("treats a failed or absent account check as settled, never a hang", () => {
    expect(constellationSettled({ ...SETTLED, periodSyncState: "error" })).toBe(true);
    expect(constellationSettled({ ...SETTLED, periodSyncState: "off" })).toBe(true);
    expect(constellationSettled({ ...SETTLED, periodSyncState: "signed-out" })).toBe(true);
  });
});

describe("hasConnectionContent", () => {
  it("needs at least one node resting on a real logged day", () => {
    expect(hasConnectionContent([node("mood", 0, 0), node("sleep", 0, 0)])).toBe(false);
    expect(hasConnectionContent([node("mood", 0, 0), node("sleep", 0.2, 3)])).toBe(true);
    expect(hasConnectionContent([])).toBe(false);
  });
});
