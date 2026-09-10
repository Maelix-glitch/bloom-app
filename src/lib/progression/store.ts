/**
 * Bloom Progression — the award ledger.
 *
 * Points are **server-authoritative**: the balance lives on
 * `profiles.total_points` and is never written from here. This store only
 * records which goals/achievements have already been paid and what the
 * milestone archive looks like — the *idempotency* half of the award.
 *
 * Signed in, the authoritative record is the `point_transactions` table and
 * awards go through `award_progress()` (see supabase/migrations/
 * 20260910_progression.sql), which verifies, awards and marks the period in a
 * single transaction. This device-first store is the offline mirror: the same
 * shape, written the moment an award succeeds, so the page is honest and
 * complete with or without a database.
 *
 * Guarantees:
 *   · a goal can only pay once per period (`hasClaim`),
 *   · an achievement can only pay once ever,
 *   · a rank-up is recorded once (the ledger's rank entries are authoritative),
 *   · nothing here invents points: every entry is a real award.
 */

import { PREFS_CHANGED, clearPref, getPref, setPref } from "@/lib/prefs";
import { todayLocal } from "@/lib/localDay";

import type { LedgerKind, PointEntry, PointSource, RankEvent } from "./types";

const KEYS = {
  ledger: "progression.ledger.v1",
  awards: "progression.awards.v1",
  ranks: "progression.ranks.v1",
} as const;

export const PROGRESSION_CHANGED = "bloom:progression-changed";

function emit(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROGRESSION_CHANGED));
}

/** Store changes plus the prefs mirror (cross-tab + sign-in merges). */
export function subscribeProgression(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PROGRESSION_CHANGED, listener);
  window.addEventListener(PREFS_CHANGED, listener);
  return () => {
    window.removeEventListener(PROGRESSION_CHANGED, listener);
    window.removeEventListener(PREFS_CHANGED, listener);
  };
}

/* ------------------------------ validation ------------------------------- */

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

const KINDS: LedgerKind[] = ["goal", "achievement", "rank"];

function parseLedger(raw: unknown): PointEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PointEntry[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = entry["id"];
    const title = entry["title"];
    const points = entry["points"];
    const at = entry["at"];
    const kind = entry["kind"];
    if (typeof id !== "string" || typeof title !== "string" || typeof points !== "number") continue;
    if (typeof at !== "string" || typeof kind !== "string") continue;
    if (!KINDS.includes(kind as LedgerKind)) continue;
    const refId = entry["refId"];
    const periodKey = entry["periodKey"];
    const source = entry["source"];
    out.push({
      id,
      kind: kind as LedgerKind,
      refId: typeof refId === "string" ? refId : null,
      periodKey: typeof periodKey === "string" ? periodKey : null,
      title,
      source: (typeof source === "string" ? source : "milestones") as PointSource,
      points: Math.round(points),
      at,
    });
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 200);
}

function parseAwards(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

function parseRanks(raw: unknown): RankEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: RankEvent[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const tier = entry["tier"];
    const name = entry["name"];
    const atPoints = entry["atPoints"];
    const at = entry["at"];
    if (typeof tier !== "number" || typeof name !== "string") continue;
    if (typeof atPoints !== "number" || typeof at !== "string") continue;
    out.push({ tier, name, atPoints, at });
  }
  return out.sort((a, b) => b.tier - a.tier);
}

/* --------------------------------- reads --------------------------------- */

export interface LedgerState {
  ledger: PointEntry[];
  /** `${refId}|${periodKey}` → ISO timestamp awarded. */
  awards: Record<string, string>;
  ranks: RankEvent[];
}

export function loadLedger(): LedgerState {
  return {
    ledger: getPref(KEYS.ledger, parseLedger, []),
    awards: getPref(KEYS.awards, parseAwards, {}),
    ranks: getPref(KEYS.ranks, parseRanks, []),
  };
}

export function claimKey(refId: string, periodKey: string): string {
  return `${refId}|${periodKey}`;
}

