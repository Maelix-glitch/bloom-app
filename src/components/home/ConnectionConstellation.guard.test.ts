/**
 * Guard for the connection constellation (overnight Slice 2), in the
 * source-scanning style of `lib/ui.guard.test.ts`:
 *
 *  · Today mounts the section behind the page's LATCHED settled flag —
 *    the same `overviewReady` the WeekChart and Overview pieces take —
 *    never a raw store flag that can flicker or latch onto mirror data;
 *  · the section itself resolves its full gate (page latch + cycle
 *    store settling) through `constellationSettled` and renders the
 *    skeleton BEFORE any data view;
 *  · its data comes only from the real model (`connections()` in
 *    lib/home/today) fed by the real stores and the mood analytics —
 *    no second, invented correlation source may creep in.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const INDEX = read("routes/index.tsx");
const SECTION = read("components/home/ConnectionConstellation.tsx");

describe("constellation guard: Today mounts it behind the latched gate", () => {
  it("imports the section and passes the same overviewReady latch as WeekChart", () => {
    expect(INDEX).toContain(
      'import { ConnectionConstellation } from "@/components/home/ConnectionConstellation"',
    );
    expect(INDEX).toContain("<ConnectionConstellation ready={overviewReady} />");
    expect(INDEX).toContain("<WeekChart data={weekData} ready={overviewReady} />");
  });
});

describe("constellation guard: the section's own gate and data source", () => {
  it("resolves settled through constellationSettled and skeletons first", () => {
    expect(SECTION).toContain("constellationSettled({");
    expect(SECTION).toContain("periodHydrated: period.hydrated");
    expect(SECTION).toContain("periodSyncState: period.sync.state");
    const gate = SECTION.indexOf("if (!settled) return <ConnectionConstellationSkeleton />");
    const view = SECTION.indexOf("<ConnectionConstellationView");
    expect(gate).toBeGreaterThan(-1);
    expect(view).toBeGreaterThan(gate);
  });

  it("feeds the view only from the real connections() model", () => {
    expect(SECTION).toContain("connections({");
    expect(SECTION).toContain("aggregateDays(mood.entries)");
    expect(SECTION).toContain("calculateCorrelations(moodDays)");
    expect(SECTION).toContain("cycle: period.analysis");
    /* the empty state is gated on the model's own day counts */
    expect(SECTION).toContain("hasConnectionContent(model.nodes)");
  });

  it("carries no hex literals and no rose paint (rose means negative in Bloom)", () => {
    expect(SECTION).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    expect(SECTION).not.toMatch(/var\(--rose\)|\b(?:text|bg|border|stroke|fill)-rose\b/);
  });
});
