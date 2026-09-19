/**
 * B7½ · "Restore from backup" — the other half of the export.
 *
 * An export is only as good as the day you need it. This module reads a
 * `bloom.export.v1` bundle back into the same localStorage keys the stores
 * read, so a restored device looks exactly like the one that exported.
 *
 * Two modes, named honestly in the UI:
 *
 *   · **merge**   — union with what is already here; where both copies hold
 *                   the same row, the row already on this device wins, and
 *                   tracker days reconcile on `updatedAt` like sync does;
 *   · **replace** — this device's copy is overwritten by the backup.
 *
 * Account-scoped content (profile, stories, highlights) is reported as
 * skipped rather than silently dropped or faked: it lives in the account,
 * not on the device, and signing in is what restores it.
 *
 * Pure over a `Storage` argument so the tests exercise the very code the
 * sheet calls; the sheet reloads afterwards so every store re-reads disk.
 */

import { EXPORT_FORMAT, type ExportBundle } from "./exportAll";

export type RestoreMode = "merge" | "replace";

export interface RestoreSection {
  label: string;
  restored: number;
  kept: number;
}

export interface RestoreReport {
  mode: RestoreMode;
  sections: RestoreSection[];
  skipped: string[];
}

export type ParseResult = { ok: true; bundle: ExportBundle } | { ok: false; error: string };

const isArr = (v: unknown): v is unknown[] => Array.isArray(v);

/** Tolerant but strict about the contract: wrong shape, wrong format → error. */
export function parseBundle(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "That file isn't a Bloom backup." };
  }
  const b = raw as Record<string, unknown>;
  if (b["format"] !== EXPORT_FORMAT) {
    return {
      ok: false,
      error:
        b["format"] === undefined
          ? "That file isn't a Bloom backup."
          : `That backup is format “${String(b["format"])}”, this app reads “${EXPORT_FORMAT}”.`,
    };
  }
  for (const key of ["habits", "habitLogs", "mood", "stories", "highlights"]) {
    if (!isArr(b[key])) return { ok: false, error: `The backup is missing its ${key} list.` };
  }
  const trackers = b["trackers"] as Record<string, unknown> | undefined;
  const cycle = b["cycle"] as Record<string, unknown> | undefined;
  if (!trackers || !isArr(trackers["days"])) {
    return { ok: false, error: "The backup is missing its tracker days." };
  }
  if (!cycle || !isArr(cycle["periods"]) || !isArr(cycle["days"])) {
    return { ok: false, error: "The backup is missing its cycle record." };
  }
  return { ok: true, bundle: raw as unknown as ExportBundle };
}

/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

const readArray = (storage: Storage, key: string): Row[] => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return isArr(parsed) ? (parsed as Row[]) : [];
  } catch {
    return [];
  }
};

const readObject = (storage: Storage, key: string): Row => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Row) : {};
  } catch {
    return {};
  }
};

const write = (storage: Storage, key: string, value: unknown): void => {
  storage.setItem(key, JSON.stringify(value));
};

/** Union by key; when both sides have a row, `existingWins` decides. */
function union(
  existing: Row[],
  incoming: Row[],
  idOf: (r: Row) => string,
  existingWins: (a: Row, b: Row) => boolean,
  mode: RestoreMode,
): { rows: Row[]; restored: number; kept: number } {
  if (mode === "replace") return { rows: incoming, restored: incoming.length, kept: 0 };
  const byId = new Map<string, Row>();
  for (const r of incoming) byId.set(idOf(r), r);
  let kept = 0;
  for (const r of existing) {
    const id = idOf(r);
    const other = byId.get(id);
    if (other !== undefined && existingWins(r, other)) kept += 1;
    byId.set(id, r);
  }
  return { rows: [...byId.values()], restored: byId.size - kept, kept };
}

const newer =
  (field: string) =>
  (a: Row, b: Row): boolean =>
    String(a[field] ?? "") >= String(b[field] ?? "");

const alwaysExisting = (): boolean => true;

/**
 * Writes the backup into `storage`. Returns what happened, per section, in
 * human order. Never throws on garbage rows inside a valid bundle — a bad
 * row is simply counted as kept/skipped by the union logic.
 */
