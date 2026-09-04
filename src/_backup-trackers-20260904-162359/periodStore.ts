/**
 * Persistence for Cycle Intelligence — deliberately separate from the
 * prediction core (predict.ts), which stays pure and portable.
 *
 * Entries live in this browser's localStorage so the page works signed out
 * and offline. Nothing is sent anywhere.
 */

import type { DayFlow, DayLog, LhValue, MoodValue, MucusValue } from "./dayLogs";
import { isValidDateKey, type FlowLevel, type PeriodLog } from "./predict";
import { DEFAULT_THEME_ID } from "./themes";

const KEY = "bloom.cycle.periods.v1";
/** Advanced daily log — one row per calendar day, keyed by date. */
const DAY_KEY = "bloom.cycle.days.v1";
const THEME_KEY = "bloom.cycle.theme.v1";
/** Legacy day-level log written by the previous version of the cycle page. */
const LEGACY_KEY = "bloom.cycle.entries.local";

export const PERIODS_CHANGED = "bloom:periods-changed";

const hasWindow = () => typeof window !== "undefined";

function isFlow(v: unknown): v is FlowLevel {
  return v === "light" || v === "medium" || v === "heavy";
}

/** Tolerate anything on disk: a bad row is dropped, never thrown. */
export function normalizeLog(raw: unknown): PeriodLog | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row["start"] !== "string" || !isValidDateKey(row["start"])) return null;
  const end =
    typeof row["end"] === "string" && isValidDateKey(row["end"]) && row["end"] >= row["start"]
      ? row["end"]
      : null;
  return {
    id: typeof row["id"] === "string" && row["id"] ? row["id"] : `p-${row["start"]}`,
    start: row["start"],
    end,
    flow: isFlow(row["flow"]) ? row["flow"] : null,
    notes: typeof row["notes"] === "string" && row["notes"].trim() ? row["notes"] : null,
  };
}

export function loadLogs(): PeriodLog[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeLog).filter((l): l is PeriodLog => l !== null);
  } catch {
    return [];
  }
}

/**
 * Writes without notifying. The hook that owns the state already has it, so
 * dispatching here would bounce straight back into a re-read and loop.
 * Other tabs still catch up via the native `storage` event.
 */
export function saveLogs(logs: PeriodLog[]): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(logs));
  } catch {
    /* storage full or blocked — the session still works, it just won't persist */
  }
}

/* ------------------------------ daily logs ------------------------------- */

function isMood(v: unknown): v is MoodValue {
  return v === "rough" || v === "low" || v === "okay" || v === "good" || v === "great";
}
function isMucus(v: unknown): v is MucusValue {
  return v === "dry" || v === "sticky" || v === "creamy" || v === "watery" || v === "egg-white";
}
function isLh(v: unknown): v is LhValue {
  return v === "negative" || v === "positive";
}
function isDayFlow(v: unknown): v is DayFlow {
  return v === "none" || v === "light" || v === "medium" || v === "heavy";
}
const inRange = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/** Tolerates anything on disk: unknown fields are dropped, never thrown. */
export function normalizeDayLog(raw: unknown): DayLog | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const date = typeof row["date"] === "string" && isValidDateKey(row["date"]) ? row["date"] : null;
  if (!date) return null;
  const symptoms = Array.isArray(row["symptoms"])
    ? (row["symptoms"] as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 12)
    : [];
  const notes = typeof row["notes"] === "string" && row["notes"].trim() ? row["notes"] : null;
  return {
    date,
    flow: isDayFlow(row["flow"]) ? row["flow"] : null,
    symptoms,
    mood: isMood(row["mood"]) ? row["mood"] : null,
    energy: inRange(row["energy"], 1, 5) ? row["energy"] : null,
    pain: inRange(row["pain"], 0, 5) ? row["pain"] : null,
    sleep: inRange(row["sleep"], 0, 24) ? row["sleep"] : null,
    temperature: inRange(row["temperature"], 34, 42) ? row["temperature"] : null,
    mucus: isMucus(row["mucus"]) ? row["mucus"] : null,
    lh: isLh(row["lh"]) ? row["lh"] : null,
    notes,
    updatedAt: typeof row["updatedAt"] === "string" ? row["updatedAt"] : null,
  };
}

