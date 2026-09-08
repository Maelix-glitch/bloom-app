/**
 * B4 · Reminders that actually fire.
 *
 * The Add-habit dialog has been collecting a reminder time since the
 * beginning and only ever used it to *order* Today's flow. Nothing told
 * anyone their period was due, that the fertile window had opened, or that
 * nothing had been logged tonight.
 *
 * This module is the pure half: given the record and a moment in time, what
 * should be shown, and when? It knows nothing about the Notification API, so
 * it can be tested exactly — the browser half lives in `useReminders`.
 *
 * Rules that keep reminders from becoming noise:
 *   · one notification per reason per day (`key` carries the day);
 *   · a habit that is already ticked today is never reminded about;
 *   · the evening nudge is silent on a day that already has something on it;
 *   · nothing fires while the cycle is off, and nothing cycle-related fires
 *     while it is paused;
 *   · nothing is ever shown for a time still in the future, or more than
 *     `GRACE_MINUTES` in the past (so a laptop opened at midnight doesn't
 *     dump the whole day at once).
 */

import type { Habit } from "@/lib/home/habits";
import type { CycleMode } from "@/lib/cycle/periodStore";

export type ReminderKind = "habit" | "period" | "fertile" | "evening";

export interface Reminder {
  /** Stable per reason per day — the dedupe key. */
  key: string;
  kind: ReminderKind;
  title: string;
  body: string;
  /** Local `HH:MM` this becomes due. */
  at: string;
  /** Where tapping it should land. */
  url: string;
}

export interface ReminderSettings {
  enabled: boolean;
  habits: boolean;
  cycle: boolean;
  /** The "nothing logged today" nudge. */
  evening: boolean;
  /** Local `HH:MM` for the evening nudge. */
  eveningTime: string;
}

export const REMINDERS_PREF = "reminders.settings";

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  habits: true,
  cycle: true,
  evening: true,
  eveningTime: "20:30",
};

/** How late a reminder may still be delivered after its time passed. */
export const GRACE_MINUTES = 120;

/** Period reminders go out this many days before the predicted start. */
export const PERIOD_LEAD_DAYS = 2;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseReminderSettings(raw: unknown): ReminderSettings | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const time =
    typeof r["eveningTime"] === "string" && TIME_RE.test(r["eveningTime"])
      ? r["eveningTime"]
      : DEFAULT_REMINDERS.eveningTime;
  return {
    enabled: bool(r["enabled"], false),
    habits: bool(r["habits"], true),
    cycle: bool(r["cycle"], true),
    evening: bool(r["evening"], true),
    eveningTime: time,
  };
}

export const isValidTime = (v: string): boolean => TIME_RE.test(v);

const minutesOf = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export interface ReminderInput {
  today: string;
  /** Local `HH:MM` right now. */
  now: string;
  settings: ReminderSettings;
  /** Habits due today with a reminder time, and whether they're already done. */
  habits: readonly { habit: Habit; done: boolean }[];
  cycle: {
    mode: CycleMode;
    /** The engine's predicted next start, when it is confident enough to say. */
    nextStart: string | null;
    /** Days late, when the engine calls it late. */
    daysLate: number | null;
    /** First day of the fertile window, when there is one. */
    fertileStart: string | null;
  };
  /** True when anything at all has been logged today. */
  loggedSomethingToday: boolean;
}

const dayBefore = (date: string, days: number): string => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Everything that is due right now — already deduped by day, already filtered
 * to the grace window, in the order they should be shown.
 */
export function dueReminders(input: ReminderInput): Reminder[] {
  const { settings, today, now } = input;
  if (!settings.enabled) return [];

  const nowMin = minutesOf(now);
  const out: Reminder[] = [];
  const push = (r: Reminder) => {
    const at = minutesOf(r.at);
    if (at > nowMin) return; // not yet
    if (nowMin - at > GRACE_MINUTES) return; // too stale to be useful
    out.push(r);
  };

  if (settings.habits) {
    for (const { habit, done } of input.habits) {
      if (done || !habit.reminderTime || !isValidTime(habit.reminderTime)) continue;
      push({
        key: `habit:${habit.id}:${today}`,
        kind: "habit",
        title: habit.name,
        body: "Time for this one — tick it when it's done.",
        at: habit.reminderTime,
        url: "/",
      });
    }
  }

  const cycleOn = input.cycle.mode === "tracking";
  if (settings.cycle && cycleOn) {
    const { nextStart, daysLate, fertileStart } = input.cycle;
    if (daysLate !== null && daysLate > 0) {
      push({
        key: `period-late:${today}`,
        kind: "period",
        title: `${daysLate} ${daysLate === 1 ? "day" : "days"} later than predicted`,
        body: "If it has started, logging the first day sharpens every prediction.",
        at: "09:00",
        url: "/cycle",
      });
    } else if (nextStart && nextStart === dayBefore(today, -PERIOD_LEAD_DAYS)) {
      /* today is PERIOD_LEAD_DAYS before the predicted start */
      push({
        key: `period-soon:${today}`,
        kind: "period",
        title: "A period is expected in about two days",
        body: "An estimate from your own record — not a certainty.",
        at: "09:00",
        url: "/cycle",
      });
    }
    if (fertileStart && fertileStart === today) {
      push({
        key: `fertile:${today}`,
        kind: "fertile",
        title: "Your fertile window opens today",
        body: "Estimated from your logged cycles.",
        at: "09:00",
        url: "/cycle",
      });
    }
  }

  if (settings.evening && !input.loggedSomethingToday && isValidTime(settings.eveningTime)) {
    push({
      key: `evening:${today}`,
      kind: "evening",
      title: "Nothing logged today",
      body: "A mood, a habit, a glass of water — thirty seconds keeps the record honest.",
      at: settings.eveningTime,
      url: "/",
    });
  }

  return out;
}

/** Keys already delivered — kept on the device so a refresh can't re-notify. */
export const DELIVERED_KEY = "bloom.reminders.sent.v1";

export function loadDelivered(storage?: Storage): string[] {
  const store = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return [];
  try {
    const raw = store.getItem(DELIVERED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

/** Remember what went out, forgetting anything not from today (keys carry the day). */
export function saveDelivered(keys: readonly string[], today: string, storage?: Storage): void {
  const store = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return;
  const kept = keys.filter((k) => k.endsWith(today));
  try {
    store.setItem(DELIVERED_KEY, JSON.stringify([...new Set(kept)]));
  } catch {
    /* storage full — worst case a reminder repeats once */
  }
}

/** The due list minus anything already delivered. */
export function pendingReminders(input: ReminderInput, delivered: readonly string[]): Reminder[] {
  const seen = new Set(delivered);
  return dueReminders(input).filter((r) => !seen.has(r.key));
}
