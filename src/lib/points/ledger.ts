/**
 * Bloom Points — the one wallet ledger.
 *
 * Bloom's economy used to be written in three places: habit ticks adjusted
 * `profiles.total_points` directly, goal awards went through
 * `award_progress()`, and a signed-out device kept no running total at all.
 * The same tick could therefore be worth different amounts depending on which
 * page you looked at, and a retry could pay twice.
 *
 * This module is the single, auditable history every earn and every spend
 * goes through:
 *
 *   · **Append-only and idempotent.** Every event has a stable key
 *     (`habit:<id>:<date>`, `goal:<id>:<period>`, …). Recording the same key
 *     twice changes nothing, so a double tap, a retry or a second tab can
 *     never mint a second award.
 *   · **Merge-safe across devices.** Events are stored as a map keyed by that
 *     key, and the preference sync unions the maps instead of taking the
 *     last write (see `mergeDocs` in lib/prefs.ts). Two phones earning on the
 *     same day both keep their points.
 *   · **Reversible exactly once.** Unticking a habit revokes its event with a
 *     tombstone (`removed: true`), rather than subtracting an amount that
 *     might not have been there.
 *   · **The UI has one number and one feed.** `useWallet` reads this ledger
 *     when signed out and the account balance when signed in, and every award
 *     is announced so the number moves everywhere at once.
 *
 * The account remains authoritative for the *balance* when one is connected
 * (`profiles.total_points`, written only by server-side award functions). This
 * ledger is the device record and the receipt feed; it never invents a point
 * the server did not pay when signed in.
 */

import { getPref, setPref, PREFS_CHANGED } from "@/lib/prefs";
import { hasSupabaseConfig } from "@/lib/supabase";
import { todayLocal } from "@/lib/localDay";

export const POINTS_LEDGER_KEY = "points.ledger.v1";
export const POINTS_CHANGED = "bloom:points-changed";
export const POINTS_EARNED = "bloom:points-earned";

export type PointKind =
  | "habit"
  | "goal"
  | "achievement"
  | "reward"
  | "bonus"
  | "purchase"
  | "adjustment";

export interface PointEvent {
  /** The idempotency key. Stable for the thing that was earned. */
  key: string;
  /** Signed: positive for an earn, negative for a spend. */
  points: number;
  kind: PointKind;
  label: string;
  refId: string | null;
  /** ISO timestamp of the earning itself (for days/streaks). */
  at: string;
  /** ISO timestamp of this version of the event (for merges). */
  updatedAt: string;
  /** A tombstone: the earning was undone, and must never be counted again. */
  removed?: boolean;
}

export interface PointsDoc {
  version: 1;
  events: Record<string, PointEvent>;
}

export const EMPTY_POINTS: PointsDoc = { version: 1, events: {} };

const KINDS: PointKind[] = [
  "habit",
  "goal",
  "achievement",
  "reward",
  "bonus",
  "purchase",
  "adjustment",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return value;
}

/** Tolerant parse: a corrupt or partial entry is dropped, never half-read. */
export function parsePointsDoc(raw: unknown): PointsDoc {
  if (!isRecord(raw) || !isRecord(raw["events"])) return { ...EMPTY_POINTS, events: {} };
  const events: Record<string, PointEvent> = {};
  for (const [key, value] of Object.entries(raw["events"])) {
    if (!key || !isRecord(value)) continue;
    const points = value["points"];
    const kind = value["kind"];
    const at = isoOrNull(value["at"]);
    const updatedAt = isoOrNull(value["updatedAt"]);
    if (typeof points !== "number" || !Number.isFinite(points) || points === 0) continue;
    if (typeof kind !== "string" || !KINDS.includes(kind as PointKind)) continue;
    if (!at || !updatedAt) continue;
    const label = typeof value["label"] === "string" ? value["label"].slice(0, 160) : "";
    const refId = typeof value["refId"] === "string" ? value["refId"] : null;
    events[key] = {
      key,
      points: Math.round(points),
      kind: kind as PointKind,
      label,
      refId,
      at,
      updatedAt,
      ...(value["removed"] === true ? { removed: true } : {}),
    };
  }
  return { version: 1, events };
}

