/**
 * Persistence for the daily trackers — deliberately separate from the pure
 * core (core.ts), which stays portable.
 *
 * Days live in this browser's localStorage so the page works signed out and
 * offline. Nothing is sent anywhere.
 */

import { isValidDateKey } from "@/lib/cycle/predict";

import {
  DEFAULT_GOALS,
  emptyDay,
  isEmptyDay,
  type DayEntry,
  type Goals,
  type StudySession,
} from "./core";

const DAYS_KEY = "bloom.trackers.days.v1";
const GOALS_KEY = "bloom.trackers.goals.v1";

export const TRACKERS_CHANGED = "bloom:trackers-changed";

const hasWindow = () => typeof window !== "undefined";

const isTimeOrNull = (v: unknown): v is string | null =>
  v === null || (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v));

function numOrNull(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < min || v > max) return null;
  return v;
}

function normalizeSession(raw: unknown): StudySession | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const subject = typeof row["subject"] === "string" ? row["subject"].trim().slice(0, 40) : "";
  const minutes = numOrNull(row["minutes"], 1, 16 * 60);
  if (!subject || minutes === null) return null;
  return {
    subject,
    minutes: Math.round(minutes),
    startAt: isTimeOrNull(row["startAt"]) ? row["startAt"] : null,
  };
}

/** Tolerates anything on disk: a bad row is dropped, never thrown. */
export function normalizeDay(raw: unknown): DayEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row["date"] !== "string" || !isValidDateKey(row["date"])) return null;

  const day = emptyDay(row["date"]);
  day.sleepMinutes = numOrNull(row["sleepMinutes"], 0, 18 * 60);
  day.waterMl = numOrNull(row["waterMl"], 0, 8000);
  day.movementMinutes = numOrNull(row["movementMinutes"], 0, 8 * 60);
  day.screenMinutes = numOrNull(row["screenMinutes"], 0, 20 * 60);
  day.energy = numOrNull(row["energy"], 1, 5);
  day.sleepQuality = numOrNull(row["sleepQuality"], 1, 5);
  day.bedTime = isTimeOrNull(row["bedTime"]) ? row["bedTime"] : null;
  day.wakeTime = isTimeOrNull(row["wakeTime"]) ? row["wakeTime"] : null;
  day.notes = typeof row["notes"] === "string" && row["notes"].trim() ? row["notes"] : null;
  day.sessions = Array.isArray(row["sessions"])
    ? (row["sessions"] as unknown[]).map(normalizeSession).filter((s): s is StudySession => s !== null).slice(0, 12)
    : [];
  day.updatedAt = typeof row["updatedAt"] === "string" ? row["updatedAt"] : null;
  return day;
}

export function loadDays(): DayEntry[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(DAYS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeDay)
      .filter((d): d is DayEntry => d !== null && !isEmptyDay(d));
  } catch {
    return [];
  }
}

export function saveDays(days: readonly DayEntry[]): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(DAYS_KEY, JSON.stringify(days));
  } catch {
    /* storage full or blocked — the session still works, it just won't persist */
  }
}

export function loadGoals(): Goals {
  if (!hasWindow()) return { ...DEFAULT_GOALS };
  try {
    const raw = window.localStorage.getItem(GOALS_KEY);
    if (!raw) return { ...DEFAULT_GOALS };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_GOALS };
    const row = parsed as Record<string, unknown>;
    const goals = { ...DEFAULT_GOALS };
    for (const key of Object.keys(DEFAULT_GOALS) as (keyof Goals)[]) {
      const value = numOrNull(row[key], 1, 20000);
      if (value !== null) goals[key] = value;
    }
    return goals;
  } catch {
    return { ...DEFAULT_GOALS };
  }
}

export function saveGoals(goals: Goals): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch {
    /* ignored — see saveDays */
  }
}

export function clearDays(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(DAYS_KEY);
  } catch {
    /* ignored */
  }
}

function esc(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function daysToCsv(days: readonly DayEntry[]): string {
  const rows = [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) =>
      [
        d.date,
        d.sleepMinutes === null ? "" : (d.sleepMinutes / 60).toFixed(2),
        d.bedTime ?? "",
        d.wakeTime ?? "",
        d.sleepQuality ?? "",
        d.waterMl ?? "",
        d.sessions.reduce((sum, s) => sum + s.minutes, 0) || "",
        d.sessions.map((s) => `${s.subject}:${s.minutes}`).join(" | "),
        d.movementMinutes ?? "",
        d.energy ?? "",
        d.screenMinutes === null ? "" : (d.screenMinutes / 60).toFixed(2),
        esc(d.notes ?? ""),
      ].join(","),
    );
  return [
    "date,sleep_hours,bed_time,wake_time,sleep_quality,water_ml,study_minutes,subjects,movement_minutes,energy,screen_hours,notes",
    ...rows,
  ].join("\n");
}
