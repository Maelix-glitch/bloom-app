/**
 * Orbit geometry + words (Brief v6 Slice 4), pinned:
 *  · the layout is pure and deterministic — same input, same drawing;
 *  · nodes sit on ONE ring, evenly angled from the top; a node's
 *    distance from the centre and its size scale with its sample
 *    (more logged days = closer and larger);
 *  · at the owner's data shape (7 nodes) no two nodes crowd — the
 *    minimum pairwise centre distance stays above the largest node;
 *  · strength words come from the tracker engine's own |r| bands
 *    (strong ≥ 0.6, moderate ≥ 0.35 — lib/trackers/core), renamed for
 *    the section: Strong link / Some link / Faint link;
 *  · arcs are quadratic bows pulled toward the centre, endpoints exact;
 *  · constellation pairs map to insights kinds only where the pair is
 *    genuinely the same pair.
 */
import { describe, expect, it } from "vitest";

import {
  ORBIT_LABELS,
  ORBIT_R_FAR,
  ORBIT_R_NEAR,
  ORBIT_SIZE_MAX,
  ORBIT_SIZE_MIN,
  arcPath,
  insightKindForPair,
  orbitLayout,
  strengthWord,
} from "./orbit";

const node = (key: string, daysLogged: number, windowDays = 30) => ({
  key,
  daysLogged,
  windowDays,
});

describe("orbitLayout", () => {
  it("is deterministic: same input, identical layout", () => {
    const input = [node("mood", 24), node("sleep", 18), node("habits", 9)];
    expect(orbitLayout(input)).toEqual(orbitLayout(input));
  });

  it("puts the first node at the top of the ring", () => {
    const [first] = orbitLayout([node("mood", 15), node("sleep", 15)]);
    expect(first!.x).toBe(50);
    expect(first!.y).toBeLessThan(50);
  });

  it("spaces four nodes at the compass points", () => {
    const pts = orbitLayout([node("a", 15), node("b", 15), node("c", 15), node("d", 15)]);
    expect(pts[0]).toMatchObject({ x: 50 });
    expect(pts[1]!.x).toBeGreaterThan(50);
    expect(pts[1]!.y).toBe(50);
    expect(pts[2]).toMatchObject({ x: 50 });
    expect(pts[2]!.y).toBeGreaterThan(50);
    expect(pts[3]!.x).toBeLessThan(50);
    expect(pts[3]!.y).toBe(50);
  });

  it("pulls a well-logged node closer and makes it larger", () => {
    const [sparse, rich] = orbitLayout([node("sparse", 0), node("rich", 30)]);
    expect(sparse!.radius).toBe(ORBIT_R_FAR);
    expect(sparse!.size).toBe(ORBIT_SIZE_MIN);
    expect(rich!.radius).toBe(ORBIT_R_NEAR);
    expect(rich!.size).toBe(ORBIT_SIZE_MAX);
    expect(rich!.radius).toBeLessThan(sparse!.radius);
    expect(rich!.size).toBeGreaterThan(sparse!.size);
  });

  it("clamps an over-window sample to full coverage", () => {
    const [p] = orbitLayout([node("over", 45)]);
    expect(p!.coverage).toBe(1);
    expect(p!.radius).toBe(ORBIT_R_NEAR);
  });

  it("keeps 7 nodes uncrowded at the owner's data shape", () => {
    const days = [24, 18, 9, 12, 6, 20, 3];
    const pts = orbitLayout(days.map((d, i) => node(`n${i}`, d)));
    let min = Infinity;
    for (let i = 0; i < pts.length; i += 1) {
      for (let j = i + 1; j < pts.length; j += 1) {
        min = Math.min(min, Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y));
      }
    }
    /* centres never closer than the largest node's diameter + air */
    expect(min).toBeGreaterThan(ORBIT_SIZE_MAX + 2);
  });
});

describe("strengthWord — the tracker engine's bands, in words", () => {
  it("grades |r| exactly where lib/trackers/core grades it", () => {
    expect(strengthWord(0.9)).toBe("Strong link");
    expect(strengthWord(0.6)).toBe("Strong link");
    expect(strengthWord(0.599)).toBe("Some link");
    expect(strengthWord(0.35)).toBe("Some link");
    expect(strengthWord(0.349)).toBe("Faint link");
    expect(strengthWord(0)).toBe("Faint link");
  });
});

describe("arcPath", () => {
  it("starts and ends exactly on its two nodes", () => {
    const d = arcPath({ x: 50, y: 12 }, { x: 88, y: 50 });
    expect(d.startsWith("M 50 12 Q ")).toBe(true);
    expect(d.endsWith(" 88 50")).toBe(true);
  });

  it("bows toward the centre, never outward", () => {
    const d = arcPath({ x: 50, y: 12 }, { x: 88, y: 50 });
    const ctrl = /Q ([\d.]+) ([\d.]+) /.exec(d)!;
    const cx = Number(ctrl[1]);
    const cy = Number(ctrl[2]);
    const midDist = Math.hypot(69 - 50, 31 - 50);
    expect(Math.hypot(cx - 50, cy - 50)).toBeLessThan(midDist);
  });
});

describe("insightKindForPair", () => {
  it("matches only the pairs the insights engine actually speaks", () => {
    expect(insightKindForPair("mood", "sleep")).toBe("sleep-mood");
    expect(insightKindForPair("sleep", "mood")).toBe("sleep-mood");
    expect(insightKindForPair("sleep", "energy")).toBe("sleep-energy");
    expect(insightKindForPair("habits", "mood")).toBe("habits-mood");
    expect(insightKindForPair("sleep", "study")).toBeNull();
    expect(insightKindForPair("mood", "energy")).toBeNull();
    expect(insightKindForPair("cycle", "mood")).toBeNull();
  });
});

describe("ORBIT_LABELS", () => {
  it("is the sentence-case signal label set — one word, capitalised", () => {
    for (const label of ORBIT_LABELS) expect(label).toMatch(/^[A-Z][a-z]+$/);
    expect(ORBIT_LABELS).toContain("Sleep");
    expect(ORBIT_LABELS).toContain("Mood");
    expect(ORBIT_LABELS).toContain("Habits");
  });
});