export function loadDays(): DayLog[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(DAY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeDayLog).filter((d): d is DayLog => d !== null);
  } catch {
    return [];
  }
}

export function saveDays(days: DayLog[]): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(DAY_KEY, JSON.stringify(days));
  } catch {
    /* storage full or blocked — the session still works, it just won't persist */
  }
}

export function daysToCsv(days: DayLog[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = days
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) =>
      [
        d.date,
        d.flow ?? "",
        (d.symptoms ?? []).join("; "),
        d.mood ?? "",
        d.energy ?? "",
        d.pain ?? "",
        d.sleep ?? "",
        d.temperature ?? "",
        d.mucus ?? "",
        d.lh ?? "",
        d.notes ?? "",
      ]
        .map(esc)
        .join(","),
    );
  return [
    "date,flow,symptoms,mood,energy,pain,sleep_hours,temperature_c,cervical_mucus,lh_test,notes",
    ...rows,
  ].join("\n");
}

export function loadThemeId(): string {
  if (!hasWindow()) return DEFAULT_THEME_ID;
  try {
    return window.localStorage.getItem(THEME_KEY) ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function saveThemeId(id: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(THEME_KEY, id);
  } catch {
    /* non-fatal */
  }
  window.dispatchEvent(new CustomEvent(PERIODS_CHANGED));
}

/**
 * The previous cycle page logged individual days rather than whole periods.
 * Grouping its bleeding days into runs recovers the periods the user already
 * entered, so nothing has to be retyped.
 */
export function legacyPeriodCandidates(): PeriodLog[] {
  if (!hasWindow()) return [];
  let rows: unknown;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    rows = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];

  const bleeding = rows
    .map((r) => {
      const row = r as Record<string, unknown>;
      const date =
        typeof row["date"] === "string" && isValidDateKey(row["date"]) ? row["date"] : null;
      const flow = row["flow"];
      if (!date) return null;
      if (flow === undefined || flow === null || flow === "none") return null;
      return {
        date,
        flow: isFlow(flow) ? flow : ("medium" as FlowLevel),
        notes: typeof row["notes"] === "string" && row["notes"].trim() ? row["notes"].trim() : null,
      };
    })
    .filter((r): r is { date: string; flow: FlowLevel; notes: string | null } => r !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (bleeding.length === 0) return [];

  const rank: Record<FlowLevel, number> = { light: 1, medium: 2, heavy: 3 };
  const runs: { date: string; flow: FlowLevel; notes: string | null }[][] = [];
  for (const day of bleeding) {
    const current = runs[runs.length - 1];
    const last = current?.[current.length - 1];
    const gapDays =
      last !== undefined
        ? (Date.parse(`${day.date}T00:00:00Z`) - Date.parse(`${last.date}T00:00:00Z`)) / 86_400_000
        : Infinity;
    if (current && last && gapDays <= 2) current.push(day);
    else runs.push([day]);
  }

  return runs.map((run) => {
    const first = run[0]!;
    const lastDay = run[run.length - 1]!;
    const strongest = run.reduce(
      (acc, d) => (rank[d.flow] > rank[acc] ? d.flow : acc),
      "light" as FlowLevel,
    );
    return {
      id: `legacy-${first.date}`,
      start: first.date,
      end: run.length > 1 ? lastDay.date : null,
      flow: strongest,
      notes: first.notes,
    } satisfies PeriodLog;
  });
}

/** CSV of the user's own entries — exported client-side, no round trip. */
export function logsToCsv(logs: PeriodLog[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = logs
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((l) => [l.start, l.end ?? "", l.flow ?? "", l.notes ?? ""].map(esc).join(","));
  return ["start,end,flow,notes", ...rows].join("\n");
}
