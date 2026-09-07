/**
 * Persistence for Cycle Intelligence — deliberately separate from the
 * prediction core (predict.ts), which stays pure and portable.
 *
 * Entries live in this browser's localStorage so the page works signed out
 * and offline. Nothing is sent anywhere.
 */

import type { DayFlow, DayLog, LhValue, MoodValue, MucusValue } from "./dayLogs";
import { isValidDateKey, type FlowLevel, type PeriodLog } from "./predict";
import { EMPTY_MEMORY, type CheckInMemory } from "./reconcile";
import { DEFAULT_THEME_ID } from "./themes";

const KEY = "bloom.cycle.periods.v1";
/** Advanced daily log — one row per calendar day, keyed by date. */
const DAY_KEY = "bloom.cycle.days.v1";
const THEME_KEY = "bloom.cycle.theme.v1";
/** Answers to the check-in questions — never ask the same thing twice. */
const CHECKIN_KEY = "bloom.cycle.checkins.v1";
const SETTINGS_KEY = "bloom.cycle.settings.v1";
/**
 * Sync sidecar for the period entries: per id, when it last changed and
 * whether it was deleted (a tombstone). Readers of the plain list above never
 * need this; only the sync layer does.
 */
const PERIOD_META_KEY = "bloom.cycle.periods.meta.v1";
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
  return v === "none" || v === "spotting" || v === "light" || v === "medium" || v === "heavy";
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

/* ------------------------------- check-ins -------------------------------- */

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function dateMap(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(v)) return out;
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "string" && isValidDateKey(val)) out[k] = val;
  }
  return out;
}

export function loadCheckInMemory(): CheckInMemory {
  if (!hasWindow()) return EMPTY_MEMORY;
  try {
    const raw = window.localStorage.getItem(CHECKIN_KEY);
    if (!raw) return EMPTY_MEMORY;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return EMPTY_MEMORY;
    return { dismissed: dateMap(parsed["dismissed"]), snoozed: dateMap(parsed["snoozed"]) };
  } catch {
    return EMPTY_MEMORY;
  }
}

export function saveCheckInMemory(memory: CheckInMemory): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(CHECKIN_KEY, JSON.stringify(memory));
  } catch {
    /* non-fatal */
  }
}

/* ---------------------------- period sync meta ---------------------------- */

export interface PeriodMeta {
  /** id → ISO time of the last change on any device. */
  updatedAt: Record<string, string>;
  /** id → ISO time of deletion; the entry is kept out of the list. */
  deleted: Record<string, { log: PeriodLog; at: string }>;
}

export const EMPTY_PERIOD_META: PeriodMeta = { updatedAt: {}, deleted: {} };

const isoMap = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!isRecord(v)) return out;
  for (const [k, d] of Object.entries(v)) {
    if (typeof d === "string" && !Number.isNaN(Date.parse(d))) out[k] = d;
  }
  return out;
};

export function loadPeriodMeta(): PeriodMeta {
  if (!hasWindow()) return EMPTY_PERIOD_META;
  try {
    const raw = window.localStorage.getItem(PERIOD_META_KEY);
    if (!raw) return EMPTY_PERIOD_META;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return EMPTY_PERIOD_META;
    const deleted: PeriodMeta["deleted"] = {};
    if (isRecord(parsed["deleted"])) {
      for (const [id, v] of Object.entries(parsed["deleted"])) {
        if (!isRecord(v)) continue;
        const log = normalizeLog(v["log"]);
        const at =
          typeof v["at"] === "string" && !Number.isNaN(Date.parse(v["at"])) ? v["at"] : null;
        if (log && at) deleted[id] = { log: { ...log, id }, at };
      }
    }
    return { updatedAt: isoMap(parsed["updatedAt"]), deleted };
  } catch {
    return EMPTY_PERIOD_META;
  }
}

export function savePeriodMeta(meta: PeriodMeta): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(PERIOD_META_KEY, JSON.stringify(meta));
  } catch {
    /* non-fatal */
  }
}

/* ------------------------------- settings -------------------------------- */

