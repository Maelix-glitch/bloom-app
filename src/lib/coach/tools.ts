/**
 * Bloom actions — the things the coach can actually *do* in the app.
 *
 * When the online model emits a `[BLOOM_TOOL]` sidecar, the page executes it
 * here against the same device-first stores the rest of Bloom uses, so a
 * habit created in conversation appears on the Habits page and a logged
 * tracker value appears on the Trackers page — no fake buttons, no pretend
 * success. Cloud rows are written when a profile is connected and mirrored
 * locally; when the account is unreachable the action still lands on the
 * device and says so.
 */

import {
  HABITS_CHANGED,
  draftToLocalHabit,
  fetchHabits,
  insertHabit,
  insertLog,
  loadLocalHabits,
  loadLocalLogs,
  saveLocal,
  type Habit,
  type HabitDraft,
  type HabitLog,
} from "@/lib/home/habits";
import { emptyDay, trackerDef, type TrackerId } from "@/lib/trackers/core";
import { loadDays, loadGoals, saveDays, saveGoals } from "@/lib/trackers/store";
import type { Goals } from "@/lib/trackers/core";
import { todayLocal } from "@/lib/localDay";

export interface ToolOutcome {
  ok: boolean;
  /** A short human line the UI appends to Bloom's reply. */
  outcome: string;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Trackers the coach can log directly (study is session-structured instead). */
const LOGGABLE = ["sleep", "water", "movement", "screen", "energy"] as const;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** The habits a coach action can see: cloud first when signed in, mirror always. */
async function visibleHabits(profileId: string | null): Promise<Habit[]> {
  const local = loadLocalHabits();
  if (!profileId) return local;
  try {
    const cloud = await fetchHabits(profileId);
    const merged = new Map<string, Habit>();
    for (const habit of [...cloud, ...local]) merged.set(habit.id, habit);
    return [...merged.values()].filter((h) => !h.archived);
  } catch {
    return local;
  }
}

function dateIsLoggable(date: string, today: string): boolean {
  if (!DATE_RE.test(date)) return false;
  // Within the last week (Bloom's backfill window) and never in the future.
  const then = new Date(`${date}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  if (Number.isNaN(then.getTime()) || then.getTime() > now.getTime()) return false;
  const back = new Date(now.getTime() - 6 * 86_400_000);
  return then.getTime() >= back.getTime();
}

function frequencyDescription(draft: HabitDraft): string {
  switch (draft.frequency ?? "daily") {
    case "weekly":
      return `${draft.timesPerWeek ?? 3}× a week`;
    case "custom": {
      const days = (draft.days ?? []).slice().sort();
      const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return days.length ? `on ${days.map((d) => names[d]).join(", ")}` : "weekly";
    }
    default:
      return "every day";
  }
}

function valueField(tracker: string): string {
  switch (tracker) {
    case "sleep":
      return "sleepMinutes";
    case "water":
      return "waterMl";
    case "movement":
      return "movementMinutes";
    case "screen":
      return "screenMinutes";
    default:
      return "energy";
  }
}

/* ------------------------------ the actions ------------------------------ */

type Runner = (args: Record<string, unknown>, profileId: string | null) => Promise<ToolOutcome>;

const ACTION: Record<string, Runner> = {
  /**
   * create_habit — args: name (required), note?, frequency? ("daily" default |
   * "weekly" | "custom"), timesPerWeek? (1–7, weekly), days? (0–6, custom),
   * reminderTime? ("HH:MM"), goalTarget?, goalUnit?
   */
  create_habit: async (args, profileId) => {
    const name = str(args["name"]).slice(0, 60);
    if (!name) return { ok: false, outcome: "I need a name for the habit before I can create it." };
    const frequency = str(args["frequency"]) || "daily";
    if (!["daily", "weekly", "custom"].includes(frequency)) {
      return { ok: false, outcome: "A habit can be daily, weekly, or on set days of the week." };
    }

    const timesPerWeek = frequency === "weekly" ? (num(args["timesPerWeek"]) ?? null) : null;
    if (frequency === "weekly" && (timesPerWeek === null || timesPerWeek < 1 || timesPerWeek > 7)) {
      return { ok: false, outcome: "Tell me how many times per week — 1 to 7." };
    }

    const days =
      frequency === "custom"
        ? (Array.isArray(args["days"]) ? args["days"] : [])
            .map(num)
            .filter((d): d is number => d !== null && d >= 0 && d <= 6)
            .slice(0, 7)
        : undefined;
    if (frequency === "custom" && (!days || days.length === 0)) {
      return { ok: false, outcome: "For a custom habit I need its days of the week." };
    }

    const reminderTime = str(args["reminderTime"]);
    if (reminderTime && !TIME_RE.test(reminderTime)) {
      return {
        ok: false,
        outcome: "That reminder time doesn't look right — use a 24-hour time like 19:30.",
      };
    }

    const goalTarget = num(args["goalTarget"]);
    const goalUnit = str(args["goalUnit"]).slice(0, 20);
    const note = str(args["note"]).slice(0, 240) || undefined;

    const draft: HabitDraft = {
      name,
      note,
      frequency,
      ...(timesPerWeek !== null ? { timesPerWeek } : {}),
      ...(days ? { days } : {}),
      goal:
        goalTarget !== null && goalTarget > 0
          ? { enabled: true, target: goalTarget, unit: goalUnit || null }
          : undefined,
      ...(reminderTime ? { reminder: { enabled: true, time: reminderTime } } : {}),
    };

    /* Cloud when a profile is connected; the device mirror keeps every page
       in step either way. */
    let onAccount = false;
    if (profileId) {
      try {
        await insertHabit(profileId, draft);
        onAccount = true;
      } catch {
        /* account unreachable — the local copy below still lands */
      }
    }
    const habit = draftToLocalHabit(draft);
    const next = [...loadLocalHabits().filter((h) => h.id !== habit.id), habit];
    saveLocal(next, loadLocalLogs());
    if (typeof window !== "undefined") window.dispatchEvent(new Event(HABITS_CHANGED));

    const cadence = frequencyDescription({ ...draft, timesPerWeek, days });
    const when = reminderTime
      ? frequency === "daily"
        ? ` at ${reminderTime}`
        : ` · reminder ${reminderTime}`
      : "";
    const noteBit =
      goalTarget !== null && goalTarget > 0
        ? ` · goal ${goalTarget}${goalUnit ? ` ${goalUnit}` : ""}`
        : "";
    const deviceBit =
      Boolean(profileId) && !onAccount
        ? " (your account wasn't reachable, so it's saved on this device)"
        : "";
    return {
      ok: true,
      outcome: `Done — “${name}” is now one of your habits (${cadence}${when}${noteBit})${deviceBit}. You'll find it on the Habits page.`,
    };
  },

