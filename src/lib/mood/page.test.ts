import { describe, expect, it } from "vitest";

import type { DayAggregate, MoodEntry } from "./types";
import {
  consistencyDelta,
  distributionNote,
  distributionSlices,
  entryFromFace,
  faceForEntry,
  faceForScore,
  journeyPoints,
  quickInsights,
  streakLine,
  todayEntry,
  weekDots,
} from "./page";

const entry = (over: Partial<MoodEntry>): MoodEntry => ({
  id: "x",
  timestamp: "2026-09-06T09:00:00.000Z",
  mood: 6,
  energy: 5,
  stress: 4,
  emotions: [],
  tags: [],
  ...over,
});

const day = (date: string, mood: number, emotions: MoodEntry["emotions"] = []): DayAggregate => ({
  date,
  mood,
  energy: 5,
  stress: 4,
  entries: [],
  emotions,
});

describe("mood page view-model", () => {
  it("maps an entry to a face by tagged emotion first, then by score", () => {
    expect(faceForEntry({ mood: 2, emotions: ["grateful"] })).toBe("happy");
    expect(faceForEntry({ mood: 9, emotions: ["frustrated"] })).toBe("angry");
    expect(faceForEntry({ mood: 9, emotions: [] })).toBe("happy");
    expect(faceForScore(7)).toBe("calm");
    expect(faceForScore(5.5)).toBe("neutral");
    expect(faceForScore(4)).toBe("sad");
    expect(faceForScore(2)).toBe("anxious");
  });

  it("picks the latest entry logged today, ignoring future-stamped ones", () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const early = new Date(now.getTime() - 2 * 3600_000).toISOString();
    const recent = new Date(now.getTime() - 60_000).toISOString();
    const future = new Date(now.getTime() + 3 * 3600_000).toISOString();
    const a = entry({ id: "a", timestamp: early });
    const b = entry({ id: "b", timestamp: recent });
    const c = entry({ id: "c", timestamp: future });
    const old = entry({ id: "old", timestamp: "2020-01-01T10:00:00" });
    expect(todayEntry([old, a, b], today)?.id).toBe("b");
    // a hand-set later time doesn't hide the fresh check-in…
    expect(todayEntry([old, a, c, b], today)?.id).toBe("b");
    // …but if it's all there is, it still counts as today's entry
    expect(todayEntry([c], today)?.id).toBe("c");
    expect(todayEntry([old], today)).toBeNull();
  });

  it("builds a real entry from a face tap", () => {
    const e = entryFromFace("anxious", new Date("2026-09-06T10:00:00Z"));
    expect(e.emotions).toEqual(["anxious"]);
    expect(e.stress).toBeGreaterThan(e.mood);
    expect(e.timestamp).toBe("2026-09-06T10:00:00.000Z");
  });

  it("turns the last seven logged days into 0..1 chart points", () => {
    const days = Array.from({ length: 10 }, (_, i) =>
      day(`2026-09-${String(i + 1).padStart(2, "0")}`, 1 + i),
    );
    const pts = journeyPoints(days, 7);
    expect(pts).toHaveLength(7);
    expect(pts[0]!.date).toBe("2026-09-04");
    expect(pts[6]!.value).toBe(1);
    expect(pts[0]!.value).toBeCloseTo(3 / 9);
  });

  it("buckets days for the distribution ring and writes an honest note", () => {
    const days = [day("2026-09-01", 9), day("2026-09-02", 8.7), day("2026-09-03", 5)];
    const slices = distributionSlices(days);
    expect(slices.map((s) => s.value)).toEqual([2, 0, 0, 1, 0]);
    expect(distributionNote(days, "Last 30 days")).toMatch(/Excellent days are your most common/);
    expect(distributionNote([], "Last 30 days")).toMatch(/Log a few days/);
  });

  it("never invents insights from too little data", () => {
    expect(
      quickInsights({
        entries: [],
        days: [day("2026-09-01", 6)],
        avg: 6,
        prevAvg: 0,
        changePct: null,
        volatility: 0,
        emotions: [],
      }),
    ).toEqual([]);
  });

  it("reports a lift, a time-of-day pattern and the top emotion", () => {
    const entries = [
      entry({ id: "1", timestamp: "2026-09-01T08:00:00", mood: 5, emotions: ["calm"] }),
      entry({ id: "2", timestamp: "2026-09-02T08:00:00", mood: 5, emotions: ["calm"] }),
      entry({ id: "3", timestamp: "2026-09-03T20:00:00", mood: 8, emotions: ["calm"] }),
      entry({ id: "4", timestamp: "2026-09-04T20:00:00", mood: 9, emotions: ["happy"] }),
    ];
    const out = quickInsights({
      entries,
      days: entries.map((e) => day(e.timestamp.slice(0, 10), e.mood)),
      avg: 6.75,
      prevAvg: 5,
      changePct: 35,
      volatility: 2,
      emotions: [{ label: "Calm", count: 3, share: 75 }],
    });
    expect(out.map((i) => i.id)).toEqual(["trend", "timing", "emotion"]);
    expect(out[0]!.text).toMatch(/lifted 35%/);
    expect(out[1]!.text).toMatch(/evening check-ins/);
  });

  it("marks the last seven days and compares the two weeks", () => {
    const today = "2026-09-06";
    const days = [day("2026-09-06", 7), day("2026-09-05", 7), day("2026-09-03", 6)];
    expect(weekDots(days, today)).toEqual([false, false, false, true, false, true, true]);
    expect(consistencyDelta(days, today)).toBeNull(); // nothing the week before
    const withLastWeek = [...days, day("2026-08-30", 6)];
    expect(consistencyDelta(withLastWeek, today)).toBe(200);
    expect(streakLine(0, null, 0)).toMatch(/first check-in/);
    expect(streakLine(2, 200, 3)).toMatch(/more consistent/);
  });
});