/** Has this exact award already been paid? The one duplicate guard. */
export function hasClaim(refId: string, periodKey: string): boolean {
  return Boolean(loadLedger().awards[claimKey(refId, periodKey)]);
}

/** When an achievement was earned (real timestamp, or null). */
export function achievedAtOf(id: string): string | null {
  return loadLedger().awards[claimKey(id, "once")] ?? null;
}

export function ledgerPoints(): number {
  return loadLedger().ledger.reduce((sum, entry) => sum + entry.points, 0);
}

/* -------------------------------- writes --------------------------------- */

/**
 * Record a real award. Idempotent: a second call for the same (ref, period)
 * returns null and changes nothing. This is the client mirror of the server's
 * `award_progress()` — call it exactly once, after the server confirms.
 */
export function recordAward(entry: {
  kind: LedgerKind;
  refId: string;
  periodKey: string | null;
  title: string;
  source: PointSource;
  points: number;
  at?: string;
}): PointEntry | null {
  const state = loadLedger();
  const key = claimKey(entry.refId, entry.periodKey ?? "once");
  if (state.awards[key]) return null;

  const at = entry.at ?? new Date().toISOString();
  const award: PointEntry = {
    id: `${entry.kind}-${entry.refId}-${entry.periodKey ?? "once"}-${at}`,
    kind: entry.kind,
    refId: entry.refId,
    periodKey: entry.periodKey,
    title: entry.title,
    source: entry.source,
    points: Math.round(entry.points),
    at,
  };
  setPref(KEYS.awards, { ...state.awards, [key]: at });
  setPref(KEYS.ledger, [award, ...state.ledger].slice(0, 200));
  emit();
  return award;
}

/**
 * Record a rank-up the person actually reached. Never re-records a tier, so
 * crossing a threshold twice (a refunded tick, a corrected log) cannot
 * re-trigger the ceremony.
 */
export function recordRank(tier: number, name: string, atPoints: number): RankEvent | null {
  const state = loadLedger();
  if (state.ranks.some((event) => event.tier >= tier)) return null;
  const event: RankEvent = { tier, name, atPoints, at: new Date().toISOString() };
  setPref(KEYS.ranks, [...state.ranks, event].sort((a, b) => a.tier - b.tier));
  emit();
  return event;
}

/** The newest rank-up, for the ceremony — only when it is genuinely new. */
export function lastRankEvent(): RankEvent | null {
  return loadLedger().ranks[0] ?? null;
}

/** Highest tier already welcomed, so a fresh device does not re-celebrate. */
export function celebrateUpTo(tier: number): void {
  const state = loadLedger();
  if (state.ranks.some((event) => event.tier === tier)) return;
  setPref(KEYS.ranks, [
    ...state.ranks,
    { tier, name: "", atPoints: 0, at: new Date().toISOString() } satisfies RankEvent,
  ].sort((a, b) => a.tier - b.tier));
}

/** Awards on a given local day — the real "you earned this today" line. */
export function awardsOn(localDay: string): PointEntry[] {
  return loadLedger().ledger.filter((entry) => entry.at.slice(0, 10) === localDay);
}

export function todaysAwards(): PointEntry[] {
  return awardsOn(todayLocal());
}

/** Everything the journey has recorded — for the milestone archive. */
export function milestoneArchive(): PointEntry[] {
  return loadLedger().ledger.filter((entry) => entry.kind !== "rank").slice(0, 40);
}

export function rankHistory(): RankEvent[] {
  return loadLedger().ranks.filter((event) => event.name).sort((a, b) => b.tier - a.tier);
}

/**
 * Forget every local progression record. Used only by a full account erase —
 * it never runs from the UI, so earned points and achievements are never
 * removed by an interface change.
 */
export function clearProgression(): void {
  clearPref(KEYS.ledger);
  clearPref(KEYS.awards);
  clearPref(KEYS.ranks);
  emit();
}

export const PROGRESSION_STORE_KEYS = KEYS;