/** What the person has told the engine about their own body. */
/**
 * Whether Bloom should expect periods right now.
 *
 * - `tracking` — the default: predictions, phases, "late" logic.
 * - `paused`   — pregnancy, postpartum, contraception with no bleed, a
 *                break: history and the daily log stay, but nothing is
 *                predicted and nothing is ever "late". Optionally until a
 *                date, after which tracking resumes on its own.
 * - `off`      — not tracking a cycle at all: the Cycle ring, focus items,
 *                nav entry and coach topic disappear. History is kept.
 */
export type CycleMode = "tracking" | "paused" | "off";

export interface CyclePause {
  /** Resume automatically on this day (inclusive); null = until they say. */
  until: string | null;
  /** Free text, never required — "pregnant", "on the pill", "just a break". */
  reason: string | null;
  /** When they paused, so the page can say "paused since March". */
  since: string;
}

export interface CycleSettings {
  /**
   * The longest gap they've confirmed as one real cycle ("no — it really was
   * that long"). Null until they say so. Bounded by the engine's hard ceiling.
   */
  personalMaxPlausible: number | null;
  mode: CycleMode;
  /** Only meaningful while `mode === "paused"`. */
  pause: CyclePause | null;
  /** ISO stamp of the last mode change — lets two devices agree on the later choice. */
  modeChangedAt?: string | undefined;
}

export const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  personalMaxPlausible: null,
  mode: "tracking",
  pause: null,
};

const MODES: readonly CycleMode[] = ["tracking", "paused", "off"];

export function normalizeMode(v: unknown): CycleMode {
  return typeof v === "string" && (MODES as readonly string[]).includes(v)
    ? (v as CycleMode)
    : "tracking";
}

export function normalizePause(v: unknown): CyclePause | null {
  if (!isRecord(v)) return null;
  const until = v["until"];
  const reason = v["reason"];
  const since = v["since"];
  return {
    until: typeof until === "string" && isValidDateKey(until) ? until : null,
    reason: typeof reason === "string" && reason.trim() !== "" ? reason.trim().slice(0, 80) : null,
    since: typeof since === "string" && isValidDateKey(since) ? since : "1970-01-01",
  };
}

/** Whole settings object from anything — storage, a table row, junk. */
export function normalizeSettings(v: unknown): CycleSettings {
  if (!isRecord(v)) return { ...DEFAULT_CYCLE_SETTINGS };
  const pmp = v["personalMaxPlausible"];
  const mode = normalizeMode(v["mode"]);
  const out: CycleSettings = {
    personalMaxPlausible:
      typeof pmp === "number" && Number.isFinite(pmp) && pmp > 0 ? Math.round(pmp) : null,
    mode,
    pause:
      mode === "paused"
        ? (normalizePause(v["pause"]) ?? { until: null, reason: null, since: "1970-01-01" })
        : null,
  };
  const stamp = v["modeChangedAt"];
  if (typeof stamp === "string" && !Number.isNaN(Date.parse(stamp))) out.modeChangedAt = stamp;
  return out;
}

/**
 * The mode as it applies *today*: a pause with an end date that has passed
 * reads as tracking again — nobody should have to remember to switch back.
 */
export function effectiveMode(settings: CycleSettings, today: string): CycleMode {
  if (settings.mode === "paused" && settings.pause?.until && settings.pause.until < today) {
    return "tracking";
  }
  return settings.mode;
}

export function loadCycleSettings(): CycleSettings {
  if (!hasWindow()) return DEFAULT_CYCLE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_CYCLE_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch {
    return DEFAULT_CYCLE_SETTINGS;
  }
}

export const CYCLE_SETTINGS_CHANGED = "bloom:cycle-mode-changed";

export function saveCycleSettings(settings: CycleSettings): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* non-fatal */
  }
  /* the rail and the coach follow the mode live (not PERIODS_CHANGED — that
     one makes the period store re-read everything) */
  window.dispatchEvent(new CustomEvent(CYCLE_SETTINGS_CHANGED));
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
      /* spotting is an observation, not a period day — it must not start one */
      if (flow === undefined || flow === null || flow === "none" || flow === "spotting")
        return null;
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
