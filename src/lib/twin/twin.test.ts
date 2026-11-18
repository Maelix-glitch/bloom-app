/**
 * The Metabolic Twin — assembly honesty: every field is either a
 * value computed by the module it reuses (expenditure, micro gaps,
 * habit due-days) or an `insufficient` carrying the real counts.
 * Nothing is stated from too little data, averages are never drawn
 * from a single day, and the same record always builds the same twin.
 */

import { describe, expect, it } from "vitest";

import type { WeighIn } from "@/lib/health/body";
import type { Habit, HabitLog } from "@/lib/home/habits";
import type { LogEntry } from "@/lib/nutrition/types";
import { buildTwinSnapshot, type TwinInputs } from "./twin";

let seq = 0;
function dayEntry(day: string, kcal: number, proteinG = 0, extra: Partial<LogEntry["nutrients"]> = {}): LogEntry {
  seq += 1;
  return {
    id: `e-${seq}`,
    day,
    meal: "lunch",
    foodId: null,
    snapshot: null,
    name: "logged",
    amount: { grams: 100 },
    nutrients: { kcal, proteinG, carbsG: 0, fatG: 0, ...extra },
    provenance: { kind: "user_entered", sourceId: "fixture", label: "Your value" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

/** `count` consecutive logged days from `from`. */
function loggedDays(
  from: string,
  count: number,
  kcal: number,
  proteinG = 0,
  extra: Partial<LogEntry["nutrients"]> = {},
): LogEntry[] {
  const out: LogEntry[] = [];
  const start = Date.parse(`${from}T12:00:00Z`);
  for (let i = 0; i < count; i += 1) {
    out.push(dayEntry(new Date(start + i * 86_400_000).toISOString().slice(0, 10), kcal, proteinG, extra));
  }
  return out;
}

const weigh = (date: string, kg: number): WeighIn => ({ date, kg });

function habit(patch: Partial<Habit> = {}): Habit {
  return {
    id: "h-1",
    name: "Walk",
    icon: "walk",
    iconType: "bloom",
    iconUrl: null,
    color: "sage",
    frequency: "daily",
    points: 10,
    reminderTime: null,
    priority: "normal",
    tags: [],
    goal: null,
    days: [],
    timesPerWeek: null,
    startDate: null,
    note: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    archived: false,
    pausedFrom: null,
    pausedUntil: null,
    ...patch,
  };
}

const log = (habitId: string, date: string): HabitLog => ({
  habitId,
  date,
  completedAt: `${date}T09:00:00.000Z`,
});

function inputs(patch: Partial<TwinInputs> = {}): TwinInputs {
  return {
    entries: [],
    weighIns: [],
    habits: [],
    habitLogs: [],
    targets: null,
    sex: null,
    day: "2026-11-18",
    ...patch,
  };
}

describe("buildTwinSnapshot — an empty record", () => {
  it("states nothing it cannot know; only coverage is a value (0 of 14)", () => {
    const twin = buildTwinSnapshot(inputs());
    expect(twin.expenditure.state).toBe("insufficient");
    expect(twin.weightTrend.state).toBe("insufficient");
    expect(twin.habitAdherence.state).toBe("insufficient");
    expect(twin.nutrientGaps.state).toBe("insufficient");
    expect(twin.logCoverage).toMatchObject({
      state: "value",
      value: { daysLogged: 0, windowDays: 14, avgKcal: null, avgProteinG: null },
    });
    expect(twin.readyCount).toBe(1);
    expect(twin.totalFields).toBe(5);
  });
});

describe("buildTwinSnapshot — expenditure, consumed not reinvented", () => {
  it("carries estimateExpenditure's number exactly, with its provenance", () => {
    /* 12 logged days at 2,500 kcal, −1 kg over 21 days → 2,867 kcal
       (the expenditure module's own pinned arithmetic). */
    const twin = buildTwinSnapshot(
      inputs({
        entries: loggedDays("2026-10-01", 12, 2500),
        weighIns: [weigh("2026-10-01", 100), weigh("2026-10-22", 99)],
        day: "2026-10-22",
      }),
    );
    expect(twin.expenditure.state).toBe("value");
    if (twin.expenditure.state === "value") {
      expect(twin.expenditure.value.maintenanceKcal).toBe(2867);
      expect(twin.expenditure.provenance).toContain("7,700 kcal per kg");
    }
  });

  it("insufficient expenditure names the counts and the unlock, never a guess", () => {
    const twin = buildTwinSnapshot(
      inputs({
        entries: loggedDays("2026-11-10", 3, 2000),
        weighIns: [weigh("2026-11-10", 90)],
      }),
    );
    expect(twin.expenditure.state).toBe("insufficient");
    if (twin.expenditure.state === "insufficient") {
      expect(twin.expenditure.reason).toContain("weigh-in");
      expect(twin.expenditure.unlock).toContain("10 days");
    }
  });
});

describe("buildTwinSnapshot — weight trend", () => {
  it("one weigh-in is insufficient and says so with the recorded point", () => {
    const twin = buildTwinSnapshot(inputs({ weighIns: [weigh("2026-11-01", 88.5)] }));
    expect(twin.weightTrend.state).toBe("insufficient");
    if (twin.weightTrend.state === "insufficient") {
      expect(twin.weightTrend.reason).toContain("88.5 kg");
    }
  });

  it("two weigh-ins give change, span and a weekly rate", () => {
    const twin = buildTwinSnapshot(
      inputs({ weighIns: [weigh("2026-10-20", 100), weigh("2026-11-10", 98.6)] }),
    );
    expect(twin.weightTrend.state).toBe("value");
    if (twin.weightTrend.state === "value") {
      expect(twin.weightTrend.value.changeKg).toBe(-1.4);
      expect(twin.weightTrend.value.spanDays).toBe(21);
      expect(twin.weightTrend.value.rateKgPerWeek).toBe(-0.5);
      expect(twin.weightTrend.value.points).toBe(2);
    }
  });

  it("points older than the window fall back to the last two, span stated", () => {
    const twin = buildTwinSnapshot(
      inputs({
        weighIns: [weigh("2026-08-01", 102), weigh("2026-09-30", 100)],
        day: "2026-11-18",
      }),
    );
    expect(twin.weightTrend.state).toBe("value");
    if (twin.weightTrend.state === "value") {
      expect(twin.weightTrend.value.spanDays).toBe(60);
      expect(twin.weightTrend.value.changeKg).toBe(-2);
    }
  });

  it("weigh-ins after the snapshot day are not read", () => {
    const twin = buildTwinSnapshot(
      inputs({
        weighIns: [weigh("2026-11-01", 90), weigh("2026-12-01", 80)],
        day: "2026-11-18",
      }),
    );
    expect(twin.weightTrend.state).toBe("insufficient");
  });
});

describe("buildTwinSnapshot — habit adherence", () => {
  it("no active habits is insufficient; archived habits do not count", () => {
    const twin = buildTwinSnapshot(inputs({ habits: [habit({ archived: true })] }));
    expect(twin.habitAdherence.state).toBe("insufficient");
  });

  it("counts due days by isDueOn over the last 14 completed days only", () => {
    /* Daily habit: due on all 14 window days (Nov 4–17 for a Nov 18
       snapshot). Logs on 7 window days — plus one today and one
       before the window, neither of which may count. */
    const dates = loggedDays("2026-11-04", 7, 0).map((e) => e.day);
    const twin = buildTwinSnapshot(
      inputs({
        habits: [habit()],
        habitLogs: [
          ...dates.map((d) => log("h-1", d)),
          log("h-1", "2026-11-18"),
          log("h-1", "2026-10-20"),
        ],
      }),
    );
    expect(twin.habitAdherence.state).toBe("value");
    if (twin.habitAdherence.state === "value") {
      expect(twin.habitAdherence.value.dueDays).toBe(14);
      expect(twin.habitAdherence.value.doneDays).toBe(7);
      expect(twin.habitAdherence.value.rate).toBe(0.5);
    }
  });

  it("a habit that was never due in the window is insufficient, not 0%", () => {
    const twin = buildTwinSnapshot(
      inputs({ habits: [habit({ startDate: "2026-11-18" })] }),
    );
    expect(twin.habitAdherence.state).toBe("insufficient");
  });
});

describe("buildTwinSnapshot — log coverage", () => {
  it("one logged day states coverage but no average", () => {
    const twin = buildTwinSnapshot(
      inputs({
        entries: [dayEntry("2026-11-17", 2400, 120)],
        targets: { kcal: 2000, proteinG: 100 },
      }),
    );
    expect(twin.logCoverage.state).toBe("value");
    if (twin.logCoverage.state === "value") {
      expect(twin.logCoverage.value.daysLogged).toBe(1);
      expect(twin.logCoverage.value.avgKcal).toBeNull();
      expect(twin.logCoverage.value.kcalVsTarget).toBeNull();
    }
  });

  it("two or more logged days state the average and its target comparison", () => {
    const twin = buildTwinSnapshot(
      inputs({
        entries: [dayEntry("2026-11-16", 2000, 50), dayEntry("2026-11-17", 3000, 150)],
        targets: { kcal: 2000, proteinG: 100 },
      }),
    );
    if (twin.logCoverage.state === "value") {
      expect(twin.logCoverage.value.avgKcal).toBe(2500);
      expect(twin.logCoverage.value.avgProteinG).toBe(100);
      expect(twin.logCoverage.value.kcalVsTarget).toBe(1.25);
      expect(twin.logCoverage.value.proteinVsTarget).toBe(1);
    }
  });

  it("today's half-written log is not judged", () => {
    const twin = buildTwinSnapshot(
      inputs({ entries: [dayEntry("2026-11-18", 5000, 300)] }),
    );
    if (twin.logCoverage.state === "value") {
      expect(twin.logCoverage.value.daysLogged).toBe(0);
    }
  });
});

describe("buildTwinSnapshot — nutrient gaps", () => {
  it("fewer than four logged days is insufficient", () => {
    const twin = buildTwinSnapshot(
      inputs({ entries: loggedDays("2026-11-14", 3, 2000, 0, { ironMg: 5 }) }),
    );
    expect(twin.nutrientGaps.state).toBe("insufficient");
  });

  it("a persistent low nutrient is a gap, from microGapsFor itself", () => {
    /* Iron 5 mg/day against the 19 mg male reference over 5 days. */
    const twin = buildTwinSnapshot(
      inputs({
        entries: loggedDays("2026-11-12", 5, 2000, 0, { ironMg: 5 }),
        sex: "male",
      }),
    );
    expect(twin.nutrientGaps.state).toBe("value");
    if (twin.nutrientGaps.state === "value") {
      expect(twin.nutrientGaps.value.map((g) => g.key)).toEqual(["ironMg"]);
      expect(twin.nutrientGaps.value[0]!.avg).toBe(5);
    }
  });

  it("judged with nothing under the line is a value — an empty list, not silence", () => {
    const twin = buildTwinSnapshot(
      inputs({
        entries: loggedDays("2026-11-12", 5, 2000, 0, { ironMg: 20 }),
        sex: "male",
      }),
    );
    expect(twin.nutrientGaps.state).toBe("value");
    if (twin.nutrientGaps.state === "value") {
      expect(twin.nutrientGaps.value).toEqual([]);
    }
  });
});

describe("buildTwinSnapshot — determinism", () => {
  it("same record, same twin; input order does not matter", () => {
    const a = buildTwinSnapshot(
      inputs({
        entries: loggedDays("2026-10-01", 12, 2500),
        weighIns: [weigh("2026-10-01", 100), weigh("2026-10-22", 99)],
        day: "2026-10-22",
      }),
    );
    const b = buildTwinSnapshot(
      inputs({
        entries: [...loggedDays("2026-10-01", 12, 2500)].reverse(),
        weighIns: [weigh("2026-10-22", 99), weigh("2026-10-01", 100)],
        day: "2026-10-22",
      }),
    );
    expect(b).toEqual(a);
  });
});
