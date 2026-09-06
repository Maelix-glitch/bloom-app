import { describe, expect, it } from "vitest";

import { aggregateDays, calculateCorrelations } from "./analytics";
import { buildMoodGraph, layoutGraph } from "./graph";
import { generateDemoEntries } from "./seed";
import type { MoodEntry } from "./types";

const seed = generateDemoEntries(90);
const days = aggregateDays(seed);
const correlations = calculateCorrelations(days);

describe("buildMoodGraph", () => {
  it("is empty-but-honest with no entries", () => {
    const g = buildMoodGraph({ days: [], entries: [], correlations: [] });
    expect(g.days).toBe(0);
    expect(g.nodes.map((n) => n.id)).toEqual(["mood"]);
    expect(g.edges).toEqual([]);
    expect(g.headline).toBeNull();
    expect(g.nodes[0]!.reading).toBe("no entries yet");
  });

  it("puts every logged signal on the map and never invents one", () => {
    const g = buildMoodGraph({ days, entries: seed, correlations });
    const ids = g.nodes.filter((n) => n.kind === "signal").map((n) => n.id);
    expect(ids).toContain("energy");
    expect(ids).toContain("stress");
    expect(ids).toContain("sleep");
    // strip a signal from the record and it must vanish from the map
    const noSleep = seed.map(({ sleep: _sleep, ...rest }) => rest as MoodEntry);
    const d = aggregateDays(noSleep);
    const g2 = buildMoodGraph({
      days: d,
      entries: noSleep,
      correlations: calculateCorrelations(d),
    });
    expect(g2.nodes.map((n) => n.id)).not.toContain("sleep");
    expect(g2.edges.map((e) => e.id)).not.toContain("mood-sleep");
  });

  it("uses the analytics layer's numbers, so the map matches Intelligence", () => {
    const g = buildMoodGraph({ days, entries: seed, correlations });
    const sleep = g.edges.find((e) => e.id === "mood-sleep")!;
    const fromAnalytics = correlations.find((c) => c.key === "sleep")!;
    expect(sleep.r).toBe(fromAnalytics.r);
    expect(sleep.n).toBe(fromAnalytics.n);
    expect(sleep.evidence).toBe(fromAnalytics.evidence);
  });

  it("marks relationships with too few paired days as insufficient instead of drawing a strength", () => {
    // three days with sleep -> far below the 8-day evidence floor
    const few: MoodEntry[] = seed.slice(0, 3).map((e) => ({ ...e, sleep: 7 }));
    const d = aggregateDays(few);
    const g = buildMoodGraph({ days: d, entries: few, correlations: calculateCorrelations(d) });
    const sleep = g.edges.find((e) => e.id === "mood-sleep")!;
    expect(sleep.evidence).toBe("insufficient");
    expect(sleep.statement).toMatch(/8\+ days/);
    expect(g.headline).toBeNull();
  });

  it("shows the most frequent emotions, capped by emotionLimit", () => {
    const g = buildMoodGraph({ days, entries: seed, correlations, emotionLimit: 3 });
    const emotions = g.nodes.filter((n) => n.kind === "emotion");
    expect(emotions).toHaveLength(3);
    expect(emotions[0]!.n).toBeGreaterThanOrEqual(emotions[2]!.n);
    for (const e of emotions) expect(e.reading).toMatch(/% of entries/);
  });

  it("only cross-links signals with real evidence, at most four", () => {
    const g = buildMoodGraph({ days, entries: seed, correlations });
    const cross = g.edges.filter((e) => e.source !== "mood");
    expect(cross.length).toBeLessThanOrEqual(4);
    for (const e of cross) expect(e.evidence).not.toBe("insufficient");
  });
});

describe("layoutGraph", () => {
  const size = { width: 640, height: 440 };

  it("keeps the hub centred and every node inside the canvas", () => {
    const g = buildMoodGraph({ days, entries: seed, correlations });
    const laid = layoutGraph(g, size);
    const hub = laid.find((n) => n.id === "mood")!;
    expect(hub.x).toBe(320);
    expect(hub.y).toBe(220);
    for (const n of laid) {
      expect(n.x - n.r).toBeGreaterThanOrEqual(0);
      expect(n.x + n.r).toBeLessThanOrEqual(size.width);
      expect(n.y - n.r).toBeGreaterThanOrEqual(0);
      expect(n.y + n.r).toBeLessThanOrEqual(size.height);
    }
  });

  it("never overlaps two satellites", () => {
    const g = buildMoodGraph({ days, entries: seed, correlations });
    const laid = layoutGraph(g, size).filter((n) => n.kind !== "hub");
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        const a = laid[i]!;
        const b = laid[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
      }
    }
  });

  it("is deterministic", () => {
    const g = buildMoodGraph({ days, entries: seed, correlations });
    expect(layoutGraph(g, size)).toEqual(layoutGraph(g, size));
  });
});
