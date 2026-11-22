/**
 * Day-view aggregations (N-UI): provenance shares, the eating window,
 * week rhythm and the spectrum — plain sums and stated comparisons
 * over fabricated-at-the-boundary entries (the shapes the parser would
 * hand the UI), never over invented data.
 */
import { describe, expect, it } from "vitest";

import {
  eatingWindowOf,
  kcalByProvenance,
  spectrumForDay,
  weekAggregates,
} from "./dayView";
import type { LogEntry, Nutrients } from "./types";

let seq = 0;
function entry(partial: Partial<LogEntry> & { nutrients: Nutrients }): LogEntry {
  seq += 1;
  return {
    id: `e${seq}`,
    day: "2026-11-15",
    meal: "lunch",
    foodId: "usda-1",
    snapshot: null,
    name: "Food",
    amount: { grams: 100 },
    provenance: { kind: "usda", sourceId: "1", label: "USDA FoodData Central" },
    source: "search",
    createdAt: "",
    ...partial,
  };
}

const N = (kcal: number, extra: Partial<Nutrients> = {}): Nutrients => ({
  kcal,
  proteinG: 10,
  carbsG: 10,
  fatG: 5,
  ...extra,
});

describe("kcalByProvenance", () => {
  it("groups energy by source and shares out the stated-value fraction", () => {
    const shares = kcalByProvenance([
      entry({ nutrients: N(300) }),
      entry({
        nutrients: N(200),
        provenance: { kind: "user_entered", sourceId: "f1", label: "Your value" },
      }),
      entry({
        nutrients: N(100),
        foodId: null,
        snapshot: { name: "Dish", totals: N(100) },
        provenance: { kind: "coach_estimate", label: "Estimate — based on your photo" },
        source: "coach_photo",
      }),
    ]);
    expect(shares.usdaKcal).toBe(300);
    expect(shares.ownKcal).toBe(200);
    expect(shares.estimateKcal).toBe(100);
    expect(shares.totalKcal).toBe(600);
    expect(shares.verifiedShare).toBeCloseTo(500 / 600);
  });

  it("an empty day has no share to state", () => {
    expect(kcalByProvenance([]).verifiedShare).toBeNull();
  });
});

describe("eatingWindowOf", () => {
  const at = (h: number, m: number) =>
    new Date(2026, 10, 15, h, m).toISOString();

  it("spans the first and last usable timestamps", () => {
    const window = eatingWindowOf([
      entry({ nutrients: N(100), createdAt: at(13, 30) }),
      entry({ nutrients: N(100), createdAt: at(8, 0) }),
      entry({ nutrients: N(100), createdAt: "" }),
    ]);
    expect(window).toEqual({ first: "08:00", last: "13:30", spanMinutes: 330 });
  });

  it("is null when no entry carries a usable time — nothing backfilled", () => {
    expect(eatingWindowOf([entry({ nutrients: N(100), createdAt: "" })])).toBeNull();
    expect(eatingWindowOf([entry({ nutrients: N(100), createdAt: "not-a-date" })])).toBeNull();
    expect(eatingWindowOf([])).toBeNull();
  });

  it("a single sitting has zero span", () => {
    const window = eatingWindowOf([entry({ nutrients: N(100), createdAt: at(9, 15) })]);
    expect(window?.spanMinutes).toBe(0);
    expect(window?.first).toBe("09:15");
  });
});

describe("weekAggregates", () => {
  const entries = [
    entry({ day: "2026-11-15", nutrients: N(2000, { proteinG: 100 }) }),
    entry({ day: "2026-11-13", nutrients: N(1000, { proteinG: 40 }) }),
  ];
  /* N() fixes protein at 10 unless overridden — rebuild honestly: */
  const honest = [
    { ...entries[0]!, nutrients: { kcal: 2000, proteinG: 100, carbsG: 200, fatG: 60 } },
    { ...entries[1]!, nutrients: { kcal: 1000, proteinG: 40, carbsG: 100, fatG: 30 } },
  ];

  it("windows seven days ending on the selected day, averages over logged days only", () => {
    const week = weekAggregates(honest, "2026-11-15", 100);
    expect(week.days).toHaveLength(7);
    expect(week.days[0]!.day).toBe("2026-11-09");
    expect(week.days[6]!.day).toBe("2026-11-15");
    expect(week.loggedDays).toBe(2);
    expect(week.avgKcal).toBe(1500);
    expect(week.avgProteinG).toBe(70);
    expect(week.days[5]!.totals).toBeNull(); /* 2026-11-14: an honest gap */
  });

  it("counts protein-hit days at ≥90% of target, and refuses to judge without one", () => {
    expect(weekAggregates(honest, "2026-11-15", 100).proteinHitDays).toBe(1);
    expect(weekAggregates(honest, "2026-11-15", null).proteinHitDays).toBeNull();
  });

  it("an empty week averages to null, never zero", () => {
    const week = weekAggregates([], "2026-11-15", 100);
    expect(week.avgKcal).toBeNull();
    expect(week.avgProteinG).toBeNull();
    expect(week.loggedDays).toBe(0);
  });
});

describe("spectrumForDay", () => {
  it("marks a total incomplete when any logged food did not report it", () => {
    const rows = spectrumForDay(
      [
        entry({ nutrients: N(500, { potassiumMg: 400, fibreG: 5, sodiumMg: 300 }) }),
        entry({ nutrients: N(300) }),
      ],
      "female",
    );
    const potassium = rows.find((r) => r.key === "potassiumMg")!;
    expect(potassium.value).toBe(400);
    expect(potassium.incomplete).toBe(true);
    expect(potassium.reference).toBe(3500);
    const iron = rows.find((r) => r.key === "ironMg")!;
    expect(iron.value).toBeNull(); /* nobody reported it: not reported, not zero */
    expect(iron.reference).toBe(29); /* ICMR-NIN RDA 2020, women */
  });

  it("sodium is a ceiling and magnesium follows the stated sex", () => {
    const rows = spectrumForDay([], null);
    expect(rows.find((r) => r.key === "sodiumMg")).toMatchObject({
      reference: 2000,
      limit: true,
    });
    /* ICMR-NIN RDA 2020 (M-219, audit F-09): 440 mg men / 370 mg
       women. The table previously carried the EAR figures (370/310)
       under the RDA citation. Unstated sex takes the male value —
       the module's stated default. */
    expect(rows.find((r) => r.key === "magnesiumMg")!.reference).toBe(440);
    expect(
      spectrumForDay([], "female").find((r) => r.key === "magnesiumMg")!.reference,
    ).toBe(370);
  });

  it("vitamin C is the ICMR-NIN RDA 2020 value — 80 mg men, 65 mg women", () => {
    /* M-219 (audit F-09): the RDA is sex-specific; the panel used to
       show 80 mg for everyone. Unstated sex takes the male value. */
    expect(spectrumForDay([], null).find((r) => r.key === "vitaminCMg")).toMatchObject({
      reference: 80,
      unit: "mg",
      limit: false,
    });
    expect(spectrumForDay([], "male").find((r) => r.key === "vitaminCMg")!.reference).toBe(80);
    expect(spectrumForDay([], "female").find((r) => r.key === "vitaminCMg")!.reference).toBe(65);
  });
});