export function applyRestore(
  storage: Storage,
  bundle: ExportBundle,
  mode: RestoreMode,
): RestoreReport {
  const sections: RestoreSection[] = [];
  const add = (label: string, u: { restored: number; kept: number }) =>
    sections.push({ label, restored: u.restored, kept: u.kept });

  /* habits */
  add(
    "Habits",
    writeAndCount(
      storage,
      "bloom.habits",
      union(
        readArray(storage, "bloom.habits"),
        bundle.habits as unknown as Row[],
        (r) => String(r["id"] ?? ""),
        alwaysExisting,
        mode,
      ),
    ),
  );

  /* habit logs */
  add(
    "Habit ticks",
    writeAndCount(
      storage,
      "bloom.habit_logs",
      union(
        readArray(storage, "bloom.habit_logs"),
        bundle.habitLogs as unknown as Row[],
        (r) => `${String(r["habitId"] ?? "")}|${String(r["date"] ?? "")}`,
        alwaysExisting,
        mode,
      ),
    ),
  );

  /* tracker days — reconcile on updatedAt, exactly like device sync */
  add(
    "Tracker days",
    writeAndCount(
      storage,
      "bloom.trackers.days.v1",
      union(
        readArray(storage, "bloom.trackers.days.v1"),
        bundle.trackers.days as unknown as Row[],
        (r) => String(r["date"] ?? ""),
        newer("updatedAt"),
        mode,
      ),
    ),
  );

  /* tracker goals */
  const goals = bundle.trackers.goals;
  if (goals) {
    const had = storage.getItem("bloom.trackers.goals.v1") !== null;
    if (mode === "replace" || !had) {
      write(storage, "bloom.trackers.goals.v1", goals);
      sections.push({ label: "Tracker goals", restored: 1, kept: 0 });
    } else {
      sections.push({ label: "Tracker goals", restored: 0, kept: 1 });
    }
  }

  /* mood — the pending queue IS the signed-out mood store */
  const queue = readObject(storage, "bloom.mood.pending.v1");
  const existingEntries = isArr(queue["entries"]) ? (queue["entries"] as Row[]) : [];
  const existingRemoved = isArr(queue["removed"]) ? (queue["removed"] as unknown[]) : [];
  const moodUnion = union(
    existingEntries,
    bundle.mood as unknown as Row[],
    (r) => String(r["id"] ?? ""),
    alwaysExisting,
    mode,
  );
  write(storage, "bloom.mood.pending.v1", {
    entries: moodUnion.rows,
    /* deletions queued on this device are never undone by a restore */
    removed: existingRemoved,
  });
  add("Mood check-ins", moodUnion);

  /* cycle */
  add(
    "Periods",
    writeAndCount(
      storage,
      "bloom.cycle.periods.v1",
      union(
        readArray(storage, "bloom.cycle.periods.v1"),
        bundle.cycle.periods as unknown as Row[],
        (r) => String(r["id"] ?? r["start"] ?? ""),
        alwaysExisting,
        mode,
      ),
    ),
  );
  add(
    "Cycle days",
    writeAndCount(
      storage,
      "bloom.cycle.days.v1",
      union(
        readArray(storage, "bloom.cycle.days.v1"),
        bundle.cycle.days as unknown as Row[],
        (r) => String(r["date"] ?? ""),
        alwaysExisting,
        mode,
      ),
    ),
  );

  const settings = bundle.cycle.settings;
  if (settings) {
    const had = storage.getItem("bloom.cycle.settings.v1") !== null;
    if (mode === "replace" || !had) {
      write(storage, "bloom.cycle.settings.v1", settings);
      sections.push({ label: "Cycle settings", restored: 1, kept: 0 });
    } else {
      sections.push({ label: "Cycle settings", restored: 0, kept: 1 });
    }
  }

  const checkIns = bundle.cycle.checkIns;
  if (checkIns && typeof checkIns === "object") {
    const existing = readObject(storage, "bloom.cycle.checkins.v1");
    const merged = mode === "replace" ? (checkIns as Row) : { ...(checkIns as Row), ...existing };
    write(storage, "bloom.cycle.checkins.v1", merged);
    sections.push({ label: "Cycle check-ins", restored: Object.keys(checkIns).length, kept: 0 });
  }

  /* prefs — per-key, newest stamp wins on merge */
  const prefsDoc = bundle.prefs as Record<string, { value?: unknown; updatedAt?: string }> | null;
  if (prefsDoc && typeof prefsDoc === "object") {
    const existing = readObject(storage, "bloom.prefs.v1") as Record<
      string,
      { value?: unknown; updatedAt?: string }
    >;
    const next: Record<string, unknown> = mode === "replace" ? { ...prefsDoc } : { ...prefsDoc };
    let kept = 0;
    if (mode === "merge") {
      for (const [key, row] of Object.entries(existing)) {
        const incoming = prefsDoc[key];
        if (incoming && String(incoming.updatedAt ?? "") > String(row.updatedAt ?? "")) continue;
        next[key] = row;
        kept += 1;
      }
    }
    write(storage, "bloom.prefs.v1", next);
    sections.push({
      label: "Preferences",
      restored: Object.keys(next).length - kept,
      kept,
    });
  }

  return {
    mode,
    sections,
    skipped: ["Profile", "Stories", "Highlights — account content; signing in restores it"],
  };
}

/** Unions once, writes once, and reports the counts (the first `add` for
    habits above was over-cautious; this helper is the single source). */
function writeAndCount(
  storage: Storage,
  key: string,
  u: { rows: Row[]; restored: number; kept: number },
): { restored: number; kept: number } {
  write(storage, key, u.rows);
  return { restored: u.restored, kept: u.kept };
}
