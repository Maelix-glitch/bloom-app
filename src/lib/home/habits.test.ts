import { describe, expect, it } from "vitest";

import {
  applyDraft,
  draftToColumns,
  draftToLocalHabit,
  habitToDraft,
  isDueOn,
  isPausedOn,
  MAX_ICON_URL_LENGTH,
  rowToHabit,
  safeIconUrl,
  streakOf,
  weekStartOf,
  weeklyProgress,
  type Habit,
  type HabitLog,
} from "@/lib/home/habits";

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: "h1",
  name: "Read",
  icon: "📖",
  iconType: "emoji",
  iconUrl: null,
  color: "sky",
  frequency: "daily",
  points: 10,
  reminderTime: null,
  priority: "medium",
  tags: [],
  goal: null,
  days: [],
  timesPerWeek: null,
  startDate: null,
  note: null,
  createdAt: null,
  archived: false,
  pausedFrom: null,
  pausedUntil: null,
  ...over,
});

const log = (date: string, habitId = "h1"): HabitLog => ({
  habitId,
  date,
  completedAt: `${date}T08:00:00.000Z`,
});

describe("streakOf", () => {
  it("is 0 with no logs", () => {
    expect(streakOf(habit(), [], "2026-09-06")).toBe(0);
  });

  it("counts consecutive days back from today", () => {
    const logs = [log("2026-09-06"), log("2026-09-05"), log("2026-09-04")];
    expect(streakOf(habit(), logs, "2026-09-06")).toBe(3);
  });

  it("keeps yesterday's run while today is still open", () => {
    const logs = [log("2026-09-05"), log("2026-09-04")];
    expect(streakOf(habit(), logs, "2026-09-06")).toBe(2);
  });

  it("breaks on a missed day", () => {
    const logs = [log("2026-09-06"), log("2026-09-04"), log("2026-09-03")];
    expect(streakOf(habit(), logs, "2026-09-06")).toBe(1);
  });

  it("ignores other habits' logs", () => {
    const logs = [log("2026-09-06", "other"), log("2026-09-05", "other")];
    expect(streakOf(habit(), logs, "2026-09-06")).toBe(0);
  });

  it("skips days the habit isn't scheduled", () => {
    // 2026-09-06 is a Sunday. Mon/Wed/Fri habit done Fri 4th + Wed 2nd.
    const h = habit({ frequency: "custom", days: [1, 3, 5] });
    expect(isDueOn(h, "2026-09-06")).toBe(false);
    expect(isDueOn(h, "2026-09-04")).toBe(true);
    const logs = [log("2026-09-04"), log("2026-09-02")];
    expect(streakOf(h, logs, "2026-09-06")).toBe(2);
    // Missed Monday 31st Aug ends it there, Friday 28th doesn't count.
    expect(streakOf(h, [...logs, log("2026-08-28")], "2026-09-06")).toBe(2);
  });

  it("stops at the start date", () => {
    const h = habit({ startDate: "2026-09-05" });
    const logs = [log("2026-09-06"), log("2026-09-05"), log("2026-09-04")];
    expect(streakOf(h, logs, "2026-09-06")).toBe(2);
  });
});

