/**
 * Persistence for the daily trackers — deliberately separate from the pure
 * core (core.ts), which stays portable.
 *
 * Days live in this browser's localStorage so the page works signed out and
 * offline. Nothing is sent anywhere.
 */

import { isValidDateKey } from "@/lib/cycle/predict";
import { getPref, setPref } from "@/lib/prefs";

import {
  DEFAULT_GOALS,
  emptyDay,
  isEmptyDay,
  type DayEntry,
  type Goals,
  type StudySession,
  type TrackerId,
} from "./core";

const DAYS_KEY = "bloom.trackers.days.v1";
/** Legacy device-only goals — read once, then the prefs document owns them. */
const GOALS_KEY = "bloom.trackers.goals.v1";
export const GOALS_PREF = "trackers.goals";
export const ACTIVE_PREF = "trackers.active";
export const SUBJECTS_PREF = "trackers.subjects";
export const MAX_CUSTOM_SUBJECTS = 24;

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
    ? (row["sessions"] as unknown[])
        .map(normalizeSession)
        .filter((s): s is StudySession => s !== null)
        .slice(0, 12)
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
    return parsed.map(normalizeDay).filter((d): d is DayEntry => d !== null && !isEmptyDay(d));
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

function parseGoals(raw: unknown): Goals | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const goals = { ...DEFAULT_GOALS };
  let any = false;
  for (const key of Object.keys(DEFAULT_GOALS) as (keyof Goals)[]) {
    const value = numOrNull(row[key], 1, 20000);
    if (value !== null) {
      goals[key] = value;
      any = true;
    }
  }
  return any ? goals : null;
}

function legacyGoals(): Goals | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(GOALS_KEY);
    return raw ? parseGoals(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * Goals follow the account (prefs document). A device that still has the old
 * `bloom.trackers.goals.v1` key keeps those numbers until a synced value exists.
 */
export function loadGoals(): Goals {
  if (!hasWindow()) return { ...DEFAULT_GOALS };
  const synced = getPref<Goals | null>(GOALS_PREF, parseGoals, null);
  if (synced) return { ...synced };
  return legacyGoals() ?? { ...DEFAULT_GOALS };
}

export function saveGoals(goals: Goals): void {
  if (!hasWindow()) return;
  setPref(GOALS_PREF, goals);
  try {
    /* keep the legacy mirror for anything that still reads it (the coach) */
    window.localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch {
    /* ignored — see saveDays */
  }
}

/* ------------------------------ active trackers ----------------------------- */

const ALL_IDS: TrackerId[] = ["sleep", "water", "study", "movement", "energy", "screen"];

function parseActive(raw: unknown): TrackerId[] | null {
  if (!Array.isArray(raw)) return null;
  const ids = ALL_IDS.filter((id) => raw.includes(id));
  return ids.length > 0 ? ids : null;
}

/**
 * Which trackers this person tracks. Everyone starts with all six; the ones
 * switched off leave the rings, the modal, the focus list and the score —
 * their history is kept and comes back the moment they're switched on.
 */
export function loadActiveTrackers(): TrackerId[] {
  if (!hasWindow()) return [...ALL_IDS];
  return getPref<TrackerId[]>(ACTIVE_PREF, parseActive, [...ALL_IDS]);
}

export function saveActiveTrackers(ids: readonly TrackerId[]): void {
  if (!hasWindow()) return;
  const clean = ALL_IDS.filter((id) => ids.includes(id));
  /* at least one stays on — an empty page would be a dead end */
  setPref(ACTIVE_PREF, clean.length > 0 ? clean : [...ALL_IDS]);
}

/* ------------------------------ study subjects ------------------------------ */

function parseSubjects(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const s of raw) {
    if (typeof s !== "string") continue;
    const t = s.trim().slice(0, 40);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Subjects the person typed themselves, newest first — offered as chips. */
export function loadCustomSubjects(): string[] {
  if (!hasWindow()) return [];
  return getPref<string[]>(SUBJECTS_PREF, parseSubjects, []);
}

/** Remember a typed subject (moves to the front when it already exists). */
export function rememberSubject(subject: string): string[] {
  const t = subject.trim().slice(0, 40);
  if (!t || !hasWindow()) return loadCustomSubjects();
  const next = [
    t,
    ...loadCustomSubjects().filter((s) => s.toLowerCase() !== t.toLowerCase()),
  ].slice(0, MAX_CUSTOM_SUBJECTS);
  setPref(SUBJECTS_PREF, next);
  return next;
}

export function forgetSubject(subject: string): string[] {
  const next = loadCustomSubjects().filter((s) => s.toLowerCase() !== subject.trim().toLowerCase());
  setPref(SUBJECTS_PREF, next);
  return next;
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