export function loadPointsDoc(): PointsDoc {
  return getPref(POINTS_LEDGER_KEY, parsePointsDoc, { ...EMPTY_POINTS, events: {} });
}

function writePointsDoc(doc: PointsDoc): void {
  setPref(POINTS_LEDGER_KEY, doc);
  emit();
}

function emit(earned?: { points: number; label: string }): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(POINTS_CHANGED));
  if (earned && earned.points !== 0) {
    window.dispatchEvent(
      new CustomEvent(POINTS_EARNED, {
        detail: { points: earned.points, label: earned.label },
      }),
    );
  }
}

/**
 * Merge two ledgers by event key.
 *
 * The same earning may exist on both devices (that's expected: a tick syncs).
 * For a shared key the newer `updatedAt` wins, and a tombstone removes it.
 * Distinct keys are all kept, which is what makes concurrent earning safe.
 */
export function mergePointsDocs(a: unknown, b: unknown): PointsDoc {
  const left = parsePointsDoc(a);
  const right = parsePointsDoc(b);
  const events: Record<string, PointEvent> = { ...left.events };
  for (const [key, incoming] of Object.entries(right.events)) {
    const current = events[key];
    if (!current) {
      events[key] = incoming;
      continue;
    }
    if (incoming.updatedAt > current.updatedAt) {
      events[key] = incoming;
    } else if (incoming.updatedAt === current.updatedAt && current.removed && !incoming.removed) {
      events[key] = incoming;
    }
  }
  return { version: 1, events };
}

/* ------------------------------- seeding --------------------------------- */

const SEEDED_KEY = "points.seeded.v1";

/**
 * Bring a device's existing earning history into the ledger once.
 *
 * Without this, the first launch after the ledger shipped would show zero
 * points for someone with months of habit ticks. The local habit mirror and
 * the progression ledger are already on the device, so they are read directly
 * (no imports, no cycles) and written as seed events with their original
 * timestamps. Idempotent: each seed key is unique, and the marker stops a
 * second pass.
 */
export function seedPointsFromDevice(): void {
  if (typeof window === "undefined") return;
  if (getPref(SEEDED_KEY, (raw) => raw === true, false)) return;

  const events: Record<string, PointEvent> = { ...loadPointsDoc().events };

  const put = (event: PointEvent) => {
    if (!events[event.key]) events[event.key] = event;
  };

  try {
    const habitsRaw = window.localStorage.getItem("bloom.habits");
    const logsRaw = window.localStorage.getItem("bloom.habit_logs");
    const habits = habitsRaw ? (JSON.parse(habitsRaw) as unknown) : null;
    const logs = logsRaw ? (JSON.parse(logsRaw) as unknown) : null;
    if (Array.isArray(habits) && Array.isArray(logs)) {
      const values = new Map<string, { name: string; points: number }>();
      for (const habit of habits) {
        if (!isRecord(habit) || typeof habit["id"] !== "string") continue;
        const points = typeof habit["points"] === "number" ? habit["points"] : 10;
        values.set(habit["id"], {
          name: typeof habit["name"] === "string" ? habit["name"] : "Habit",
          points,
        });
      }
      for (const log of logs) {
        if (!isRecord(log)) continue;
        const habitId = log["habitId"];
        const date = log["date"];
        if (typeof habitId !== "string" || typeof date !== "string") continue;
        const def = values.get(habitId);
        if (!def || def.points <= 0) continue;
        const at =
          isoOrNull(log["completedAt"]) ?? `${date}T12:00:00.000Z`;
        put({
          key: `habit:${habitId}:${date}`,
          points: def.points,
          kind: "habit",
          label: def.name,
          refId: habitId,
          at,
          updatedAt: at,
        });
      }
    }
  } catch {
    /* unreadable mirror — seed what we can */
  }

  try {
    const progression = getPref<Record<string, unknown> | null>(
      "progression.ledger.v1",
      (raw) => (isRecord(raw) ? raw : null),
      null,
    );
    if (progression) {
      // The progression ledger is an array of awards (see lib/progression/store).
      const raw = window.localStorage.getItem("bloom.prefs.v1");
      const doc = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      const entry = isRecord(doc) ? (doc["progression.ledger.v1"] as Record<string, unknown> | undefined) : undefined;
      const awards = isRecord(entry) && Array.isArray(entry["value"]) ? entry["value"] : [];
      for (const award of awards) {
        if (!isRecord(award) || typeof award["id"] !== "string") continue;
        const points = typeof award["points"] === "number" ? award["points"] : 0;
        const at = isoOrNull(award["at"]);
        const title = typeof award["title"] === "string" ? award["title"] : "Milestone";
        if (points <= 0 || !at) continue;
        put({
          key: `award:${award["id"]}`,
          points,
          kind: "goal",
          label: title,
          refId: typeof award["refId"] === "string" ? award["refId"] : null,
          at,
          updatedAt: at,
        });
      }
    }
  } catch {
    /* older or partial prefs document — habits alone still seed */
  }

  setPref(POINTS_LEDGER_KEY, { version: 1, events });
  setPref(SEEDED_KEY, true);
}