  /** tick_habit — args: name (the habit's name, as shown), date? "YYYY-MM-DD". */
  tick_habit: async (args, profileId) => {
    const asked = str(args["name"]);
    const name = asked.toLowerCase();
    const date = str(args["date"]) || todayLocal();
    if (!name) return { ok: false, outcome: "Which habit should I mark done?" };
    if (!dateIsLoggable(date, todayLocal())) {
      return { ok: false, outcome: "I can only tick habits for today or the past few days." };
    }
    const habits = await visibleHabits(profileId);
    const habit = habits.find((h) => h.name.toLowerCase() === name || h.id === asked);
    if (!habit) {
      const list = habits.map((h) => h.name).slice(0, 12);
      return {
        ok: false,
        outcome: `I don't see a habit called “${asked}”.${
          list.length ? ` Yours are: ${list.join("; ")}.` : " You can ask me to create it."
        }`,
      };
    }
    const logs = loadLocalLogs();
    const already = logs.some((l) => l.habitId === habit.id && l.date === date);
    if (already) {
      return {
        ok: true,
        outcome: `“${habit.name}” was already ticked off${date === todayLocal() ? " today" : ` for ${date}`}.`,
      };
    }
    if (profileId && !habit.id.startsWith("local-")) {
      try {
        await insertLog(profileId, habit.id, date);
      } catch {
        /* cloud tick failed — still tick locally below */
      }
    }
    const logRow: HabitLog = { habitId: habit.id, date, completedAt: new Date().toISOString() };
    saveLocal(habits, [...logs, logRow]);
    if (typeof window !== "undefined") window.dispatchEvent(new Event(HABITS_CHANGED));
    return {
      ok: true,
      outcome: `Done — “${habit.name}” is ticked off${date === todayLocal() ? " for today" : ` for ${date}`}.`,
    };
  },

