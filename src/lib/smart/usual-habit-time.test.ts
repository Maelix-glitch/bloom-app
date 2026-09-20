import { describe, expect, it } from "vitest";

import type { HabitLog } from "@/lib/home/habits";
import { formatClock, usualHabitTime } from "./usual";

const TODAY = "2026-09-20";

function tick(offset: number, hour: number, minute = 0, habitId = "h1"): HabitLog {
  const d = new Date(`${TODAY}T12:00:00`);
  d.setDate(d.getDate() + offset);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    habitId,
    date,
    completedAt: `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
  };
}

describe("usualHabitTime", () => {
  it("stays silent under three completions", () => {
    expect(usualHabitTime([tick(-1, 21), tick(-2, 21)], "h1")).toBeNull();
    expect(usualHabitTime([], "h1")).toBeNull();
  });

  it("finds the median finish over the last fortnight", () => {
    const logs = [
      tick(-1, 20, 50),
      tick(-2, 21, 0),
      tick(-3, 21, 10),
      tick(-4, 21, 0),
      tick(-5, 23, 30), // an outlier — the median shrugs it off
      ...Array.from({ length: 12 }, (_, i) => tick(-6 - i, 9, 0, "other")), // other habit, ignored
    ];
    const usual = usualHabitTime(logs, "h1");
    expect(usual).not.toBeNull();
    expect(usual!.minutes).toBe(21 * 60);
    expect(usual!.samples).toBe(5);
    expect(usual!.reminderTime).toBe("20:45");
  });

  it("caps at fourteen completions and ignores other habits", () => {
    const logs = Array.from({ length: 20 }, (_, i) => tick(-i - 1, 6, 30));
    const usual = usualHabitTime(logs, "h1");
    expect(usual!.samples).toBe(14);
    expect(usual!.minutes).toBe(6 * 60 + 30);
  });
});

describe("formatClock", () => {
  it("reads like a person speaks", () => {
    expect(formatClock(21 * 60)).toBe("9:00 PM");
    expect(formatClock(0)).toBe("12:00 AM");
    expect(formatClock(12 * 60)).toBe("12:00 PM");
    expect(formatClock(6 * 60 + 30)).toBe("6:30 AM");
  });

  it("wraps values that fall before midnight's edge", () => {
    expect(formatClock(-20)).toBe("11:40 PM");
    expect(formatClock(24 * 60 + 45)).toBe("12:45 AM");
  });
});