/* --------------------------------- api ----------------------------------- */

/** Record an earning. Returns null when this exact key was already paid. */
export function recordPointEvent(input: {
  key: string;
  points: number;
  kind: PointKind;
  label: string;
  refId?: string | null;
  at?: string;
}): PointEvent | null {
  const points = Math.round(input.points);
  if (!input.key || points === 0) return null;
  const doc = loadPointsDoc();
  const existing = doc.events[input.key];
  if (existing && !existing.removed) return null;

  const at = input.at ?? new Date().toISOString();
  const event: PointEvent = {
    key: input.key,
    points,
    kind: input.kind,
    label: input.label.slice(0, 160),
    refId: input.refId ?? null,
    at,
    updatedAt: new Date().toISOString(),
  };
  writePointsDoc({ version: 1, events: { ...doc.events, [input.key]: event } });
  emit({ points, label: event.label });
  return event;
}

/** Undo an earning exactly once. Safe when the key was never paid. */
export function revokePointEvent(key: string): boolean {
  const doc = loadPointsDoc();
  const existing = doc.events[key];
  if (!existing || existing.removed) return false;
  const tombstone: PointEvent = {
    ...existing,
    removed: true,
    updatedAt: new Date().toISOString(),
  };
  writePointsDoc({ version: 1, events: { ...doc.events, [key]: tombstone } });
  return true;
}

export function pointEvents(doc: PointsDoc = loadPointsDoc()): PointEvent[] {
  return Object.values(doc.events)
    .filter((event) => !event.removed)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function pointsBalance(doc: PointsDoc = loadPointsDoc()): number {
  return pointEvents(doc).reduce((sum, event) => sum + event.points, 0);
}

/** What was earned (or spent) on one local day. */
export function pointsOn(date: string, doc: PointsDoc = loadPointsDoc()): number {
  return pointEvents(doc)
    .filter((event) => event.at.slice(0, 10) === date)
    .reduce((sum, event) => sum + event.points, 0);
}

export function todayPointsEarned(doc: PointsDoc = loadPointsDoc()): number {
  return pointsOn(todayLocal(), doc);
}

/** The habit earning key — one per habit per local day. */
export function habitPointKey(habitId: string, date: string): string {
  return `habit:${habitId}:${date}`;
}

export function goalPointKey(refId: string, periodKey: string): string {
  return `goal:${refId}:${periodKey}`;
}

/**
 * True when this device has an account to read an authoritative balance from.
 * Kept here so UI code doesn't reach into Supabase directly for the wallet.
 */
export function walletIsCloud(): boolean {
  return hasSupabaseConfig;
}

/** Test seam: forget the seed marker so the next read can rebuild. */
export function resetPointsSeed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("bloom.points.seeded.v1");
  } catch {
    /* ignore */
  }
}

/** Re-emit the change signal (after an authoritative balance read). */
export function announcePointsChanged(): void {
  emit();
}

export { PREFS_CHANGED };
