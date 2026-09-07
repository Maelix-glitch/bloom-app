/**
 * Bloom — period-entry sync.
 *
 * Period entries (the start/end dates that predictions are built from) live in
 * `cycle_periods`, one row per entry, keyed by the entry's own id. Deleting an
 * entry leaves a tombstone (`deleted_at`) rather than a hole, so a phone that
 * was offline when the laptop deleted something can't quietly resurrect it.
 *
 * The check-in memory ("never ask this exact thing twice") and the personal
 * settings ("cycles up to 58 days are mine") travel in one `cycle_state` row
 * per person, so answering a question on one device answers it everywhere.
 *
 * As with the daily log: the device stays the source of truth for drawing, the
 * table is reconciled in the background, and a lost connection costs a sync —
 * never a logged period.
 *
 * Mapping and merging are pure and tested; only the functions at the bottom
 * touch the network.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { normalizeLog, normalizeSettings } from "@/lib/cycle/periodStore";
import { isValidDateKey, type PeriodLog } from "@/lib/cycle/predict";
import type { CheckInMemory } from "@/lib/cycle/reconcile";
import type { CycleSettings } from "@/lib/cycle/periodStore";
import { pageAll } from "@/lib/pageAll";

export const PERIODS_TABLE = "cycle_periods";
export const PERIODS_CONFLICT = "profile_id,id";
export const STATE_TABLE = "cycle_state";

const PERIOD_COLUMNS = "id, start_date, end_date, flow, notes, updated_at, deleted_at";

/** A period entry as the sync layer sees it: the entry plus when it changed. */
export interface PeriodRecord {
  log: PeriodLog;
  /** ISO time of the last change on any device. */
  updatedAt: string;
  /** ISO time it was deleted, or null while it's alive. */
  deletedAt: string | null;
}

/** True when this build actually has a project to talk to. */
export function hasCloud(): boolean {
  return hasSupabaseConfig;
}

/** Signed-in user id, or null when there's no session (or no project). */
export async function currentProfileId(): Promise<string | null> {
  if (!hasSupabaseConfig) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/* --------------------------------- rows ---------------------------------- */

const iso = (v: unknown): string | null => {
  if (typeof v !== "string" || !v) return null;
  return Number.isNaN(Date.parse(v)) ? null : v;
};

/** A `cycle_periods` row becomes a PeriodRecord; anything malformed is dropped. */
export function rowToPeriod(row: unknown): PeriodRecord | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const log = normalizeLog({
    id: r["id"],
    start: r["start_date"] ?? r["start"],
    end: r["end_date"] ?? r["end"],
    flow: r["flow"],
    notes: r["notes"],
  });
  if (!log || typeof r["id"] !== "string" || !r["id"]) return null;
  return {
    log: { ...log, id: r["id"] },
    updatedAt: iso(r["updated_at"]) ?? new Date(0).toISOString(),
    deletedAt: iso(r["deleted_at"]),
  };
}

/** A PeriodRecord becomes a `cycle_periods` payload. */
export function periodToRow(rec: PeriodRecord, profileId: string): Record<string, unknown> {
  return {
    profile_id: profileId,
    id: rec.log.id,
    start_date: rec.log.start,
    end_date: rec.log.end ?? null,
    flow: rec.log.flow ?? null,
    notes: rec.log.notes ?? null,
    updated_at: rec.updatedAt,
    deleted_at: rec.deletedAt,
  };
}

/* -------------------------------- merging -------------------------------- */

/**
 * Reconciles the device's records with the table's.
 *
 * Per id, the later `updatedAt` wins — a tombstone included, so a deletion made
 * elsewhere removes the entry here and an edit made here after a stale
 * deletion elsewhere brings it back. Records only one side knows are kept.
 * `newerLocal` lists the ids the device holds that are ahead of the table.
 */
export function mergePeriodRecords(
  local: readonly PeriodRecord[],
  remote: readonly PeriodRecord[],
  now: string = new Date().toISOString(),
): { records: PeriodRecord[]; newerLocal: string[] } {
  const byId = new Map<string, PeriodRecord>();
  const newerLocal: string[] = [];
  for (const rec of local) byId.set(rec.log.id, rec);
  for (const theirs of remote) {
    const mine = byId.get(theirs.log.id);
    if (!mine) {
      byId.set(theirs.log.id, theirs);
      continue;
    }
    const mineAt = Date.parse(mine.updatedAt) || 0;
    const theirsAt = Date.parse(theirs.updatedAt) || 0;
    if (mineAt > theirsAt) newerLocal.push(mine.log.id);
    else if (theirsAt > mineAt) byId.set(theirs.log.id, theirs);
    /* equal stamps: identical content by construction — keep ours */
  }

  /* Two live entries with the same first day can only be one period logged
     on two devices before they ever synced. Keep the fuller / fresher one and
     retire the other everywhere, so the record doesn't double up. */
  const byStart = new Map<string, PeriodRecord>();
  for (const rec of byId.values()) {
    if (rec.deletedAt !== null) continue;
    const other = byStart.get(rec.log.start);
    if (!other) {
      byStart.set(rec.log.start, rec);
      continue;
    }
    const keep = preferred(other, rec);
    const lose = keep === other ? rec : other;
    byStart.set(rec.log.start, keep);
    byId.set(lose.log.id, { ...lose, updatedAt: now, deletedAt: now });
    newerLocal.push(lose.log.id);
  }

  const records = [...byId.values()].sort((a, b) => a.log.start.localeCompare(b.log.start));
  return { records, newerLocal: [...new Set(newerLocal)] };
}