/* 2026-09-07 is a Monday; the week runs Mon 7 – Sun 13. */
describe("weekly habits — 'N× a week' means N, not seven", () => {
  const gym = habit({ id: "gym", frequency: "weekly", timesPerWeek: 3 });

  it("knows which Monday a day belongs to", () => {
    expect(weekStartOf("2026-09-07")).toBe("2026-09-07"); // Monday
    expect(weekStartOf("2026-09-10")).toBe("2026-09-07"); // Thursday
    expect(weekStartOf("2026-09-13")).toBe("2026-09-07"); // Sunday belongs to the week before
    expect(weekStartOf("2026-09-14")).toBe("2026-09-14");
  });

  it("is due until the week has its N completions", () => {
    expect(isDueOn(gym, "2026-09-10", [])).toBe(true);
    const two = [log("2026-09-07", "gym"), log("2026-09-08", "gym")];
    expect(isDueOn(gym, "2026-09-10", two)).toBe(true);
    const three = [...two, log("2026-09-09", "gym")];
    // target met on Wednesday — Thursday to Sunday are free
    expect(isDueOn(gym, "2026-09-10", three)).toBe(false);
    expect(isDueOn(gym, "2026-09-13", three)).toBe(false);
    // …but the days it WAS done stay due, so they show as done rather than vanish
    expect(isDueOn(gym, "2026-09-09", three)).toBe(true);
    // and next Monday it starts again
    expect(isDueOn(gym, "2026-09-14", three)).toBe(true);
  });

  it("reports the week's progress as of a given day", () => {
    const logs = [log("2026-09-07", "gym"), log("2026-09-09", "gym"), log("2026-09-12", "gym")];
    expect(weeklyProgress(gym, logs, "2026-09-08")).toEqual({
      done: 1,
      target: 3,
      doneToday: false,
    });
    expect(weeklyProgress(gym, logs, "2026-09-09")).toEqual({
      done: 2,
      target: 3,
      doneToday: true,
    });
    expect(weeklyProgress(gym, logs, "2026-09-13").done).toBe(3);
    // last week's ticks don't leak in
    expect(weeklyProgress(gym, [log("2026-09-06", "gym")], "2026-09-07").done).toBe(0);
  });

  it("counts a streak in weeks that hit the target", () => {
    const week = (monday: string, n: number) =>
      Array.from({ length: n }, (_, i) => {
        const d = new Date(`${monday}T12:00:00`);
        d.setDate(d.getDate() + i);
        return log(d.toISOString().slice(0, 10), "gym");
      });
    // two full weeks before, and this week only started
    const logs = [...week("2026-08-24", 3), ...week("2026-08-31", 3), log("2026-09-07", "gym")];
    expect(streakOf(gym, logs, "2026-09-08")).toBe(2); // open week is a free pass
    // once this week hits three it counts too
    expect(streakOf(gym, [...logs, ...week("2026-09-08", 2)], "2026-09-09")).toBe(3);
    // a week that only managed two breaks it
    const broken = [...week("2026-08-24", 3), ...week("2026-08-31", 2), ...week("2026-09-07", 3)];
    expect(streakOf(gym, broken, "2026-09-10")).toBe(1);
  });

  it("treats a missing or silly target as once a week", () => {
    const loose = habit({ id: "w", frequency: "weekly", timesPerWeek: null });
    expect(isDueOn(loose, "2026-09-08", [log("2026-09-07", "w")])).toBe(false);
    expect(isDueOn(loose, "2026-09-08", [])).toBe(true);
  });
});

describe("pause and archive", () => {
  it("a paused habit is neither due nor counted against you", () => {
    const h = habit({ pausedFrom: "2026-09-05", pausedUntil: "2026-09-08" });
    expect(isPausedOn(h, "2026-09-04")).toBe(false);
    expect(isPausedOn(h, "2026-09-05")).toBe(true);
    expect(isPausedOn(h, "2026-09-08")).toBe(true);
    expect(isPausedOn(h, "2026-09-09")).toBe(false);
    expect(isDueOn(h, "2026-09-06")).toBe(false);
    // the run before the pause survives it
    const logs = [log("2026-09-04"), log("2026-09-03"), log("2026-09-09")];
    expect(streakOf(h, logs, "2026-09-09")).toBe(3);
    expect(streakOf(h, logs.slice(0, 2), "2026-09-09")).toBe(2); // today still open
  });

  it("a pause with only an end date starts on that date", () => {
    const h = habit({ pausedUntil: "2026-09-08" });
    expect(isPausedOn(h, "2026-09-07")).toBe(false);
    expect(isPausedOn(h, "2026-09-08")).toBe(true);
  });

  it("an archived habit is never due", () => {
    expect(isDueOn(habit({ archived: true }), "2026-09-07")).toBe(false);
    expect(
      isDueOn(habit({ archived: true, frequency: "weekly", timesPerWeek: 3 }), "2026-09-07"),
    ).toBe(false);
  });
});

describe("editing keeps identity and history", () => {
  it("round-trips a habit through the dialog's draft shape", () => {
    const h = habit({
      id: "keep-me",
      name: "Read",
      note: "20 pages",
      frequency: "custom",
      days: [1, 3, 5],
      goal: { target: 20, unit: "pages" },
      reminderTime: "21:30",
      tags: ["evening"],
      startDate: "2026-08-01",
      createdAt: "2026-08-01T10:00:00.000Z",
      pausedFrom: "2026-09-05",
      pausedUntil: "2026-09-08",
    });
    const draft = habitToDraft(h);
    expect(draft).toMatchObject({
      name: "Read",
      note: "20 pages",
      icon: { type: "emoji", value: "📖" },
      frequency: "custom",
      days: [1, 3, 5],
      goal: { enabled: true, target: 20, unit: "pages" },
      reminder: { enabled: true, time: "21:30" },
      tags: ["evening"],
      startDate: "2026-08-01",
    });
    const edited = applyDraft(h, { ...draft, name: "Read (novel)", days: [2, 4] });
    expect(edited.id).toBe("keep-me");
    expect(edited.createdAt).toBe("2026-08-01T10:00:00.000Z");
    expect(edited.name).toBe("Read (novel)");
    expect(edited.days).toEqual([2, 4]);
    expect(edited.pausedUntil).toBe("2026-09-08");
    expect(edited.startDate).toBe("2026-08-01");
  });

  it("switching frequency clears what no longer applies", () => {
    const h = habit({ id: "x", frequency: "custom", days: [1, 2] });
    const weekly = applyDraft(h, { ...habitToDraft(h), frequency: "weekly", timesPerWeek: 2 });
    expect(weekly.days).toEqual([]);
    expect(weekly.timesPerWeek).toBe(2);
    const daily = applyDraft(weekly, { ...habitToDraft(weekly), frequency: "daily" });
    expect(daily.timesPerWeek).toBeNull();
  });
});

