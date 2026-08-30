/**
 * Persistence for Cycle Intelligence — deliberately separate from the
 * prediction core (predict.ts), which stays pure and portable.
 *
 * Entries live in this browser's localStorage so the page works signed out
 * and offline. Nothing is sent anywhere.
 */

import { isValidDateKey, type FlowLevel, type PeriodLog } from "./predict";
import { DEFAULT_THEME_ID } from "./themes";

const KEY = "bloom.cycle.periods.v1";
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