/** Of two entries for the same first day: the one with a last day, else the fresher, else stable. */
function preferred(a: PeriodRecord, b: PeriodRecord): PeriodRecord {
  const aEnd = Boolean(a.log.end);
  const bEnd = Boolean(b.log.end);
  if (aEnd !== bEnd) return aEnd ? a : b;
  const aAt = Date.parse(a.updatedAt) || 0;
  const bAt = Date.parse(b.updatedAt) || 0;
  if (aAt !== bAt) return aAt > bAt ? a : b;
  return a.log.id <= b.log.id ? a : b;
}

/** The entries worth showing — tombstones filtered out, oldest first. */
export function liveLogs(records: readonly PeriodRecord[]): PeriodLog[] {
  return records
    .filter((r) => r.deletedAt === null)
    .map((r) => r.log)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Turns the plain list of period logs a hook holds into records, reusing the
 * stamps we already know and stamping anything new or changed with `now`.
 * Logs that vanished from the list become tombstones.
 */
export function recordsFromLogs(
  logs: readonly PeriodLog[],
  known: readonly PeriodRecord[],
  now: string,
): { records: PeriodRecord[]; changed: string[] } {
  const prev = new Map(known.map((r) => [r.log.id, r]));
  const seen = new Set<string>();
  const records: PeriodRecord[] = [];
  const changed: string[] = [];
  for (const log of logs) {
    seen.add(log.id);
    const before = prev.get(log.id);
    if (before && before.deletedAt === null && sameLog(before.log, log)) {
      records.push(before);
      continue;
    }
    records.push({ log: { ...log }, updatedAt: now, deletedAt: null });
    changed.push(log.id);
  }
  for (const rec of known) {
    if (seen.has(rec.log.id)) continue;
    if (rec.deletedAt !== null) {
      records.push(rec); // an existing tombstone stays as it is
      continue;
    }
    records.push({ ...rec, updatedAt: now, deletedAt: now });
    changed.push(rec.log.id);
  }
  records.sort((a, b) => a.log.start.localeCompare(b.log.start));
  return { records, changed };
}

export function sameLog(a: PeriodLog, b: PeriodLog): boolean {
  return (
    a.start === b.start &&
    (a.end ?? null) === (b.end ?? null) &&
    (a.flow ?? null) === (b.flow ?? null) &&
    (a.notes ?? null) === (b.notes ?? null)
  );
}

/** Tombstones older than this are forgotten — every device has long since seen them. */
export const TOMBSTONE_DAYS = 120;

export function pruneTombstones(records: readonly PeriodRecord[], now: string): PeriodRecord[] {
  const cutoff = Date.parse(now) - TOMBSTONE_DAYS * 86_400_000;
  return records.filter((r) => r.deletedAt === null || (Date.parse(r.deletedAt) || 0) >= cutoff);
}

/* ------------------------------- state row ------------------------------- */

/** What one `cycle_state` row carries. */
export interface CycleState {
  memory: CheckInMemory;
  settings: CycleSettings;
  updatedAt: string;
}

const dateMap = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!v || typeof v !== "object") return out;
  for (const [k, d] of Object.entries(v as Record<string, unknown>)) {
    if (typeof d === "string" && isValidDateKey(d)) out[k] = d;
  }
  return out;
};

export function rowToState(row: unknown): CycleState | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const mem = (r["checkins"] ?? {}) as Record<string, unknown>;
  return {
    memory: { dismissed: dateMap(mem["dismissed"]), snoozed: dateMap(mem["snoozed"]) },
    settings: normalizeSettings(r["settings"]),
    updatedAt: iso(r["updated_at"]) ?? new Date(0).toISOString(),
  };
}

export function stateToRow(state: CycleState, profileId: string): Record<string, unknown> {
  return {
    profile_id: profileId,
    checkins: { dismissed: state.memory.dismissed, snoozed: state.memory.snoozed },
    settings: {
      personalMaxPlausible: state.settings.personalMaxPlausible,
      mode: state.settings.mode,
      pause: state.settings.pause,
      /* the mode is a deliberate choice, so it carries its own stamp for merging */
      modeChangedAt: state.settings.modeChangedAt ?? null,
    },
    updated_at: state.updatedAt,
  };
}

/**
 * Two devices' state, combined so nothing anyone answered is lost: a
 * dismissal on either side stands; a snooze keeps the later date; the
 * personal ceiling is the higher of the two (both were confirmed by the
 * same person).
 */