  /** list_habits — no args. The outcome itself is what the person reads. */
  list_habits: async (_args, profileId) => {
    const active = (await visibleHabits(profileId)).filter((h) => !h.archived);
    if (active.length === 0) {
      return { ok: true, outcome: "You don't have any habits yet — ask me to create one." };
    }
    const names = active.map((h) => h.name);
    const shown = names.slice(0, 12).join("; ");
    return {
      ok: true,
      outcome:
        names.length > 12
          ? `Your active habits: ${shown}… (${names.length} in total).`
          : `Your active habits: ${shown}.`,
    };
  },

  /**
   * log_tracker — args: tracker ("sleep" | "water" | "movement" | "screen" |
   * "energy"), value (number), date? "YYYY-MM-DD". Study is excluded: its
   * entries are structured sessions, not a single number.
   */
  log_tracker: async (args, _profileId) => {
    const rawTracker = str(args["tracker"]);
    const tracker = LOGGABLE.find((t) => t === rawTracker);
    if (!tracker) {
      return {
        ok: false,
        outcome:
          "I can log sleep, water, movement, screen time or energy in one number. Study minutes have their own session log on the Trackers page.",
      };
    }
    const value = num(args["value"]);
    const date = str(args["date"]) || todayLocal();
    if (value === null) {
      return { ok: false, outcome: `What value should I log for ${tracker}?` };
    }
    const def = trackerDef(tracker as TrackerId);
    if (value < def.min || value > def.max) {
      return {
        ok: false,
        outcome: `${def.name} is logged between ${def.min} and ${def.max}${def.kind === "rating" ? "" : " minutes"} — ${value} doesn't fit.`,
      };
    }
    if (!dateIsLoggable(date, todayLocal())) {
      return { ok: false, outcome: "I can only log trackers for today or the past few days." };
    }

    const key = valueField(tracker);
    const days = loadDays();
    const index = days.findIndex((d) => d.date === date);
    const day = index >= 0 ? days[index]! : emptyDay(date);
    const updated = { ...day, [key]: value, updatedAt: new Date().toISOString() };
    const next = index >= 0 ? days.map((d) => (d.date === date ? updated : d)) : [...days, updated];
    saveDays(next);
    return {
      ok: true,
      outcome: `Logged ${def.name}: ${def.format(value)}${date === todayLocal() ? " today" : ` on ${date}`}. It's on the Trackers page.`,
    };
  },

  /** set_goal — args: tracker (as above), value (number). */
  set_goal: async (args, _profileId) => {
    const rawTracker = str(args["tracker"]);
    const tracker = LOGGABLE.find((t) => t === rawTracker);
    if (!tracker) {
      return {
        ok: false,
        outcome: "I can set goals for sleep, water, movement, screen time or energy.",
      };
    }
    const value = num(args["value"]);
    const def = trackerDef(tracker as TrackerId);
    if (value === null || value < 0 || value > def.max) {
      return {
        ok: false,
        outcome: `A ${def.name} goal is a number from 0 to ${def.max}${def.kind === "rating" ? "" : " minutes"}.`,
      };
    }
    const goals: Goals = { ...loadGoals() };
    (goals as unknown as Record<string, unknown>)[def.goalKey] = value;
    saveGoals(goals);
    return {
      ok: true,
      outcome: `Your ${def.name.toLowerCase()} goal is now ${def.format(value)}. It's on the Trackers page.`,
    };
  },
};

/** Which tool names the coach is allowed to call (single source of truth). */
export const AVAILABLE_TOOLS = Object.keys(ACTION).sort();

/**
 * Run one coach tool call. Unknown tool names are refused loudly — the model
 * must never appear to act when nothing ran.
 */
export async function executeCoachTool(
  call: { name: string; args: Record<string, unknown> },
  profileId: string | null,
): Promise<ToolOutcome> {
  const runner = ACTION[call.name];
  if (!runner) {
    return {
      ok: false,
      outcome: "I don't have that action on this device yet — the rest of my reply stands.",
    };
  }
  if (typeof window === "undefined") {
    return { ok: false, outcome: "That needs the app open on this device." };
  }
  try {
    return await runner(call.args, profileId);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      outcome: `I couldn't do that just now (${detail}). Nothing was changed — try once more, or do it from the page itself.`,
    };
  }
}