describe("habit icons (U4 — bloom glyphs beside legacy emoji)", () => {
  it("reads a bloom row as a glyph id, not text", () => {
    const h = rowToHabit({
      id: "b1",
      name: "Morning pages",
      icon_type: "bloom",
      icon_value: "pen",
    });
    expect(h?.iconType).toBe("bloom");
    expect(h?.icon).toBe("pen");
    expect(h?.iconUrl).toBeNull();
  });

  it("gives an empty bloom value the star-bloom instead of the ⭐ emoji", () => {
    const h = rowToHabit({ id: "b2", name: "Something", icon_type: "bloom", icon_value: "" });
    expect(h?.iconType).toBe("bloom");
    expect(h?.icon).toBe("star-bloom");
  });

  it("keeps legacy rows exactly as stored — emoji type, emoji character", () => {
    const h = rowToHabit({
      id: "e1",
      name: "Read",
      icon_type: "emoji",
      icon_value: "🌱",
    });
    expect(h?.iconType).toBe("emoji");
    expect(h?.icon).toBe("🌱");
    // a row from before the column existed reads as emoji too
    const older = rowToHabit({ id: "e2", name: "Read", icon_value: "📚" });
    expect(older?.iconType).toBe("emoji");
    expect(older?.icon).toBe("📚");
  });

  it("round-trips a bloom habit through the edit draft without losing its type", () => {
    const h = rowToHabit({
      id: "b3",
      name: "Ride",
      icon_type: "bloom",
      icon_value: "bicycle",
    });
    expect(h).not.toBeNull();
    const draft = habitToDraft(h!);
    expect(draft.icon).toEqual({ type: "bloom", value: "bicycle" });
    const edited = applyDraft(h!, draft);
    expect(edited.iconType).toBe("bloom");
    expect(edited.icon).toBe("bicycle");
  });

  it("a local habit created from a bloom draft keeps the bloom type", () => {
    const local = draftToLocalHabit({
      name: "Water the fern",
      icon: { type: "bloom", value: "fern" },
    });
    expect(local.iconType).toBe("bloom");
    expect(local.icon).toBe("fern");
    expect(local.iconUrl).toBeNull();
  });

  it("a local habit created from an emoji draft stays an emoji habit", () => {
    const local = draftToLocalHabit({
      name: "Unicorn time",
      icon: { type: "emoji", value: "🦄" },
    });
    expect(local.iconType).toBe("emoji");
    expect(local.icon).toBe("🦄");
  });
});

/*
 * The egress guard. One habit row once carried a whole photo as a base64
 * data: URI in icon_url (~1.5 MB of text) and every habits fetch
 * re-downloaded it — ~47 GB of Supabase egress in a cycle. A data: URI or
 * oversized icon_url must be treated as NO image on read, and stripped on
 * write, so the class can never recur. The database carries the same rule
 * as a CHECK constraint (20261110_habit_icon_url_guard.sql).
 */
