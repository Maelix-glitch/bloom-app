import { describe, expect, it } from "vitest";

import {
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type DietaryPattern,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY } from "./data/dishLibrary";
import type { Dish } from "./dishes";
import {
  generatePlan,
  parsePlanValue,
  planStaleness,
  planInputsSnapshotOf,
  planValueOf,
  type DailyPlan,
  type PlanTimelineItem,
} from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food } from "./types";

/**
 * P12 acceptance — the full-day timeline (owner directive
 * 2026-11-19): every plan lays its day out from waking to sleep.
 * Clock times come ONLY from the person's own usual wake/bed
 * times (their sleep log's median window, passed in by the
 * caller); without them the timeline is relative and carries no
 * times at all. The timeline schedules the composed plan — the
 * 1000-run matrix (planMatrix1000.test.ts) proves the invariants
 * across the input space; this file pins the mechanisms.
 */

const NOW = "2026-11-19T03:00:00.000Z";
const DAY = "2026-11-19";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

function fullProfile(
  pattern: DietaryPattern | null,
  opts: { mealsPerDay?: number | null } = {},
): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(80, "kg"), PROVENANCE),
    goal: "maintain",
    activity: "moderate",
    rateKgPerWeek: 0,
    dietary: {
      ...EMPTY_DIETARY,
      pattern,
      mealsPerDay: "mealsPerDay" in opts ? opts.mealsPerDay : 3,
    },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
    },
  };
}

function gen(
  profile: HealthProfile,
  opts: {
    day?: string;
    foods?: readonly Food[];
    dishes?: readonly Dish[] | null;
    wakeTime?: string | null;
    bedTime?: string | null;
  } = {},
): DailyPlan {
  const day = opts.day ?? DAY;
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, day),
    fallbackTargets: null,
    foods: opts.foods ?? USDA_REFERENCE_FOODS,
    ...(opts.dishes === null ? {} : { dishes: opts.dishes ?? DISH_LIBRARY }),
    ...(opts.wakeTime !== undefined ? { wakeTime: opts.wakeTime } : {}),
    ...(opts.bedTime !== undefined ? { bedTime: opts.bedTime } : {}),
    day,
    now: NOW,
    id: "plan-p12",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

const minutesOf = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Minutes on the day's own line: the first item's clock is the
 *  origin; later clocks that wrap past midnight count forward. */
function dayLine(items: PlanTimelineItem[]): number[] {
  const origin = minutesOf(items[0]!.time!);
  return items.map((item) => {
    let t = minutesOf(item.time!);
    if (t < origin) t += 1440;
    return t;
  });
}

const eatingItems = (plan: DailyPlan): PlanTimelineItem[] =>
  plan.timeline!.items.filter((i) => i.kind === "meal");

describe("P12 · the relative day", () => {
  it("no clock known: the timeline runs wake to sleep with no times at all", () => {
    const plan = gen(fullProfile("omnivore"));
    expect(plan.timeline).toBeDefined();
    expect(plan.timeline!.anchor).toBe("relative");
    const items = plan.timeline!.items;
    expect(items[0]).toMatchObject({ kind: "wake", label: "On waking", time: null });
    expect(items[items.length - 1]).toMatchObject({ kind: "sleep", label: "Bedtime", time: null });
    expect(items.every((i) => i.time === null)).toBe(true);
    /* Every composed meal appears exactly once, in day order. */
    const meals = items.filter((i) => i.kind === "meal").map((i) => i.meal);
    expect(new Set(meals).size).toBe(meals.length);
    expect([...meals].sort()).toEqual(plan.meals.map((m) => m.meal).sort());
    expect(items.some((i) => i.kind === "wind_down")).toBe(true);
    /* The snapshot records the absence of an anchor honestly. */
    expect(plan.inputs.wakeTime).toBeNull();
    expect(plan.inputs.bedTime).toBeNull();
  });

  it("a one-meal day still opens and closes: wake, lunch, snack, wind-down, sleep", () => {
    const plan = gen(fullProfile("omnivore", { mealsPerDay: 1 }));
    const kinds = plan.timeline!.items.map((i) => i.kind);
    expect(kinds[0]).toBe("wake");
    expect(kinds[kinds.length - 1]).toBe("sleep");
    expect(plan.timeline!.items.filter((i) => i.kind === "meal").map((i) => i.meal)).toEqual([
      "lunch",
      "snack",
    ]);
  });
});