export function mergeState(local: CycleState, remote: CycleState): CycleState {
  const dismissed = { ...remote.memory.dismissed, ...local.memory.dismissed };
  const snoozed: Record<string, string> = { ...remote.memory.snoozed };
  for (const [id, until] of Object.entries(local.memory.snoozed)) {
    const other = snoozed[id];
    snoozed[id] = other && other > until ? other : until;
  }
  for (const id of Object.keys(dismissed)) delete snoozed[id];
  const a = local.settings.personalMaxPlausible;
  const b = remote.settings.personalMaxPlausible;
  const personalMaxPlausible = a === null ? b : b === null ? a : Math.max(a, b);
  /* the mode is a single deliberate choice — the later choice wins */
  const la = local.settings.modeChangedAt ?? "";
  const ra = remote.settings.modeChangedAt ?? "";
  const modeSource = ra > la ? remote.settings : local.settings;
  const updatedAt = local.updatedAt > remote.updatedAt ? local.updatedAt : remote.updatedAt;
  const settings: CycleSettings = {
    personalMaxPlausible,
    mode: modeSource.mode,
    pause: modeSource.pause,
  };
  if (modeSource.modeChangedAt) settings.modeChangedAt = modeSource.modeChangedAt;
  return { memory: { dismissed, snoozed }, settings, updatedAt };
}

/** Nothing answered, nothing confirmed — not worth a row. */
export function isEmptyState(s: CycleState): boolean {
  return (
    Object.keys(s.memory.dismissed).length === 0 &&
    Object.keys(s.memory.snoozed).length === 0 &&
    s.settings.personalMaxPlausible === null &&
    s.settings.mode === "tracking"
  );
}

export function sameState(a: CycleState, b: CycleState): boolean {
  return (
    JSON.stringify(a.memory.dismissed) === JSON.stringify(b.memory.dismissed) &&
    JSON.stringify(a.memory.snoozed) === JSON.stringify(b.memory.snoozed) &&
    a.settings.personalMaxPlausible === b.settings.personalMaxPlausible &&
    a.settings.mode === b.settings.mode &&
    JSON.stringify(a.settings.pause) === JSON.stringify(b.settings.pause)
  );
}

/* ------------------------------- the network ------------------------------ */

/**
 * The two tables arrive with the 20260907_cycle_periods migration. Until it
 * has been run, the daily log must keep syncing exactly as before — so a
 * "relation does not exist" answer marks the period tables as not ready
 * (pushes are skipped, not failed) until the next full pull probes again.
 */
let tablesReady = true;

/** False while the account's last answer was that the period tables aren't there yet. */
export const periodTablesReady = (): boolean => tablesReady;

/** Forget the last answer — the next pull asks the account again. */
export function reprobePeriodTables(): void {
  tablesReady = true;
}

/** Thrown by pull/push when the migration hasn't been run on this project. */
export class PeriodTablesMissing extends Error {
  constructor() {
    super("The period tables aren't set up on this project yet (run 20260907_cycle_periods.sql).");
    this.name = "PeriodTablesMissing";
  }
}

export function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  const msg = typeof e.message === "string" ? e.message : "";
  return (
    e.code === "42P01" ||
    e.code === "PGRST205" ||
    /relation .* does not exist|could not find the table|schema cache/i.test(msg)
  );
}

function raise(error: { code?: string; message: string }): never {
  if (isMissingTable(error)) {
    tablesReady = false;
    throw new PeriodTablesMissing();
  }
  throw new Error(error.message);
}

/** Every period row for this profile, tombstones included, oldest first. */
export async function pullPeriods(profileId: string): Promise<PeriodRecord[]> {
  if (!tablesReady) throw new PeriodTablesMissing();
  const { data, error } = await pageAll<unknown>((from, to) =>
    supabase
      .from(PERIODS_TABLE)
      .select(PERIOD_COLUMNS)
      .eq("profile_id", profileId)
      .order("start_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (error) raise(error as { code?: string; message: string });
  return (data ?? []).map(rowToPeriod).filter((r): r is PeriodRecord => r !== null);
}

/** Upsert a batch of records (alive or tombstoned) keyed by (profile_id, id). */
export async function pushPeriods(
  profileId: string,
  records: readonly PeriodRecord[],
): Promise<void> {
  if (records.length === 0) return;
  if (!tablesReady) throw new PeriodTablesMissing();
  const { error } = await supabase.from(PERIODS_TABLE).upsert(
    records.map((r) => periodToRow(r, profileId)),
    { onConflict: PERIODS_CONFLICT },
  );
  if (error) raise(error);
}

/** The person's check-in memory + settings, or null when they have none yet. */
export async function pullState(profileId: string): Promise<CycleState | null> {
  if (!tablesReady) throw new PeriodTablesMissing();
  const { data, error } = await supabase
    .from(STATE_TABLE)
    .select("checkins, settings, updated_at")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) raise(error);
  return data ? rowToState(data) : null;
}

export async function pushState(profileId: string, state: CycleState): Promise<void> {
  if (!tablesReady) throw new PeriodTablesMissing();
  const { error } = await supabase
    .from(STATE_TABLE)
    .upsert(stateToRow(state, profileId), { onConflict: "profile_id" });
  if (error) raise(error);
}
