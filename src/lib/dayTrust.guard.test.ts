import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Day-trust guards (Brief v6 Slice 1 — data trust, no visuals).
 *
 * The §6 layout guards need real geometry and are verified live by the
 * parent; what CAN be pinned structurally is pinned here: the fixed
 * surfaces carry the shared definitions and formatters, and the wrong
 * strings cannot quietly come back.
 *
 *   1. Paired days: the insights engine counts progress through
 *      `pairedDays` (lib/localDay) — never a hand-rolled one-sided count.
 *   2. Logged days: the Trackers header names its scope ("with
 *      trackers"); the Today chip names its ("days with any log").
 *   3. Plurals go through `plural()` — "1 days" cannot be reassembled
 *      from a template and a bare suffix.
 *   4. The Assessment card's kcal target renders through fmtKcalApprox
 *      ("~1,350 kcal"), never a raw `~{Math.round(...)}`.
 *   5. Programme copy carries no goal-alignment prose: a programme's
 *      goal affinity is the `goals` data + the match badge, so no card
 *      can state a goal the person didn't set (M-115).
 *   6. Mono + uppercase never combine in the touched surfaces (proxy
 *      for the §6 sentence rule; the live offender is M-128, Slice 6).
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const INSIGHTS = read("lib/insights/insights.ts");
const HISTORY_TABLE = read("components/tk/HistoryTable.tsx");
const TARGETS = read("components/tk/Targets.tsx");
const ASSESSMENT_ENTRY = read("components/assessment/AssessmentEntry.tsx");
const DEFINITIONS = read("lib/programmes/definitions.ts");
const CONSTELLATION = read("components/home/ConnectionConstellation.tsx");
const TODAY_LIB = read("lib/home/today.ts");

describe("day-trust guards (v6 Slice 1)", () => {
  it("pair progress is counted by pairedDays, in the engine", () => {
    expect(INSIGHTS).toContain("pairedDays(");
    /* The pending entries carry the paired count. (A fired food
       insight's sampleDays stays foodTotal — the days its comparison
       actually ran over; that is documented in the engine, not a
       progress count.) */
    expect(INSIGHTS).toContain("sampleDays: paired,");
    expect(INSIGHTS).toContain("sampleDays: foodPaired,");
  });

  it("the Trackers header names its scope and pluralises via plural()", () => {
    expect(HISTORY_TABLE).toContain("with trackers in the record");
    expect(HISTORY_TABLE).toContain("plural(");
    expect(HISTORY_TABLE).not.toMatch(/=== 1 \? "day" : "days"/);
  });

  it("achievements pluralise via plural() — no bare `${n} days` details", () => {
    expect(TARGETS).toContain("plural(");
    expect(TARGETS).not.toMatch(/\$\{(longest|analysis\.bestStreak|analysis\.daysLogged)\} days`/);
  });

  it("the Assessment card's kcal target goes through fmtKcalApprox", () => {
    expect(ASSESSMENT_ENTRY).toContain("fmtKcalApprox(");
    expect(ASSESSMENT_ENTRY).not.toMatch(/~\{Math\.round\(targetState\.targets\.kcal\)\}/);
  });

  it("programme definitions carry no goal-alignment prose (M-115)", () => {
    expect(DEFINITIONS).not.toMatch(/aligned to a build-strength goal/i);
    expect(DEFINITIONS).not.toMatch(/Aligned to a build-strength goal/);
  });

  it("the Today chip names its definition: days with any log", () => {
    expect(CONSTELLATION).toContain("with any log");
    expect(TODAY_LIB).toContain("unionDayCount(");
  });

  it("mono and uppercase never combine in the touched surfaces", () => {
    for (const src of [HISTORY_TABLE, TARGETS, ASSESSMENT_ENTRY, CONSTELLATION]) {
      expect(src).not.toMatch(/font-mono[^"]*uppercase|uppercase[^"]*font-mono/);
    }
  });
});