describe("P12 · the clock-anchored day", () => {
  it("the person's usual times frame the day; meals are spaced inside it", () => {
    const plan = gen(fullProfile("omnivore"), { wakeTime: "06:30", bedTime: "22:30" });
    expect(plan.timeline!.anchor).toBe("sleep_log");
    const items = plan.timeline!.items;
    expect(items[0]!.time).toBe("06:30");
    expect(items[items.length - 1]!.time).toBe("22:30");
    expect(plan.inputs.wakeTime).toBe("06:30");
    expect(plan.inputs.bedTime).toBe("22:30");
    const line = dayLine(items);
    for (let i = 1; i < line.length; i++) {
      expect(line[i]!).toBeGreaterThan(line[i - 1]!);
    }
    const eating = eatingItems(plan);
    const eatingLine = dayLine(eating);
    for (let i = 1; i < eatingLine.length; i++) {
      expect(eatingLine[i]! - eatingLine[i - 1]!).toBeGreaterThanOrEqual(90);
    }
    /* The last eating item keeps at least an hour clear of bed. */
    const bed = minutesOf("22:30");
    expect(bed - eatingLine[eatingLine.length - 1]!).toBeGreaterThanOrEqual(60);
    /* The wind-down sits between the last meal and bed. */
    const windDown = items.find((i) => i.kind === "wind_down")!;
    expect(windDown.time).toBe("21:45");
  });

  it("a bed past midnight still frames one day", () => {
    const plan = gen(fullProfile("omnivore"), { wakeTime: "08:00", bedTime: "00:30" });
    expect(plan.timeline!.anchor).toBe("sleep_log");
    const items = plan.timeline!.items;
    expect(items[0]!.time).toBe("08:00");
    expect(items[items.length - 1]!.time).toBe("00:30");
    const line = dayLine(items);
    for (let i = 1; i < line.length; i++) {
      expect(line[i]!).toBeGreaterThan(line[i - 1]!);
    }
  });

  it("an unusable anchor falls back to relative — never a forced schedule", () => {
    /* A five-hour awake span cannot hold a day's spacing. */
    const squeezed = gen(fullProfile("omnivore"), { wakeTime: "07:00", bedTime: "12:00" });
    expect(squeezed.timeline!.anchor).toBe("relative");
    expect(squeezed.timeline!.items.every((i) => i.time === null)).toBe(true);
    expect(squeezed.inputs.wakeTime).toBeNull();
    /* Malformed times are not an anchor either. */
    const malformed = gen(fullProfile("omnivore"), { wakeTime: "7am", bedTime: "23:00" });
    expect(malformed.timeline!.anchor).toBe("relative");
    /* Only one of the pair is no anchor. */
    const half = gen(fullProfile("omnivore"), { wakeTime: "07:00" });
    expect(half.timeline!.anchor).toBe("relative");
  });

  it("the snack takes the day's emptiest stretch and is named for it", () => {
    const plan = gen(fullProfile("omnivore"), { wakeTime: "07:00", bedTime: "23:00" });
    const snack = plan.timeline!.items.find((i) => i.meal === "snack")!;
    expect(snack.label).toMatch(/snack$/);
    expect(["Mid-morning snack", "Afternoon snack", "Evening snack"]).toContain(snack.label);
  });
});

describe("P12 · storage and staleness", () => {
  it("the timeline survives a storage round-trip exactly", () => {
    const plan = gen(fullProfile("omnivore"), { wakeTime: "06:30", bedTime: "22:30" });
    const parsed = parsePlanValue(JSON.parse(JSON.stringify(planValueOf(plan))));
    expect(parsed).toEqual(plan);
  });

  it("a tampered timeline is refused whole", () => {
    const plan = gen(fullProfile("omnivore"), { wakeTime: "06:30", bedTime: "22:30" });
    const raw = JSON.parse(JSON.stringify(planValueOf(plan)));
    /* A relative day carrying a clock time is not a timeline this
       engine wrote. */
    raw.plan.timeline.anchor = "relative";
    expect(parsePlanValue(raw)).toBeNull();
    const raw2 = JSON.parse(JSON.stringify(planValueOf(plan)));
    /* Dropping a meal from the timeline breaks its identity. */
    raw2.plan.timeline.items = raw2.plan.timeline.items.filter(
      (i: PlanTimelineItem) => i.kind !== "meal",
    );
    expect(parsePlanValue(raw2)).toBeNull();
  });

  it("a pre-P12 stored plan (no timeline) still parses", () => {
    const plan = gen(fullProfile("omnivore"));
    const raw = JSON.parse(JSON.stringify(planValueOf(plan)));
    delete raw.plan.timeline;
    delete raw.plan.inputs.wakeTime;
    delete raw.plan.inputs.bedTime;
    const parsed = parsePlanValue(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.timeline).toBeUndefined();
  });

  it("a changed usual wake time names itself in the staleness check", () => {
    const plan = gen(fullProfile("omnivore"), { wakeTime: "06:30", bedTime: "22:30" });
    const profile = fullProfile("omnivore");
    const safety = classifySafety(toSafetyInput(profile));
    const current = {
      ...planInputsSnapshotOf(profile, safety, plan.targets),
      wakeTime: "07:15",
      bedTime: "22:30",
    };
    const staleness = planStaleness(plan, current);
    expect(staleness.changed).toContain("your usual sleep times");
  });
});