describe("icon URL egress guard", () => {
  const PHOTO_URL =
    "https://zsqsfxmjphctknnumgsi.supabase.co/storage/v1/object/public/habit-icons/u1/icon.png";
  const SMALL_DATA_URI = "data:image/png;base64,iVBORw0KGgo=";
  const BLOB_DATA_URI = `data:image/jpeg;base64,${"A".repeat(4096)}`;
  const OVERSIZED_URL = `https://example.com/${"a".repeat(MAX_ICON_URL_LENGTH)}`;

  describe("safeIconUrl", () => {
    it("passes a normal storage URL through untouched", () => {
      expect(safeIconUrl(PHOTO_URL)).toBe(PHOTO_URL);
    });

    it("rejects data: URIs — small ones too, and in any casing", () => {
      expect(safeIconUrl(SMALL_DATA_URI)).toBeNull();
      expect(safeIconUrl(BLOB_DATA_URI)).toBeNull();
      expect(safeIconUrl("DATA:image/png;base64,iVBORw0KGgo=")).toBeNull();
      expect(safeIconUrl("  data:image/png;base64,iVBORw0KGgo=  ")).toBeNull();
    });

    it("rejects oversized values and accepts one exactly at the limit", () => {
      expect(OVERSIZED_URL.length).toBeGreaterThan(MAX_ICON_URL_LENGTH);
      expect(safeIconUrl(OVERSIZED_URL)).toBeNull();
      const atLimit = `https://e.co/${"a".repeat(MAX_ICON_URL_LENGTH - "https://e.co/".length)}`;
      expect(atLimit).toHaveLength(MAX_ICON_URL_LENGTH);
      expect(safeIconUrl(atLimit)).toBe(atLimit);
    });

    it("rejects empty and non-string values", () => {
      expect(safeIconUrl("")).toBeNull();
      expect(safeIconUrl("   ")).toBeNull();
      expect(safeIconUrl(null)).toBeNull();
      expect(safeIconUrl(undefined)).toBeNull();
      expect(safeIconUrl(42)).toBeNull();
    });
  });

  describe("read path — rowToHabit", () => {
    it("maps a habit whose icon_url is a data: URI as image-less", () => {
      // The old write path stored the URI in icon_value as well; neither may
      // surface — not as the picture, not as the habit's mark.
      const h = rowToHabit({
        id: "img1",
        name: "Drink water",
        icon_type: "image",
        icon_value: BLOB_DATA_URI,
        icon_url: BLOB_DATA_URI,
      });
      expect(h?.iconUrl).toBeNull();
      expect(h?.iconType).toBe("emoji");
      expect(h?.icon).toBe("⭐");
    });

    it("maps a habit whose icon_url is oversized as image-less", () => {
      const h = rowToHabit({
        id: "img2",
        name: "Drink water",
        icon_type: "image",
        icon_value: OVERSIZED_URL,
        icon_url: OVERSIZED_URL,
      });
      expect(h?.iconUrl).toBeNull();
      expect(h?.iconType).toBe("emoji");
    });

    it("cleans a data: URI arriving in the local mirror's camelCase shape", () => {
      const h = rowToHabit({
        id: "img3",
        name: "Drink water",
        icon_type: "image",
        icon: "🖼️",
        iconUrl: SMALL_DATA_URI,
      });
      expect(h?.iconUrl).toBeNull();
      expect(h?.iconType).toBe("emoji");
    });

    it("keeps a real photo habit a photo habit", () => {
      const h = rowToHabit({
        id: "img4",
        name: "Drink water",
        icon_type: "image",
        icon_value: PHOTO_URL,
        icon_url: PHOTO_URL,
      });
      expect(h?.iconType).toBe("image");
      expect(h?.iconUrl).toBe(PHOTO_URL);
      expect(h?.icon).toBe("🖼️");
    });
  });

  describe("write path — drafts", () => {
    it("strips a data: URI icon before it can reach the row", () => {
      const cols = draftToColumns({
        name: "Drink water",
        icon: { type: "image", value: BLOB_DATA_URI },
      });
      expect(cols.icon_url).toBeNull();
      expect(cols.icon_type).toBe("emoji");
      expect(JSON.stringify(cols)).not.toContain("data:");
    });

    it("strips an oversized icon URL before it can reach the row", () => {
      const cols = draftToColumns({
        name: "Drink water",
        icon: { type: "image", value: OVERSIZED_URL },
      });
      expect(cols.icon_url).toBeNull();
      expect(cols.icon_type).toBe("emoji");
    });

    it("keeps a local habit from carrying the blob in its model either", () => {
      const local = draftToLocalHabit({
        name: "Drink water",
        icon: { type: "image", value: BLOB_DATA_URI },
      });
      expect(local.iconUrl).toBeNull();
      expect(local.iconType).toBe("emoji");
      expect(local.icon).toBe("⭐");
    });

    it("writes a normal photo URL through untouched", () => {
      const cols = draftToColumns({
        name: "Drink water",
        icon: { type: "image", value: PHOTO_URL },
      });
      expect(cols.icon_type).toBe("image");
      expect(cols.icon_url).toBe(PHOTO_URL);
      expect(cols.icon_value).toBe(PHOTO_URL);

      const local = draftToLocalHabit({
        name: "Drink water",
        icon: { type: "image", value: PHOTO_URL },
      });
      expect(local.iconType).toBe("image");
      expect(local.iconUrl).toBe(PHOTO_URL);
    });
  });
});
