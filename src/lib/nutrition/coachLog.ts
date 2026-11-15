/**
 * Nutrition — the Coach photo-estimate handoff (W4-3 N5, design §4.4).
 *
 * When Coach answers a food photo, the reply names the dish and carries
 * one line of rough totals ("≈ 540 kcal · 32 g protein · 61 g carbs ·
 * 19 g fat" — the edge prompt's own format). Under such a reply the
 * client offers "Log this". Nothing is logged by the offer itself:
 * Coach proposes, the user disposes — the tap opens a confirm sheet,
 * and only the sheet's confirm creates an entry, through the estimate
 * factory (`createEstimateEntry`), so what lands in the log is an
 * estimate forever, labelled as one, and never becomes a reusable Food.
 *
 * Detection is deliberately strict. An estimate is usable only when
 * BOTH halves are present:
 *   · the user message this reply answers carries a `photoNote` — the
 *     identification recorded from the vision reply itself (PR #113),
 *     which exists only for photo turns; and
 *   · the reply carries a clean ≈ line from which all four totals
 *     (kcal, protein, carbs, fat) parse as single numbers inside the
 *     engine's entry caps.
 * Anything less — no photo, a hedged range, a missing macro — and there
 * is no button: Bloom never logs a guess about a guess.
 *
 * Duplicate protection: a third prefs key, `health.coachlog.v1`, maps
 * Coach message id → log entry id. It inherits the prefs document's
 * sync/export/erasure by construction, like the foods and food-log
 * keys. The mapping is honoured only while the entry it names is still
 * in the log — delete the entry (in the Nutrition tab) and the message
 * can be logged again; keep it and the action reads "Logged", and the
 * lib-level log call itself refuses to create a second copy.
 */

import { getPref, setPref } from "@/lib/prefs";
import { createEstimateEntry } from "./entries";
import { logEntry } from "./log";
import { parseEntryNutrients } from "./parse";
import { readFoodLog } from "./store";
import type { LogEntry, Meal, Nutrients } from "./types";

/* --------------------------- estimate parsing --------------------------- */

const SEGMENT_RE = /^([\d,]+(?:\.\d+)?)\s*(kcal|g protein|g carbs|g fat)$/;

/**
 * One ≈ line → its totals, or null. The line must start with ≈ and
 * consist of `·`-separated segments, each a single number with one of
 * the four units, each unit exactly once. A range ("500–600 kcal"), a
 * missing macro, a duplicated unit, or any prose segment makes the
 * line unusable — it is not an estimate Bloom can log honestly.
 * The parsed numbers must also pass the engine's own entry parser
 * (caps included), so an out-of-range line fails here, not at save.
 */
function parseEstimateLine(line: string): Nutrients | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("≈")) return null;
  const segments = trimmed
    .slice(1)
    .split("·")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (segments.length !== 4) return null;
  const found: Partial<Record<"kcal" | "proteinG" | "carbsG" | "fatG", number>> = {};
  for (const segment of segments) {
    const m = SEGMENT_RE.exec(segment);
    if (!m) return null;
    const value = Number(m[1]!.replace(/,/g, ""));
    if (!Number.isFinite(value)) return null;
    const key =
      m[2] === "kcal"
        ? "kcal"
        : m[2] === "g protein"
          ? "proteinG"
          : m[2] === "g carbs"
            ? "carbsG"
            : "fatG";
    if (found[key] !== undefined) return null;
    found[key] = value;
  }
  if (
    found.kcal === undefined ||
    found.proteinG === undefined ||
    found.carbsG === undefined ||
    found.fatG === undefined
  ) {
    return null;
  }
  // A zero-calorie "meal" is not an estimate of food.
  if (found.kcal <= 0) return null;
  return parseEntryNutrients({
    kcal: found.kcal,
    proteinG: found.proteinG,
    carbsG: found.carbsG,
    fatG: found.fatG,
  });
}

/** The totals from a reply's ≈ line, scanning paragraphs and their
 *  lines. Null when the reply carries no usable estimate line. */
export function parseCoachEstimateTotals(paragraphs: readonly string[]): Nutrients | null {
  for (const paragraph of paragraphs) {
    for (const line of paragraph.split("\n")) {
      const totals = parseEstimateLine(line);
      if (totals) return totals;
    }
  }
  return null;
}

/* --------------------------- estimate detection -------------------------- */

export interface CoachPhotoEstimate {
  /** Prefill for the confirm sheet's name field: the identification the
   *  reply itself recorded, verbatim. The user confirms or edits it —
   *  "Lunch — photo estimate" is not a food name (§4.4). */
  name: string;
  /** Coach's totals for the photographed portion, exactly as stated. */
  totals: Nutrients;
}

/**
 * The usable estimate behind a Coach reply, or null. Both halves are
 * required: a recorded photo identification (the photoNote — it exists
 * only when this reply read a photo) and a parseable ≈ totals line.
 */
export function coachPhotoEstimate(
  paragraphs: readonly string[],
  photoNote: string | undefined,
): CoachPhotoEstimate | null {
  const name = photoNote?.trim();
  if (!name) return null;
  const totals = parseCoachEstimateTotals(paragraphs);
  if (!totals) return null;
  return { name, totals };
}

/** The slice of a thread message this module reads — structural, so the
 *  lib never imports the Coach hook's types. */
export interface CoachThreadMessageLike {
  role: string;
  paragraphs: readonly string[];
  photoNote?: string | undefined;
}

/**
 * The estimate a thread message offers to log, or null. A Coach reply
 * answers the nearest preceding non-Coach message; that message's
 * photoNote decides whether the reply read a photo. A later follow-up
 * reply answers a message with no photoNote, so it never re-offers an
 * earlier photo's estimate.
 */
export function coachEstimateForMessage(
  messages: readonly CoachThreadMessageLike[],
  index: number,
): CoachPhotoEstimate | null {
  const message = messages[index];
  if (!message || message.role !== "coach") return null;
  for (let i = index - 1; i >= 0; i -= 1) {
    const prior = messages[i]!;
    if (prior.role === "coach") continue;
    return coachPhotoEstimate(message.paragraphs, prior.photoNote);
  }
  return null;
}

/* ------------------------------ meal default ----------------------------- */

/** The meal slot a time of day defaults to in the confirm sheet. A
 *  default only — the sheet always lets the user change it. */
export function mealForHour(hour: number): Meal {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 22) return "dinner";
  return "snack";
}

export function mealForTimeOfDay(now: Date = new Date()): Meal {
  return mealForHour(now.getHours());
}

/* --------------------------- edited-totals input -------------------------- */

/**
 * Forgiving parse of one numeric field from the confirm sheet: grouping
 * commas ("1,200") and a decimal comma ("1,5") are both read the way
 * the person meant them; anything else that is not a plain number is
 * not a number. Returns null on empty/garbage.
 */
function parseFieldNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, "");
  if (s === "") return null;
  let normalised = s;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    normalised = s.replace(/,/g, "");
  } else if (/^\d+,\d{1,2}$/.test(s)) {
    normalised = s.replace(",", ".");
  }
  if (!/^\d+(\.\d+)?$/.test(normalised)) return null;
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

/**
 * The confirm sheet's four fields → totals, validated by the engine's
 * own entry parser (caps included) plus the one rule the parser does
 * not hold: a logged meal carries some energy. Null when any field is
 * unusable — the sheet keeps the confirm disabled rather than guessing.
 */
export function parseEditedTotals(fields: {
  kcal: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}): Nutrients | null {
  const kcal = parseFieldNumber(fields.kcal);
  const proteinG = parseFieldNumber(fields.proteinG);
  const carbsG = parseFieldNumber(fields.carbsG);
  const fatG = parseFieldNumber(fields.fatG);
  if (kcal === null || proteinG === null || carbsG === null || fatG === null) return null;
  if (kcal <= 0) return null;
  return parseEntryNutrients({ kcal, proteinG, carbsG, fatG });
}

/* ------------------------- duplicate record (prefs) ----------------------- */

export const COACH_LOG_KEY = "health.coachlog.v1";
export const COACH_LOG_VERSION = 1;

export interface CoachLogValue {
  version: typeof COACH_LOG_VERSION;
  /** Coach message id → the log entry it was logged as. */
  logged: Record<string, string>;
}

export function coachLogValueOf(logged: Record<string, string>): CoachLogValue {
  return { version: COACH_LOG_VERSION, logged };
}

/** Strict envelope parse. Malformed pairs drop; a wrong envelope is
 *  null, so `getPref` falls back and a corrupt value reaches no one. */
export function parseCoachLogValue(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== COACH_LOG_VERSION) return null;
  const logged = r["logged"];
  if (!logged || typeof logged !== "object" || Array.isArray(logged)) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(logged)) {
    if (key.length > 0 && typeof value === "string" && value.length > 0) out[key] = value;
  }
  return out;
}

const NO_LOGGED: Record<string, string> = {};

export function readCoachLogRecord(): Record<string, string> {
  return getPref(COACH_LOG_KEY, parseCoachLogValue, NO_LOGGED);
}

export function recordCoachLog(messageId: string, entryId: string): void {
  setPref(COACH_LOG_KEY, coachLogValueOf({ ...readCoachLogRecord(), [messageId]: entryId }));
}

/** The entry a message was logged as, from a record + a log: the
 *  mapping counts only while the entry it names is still in the log. */
export function loggedEntryIdFrom(
  record: Readonly<Record<string, string>>,
  entries: readonly LogEntry[],
  messageId: string,
): string | null {
  const entryId = record[messageId];
  if (!entryId) return null;
  return entries.some((e) => e.id === entryId) ? entryId : null;
}

export function loggedEntryIdFor(messageId: string, entries: readonly LogEntry[]): string | null {
  return loggedEntryIdFrom(readCoachLogRecord(), entries, messageId);
}

/* --------------------------------- logging -------------------------------- */

/**
 * Log a Coach photo estimate into today's food log — the confirm
 * sheet's one write path. The entry is built ONLY by the estimate
 * factory (source `coach_photo`, provenance `coach_estimate`, the
 * confirmed totals as its snapshot); no reusable Food is created.
 *
 * Idempotent per message: if this message was already logged and that
 * entry is still in the log, the existing entry is returned and
 * nothing is written — a second confirm can never double-log.
 * Returns null when the factory refuses the entry (e.g. totals edited
 * beyond the entry caps) — nothing is written then, either.
 */
export function logCoachEstimate(input: {
  messageId: string;
  name: string;
  totals: Nutrients;
  meal: Meal;
  day: string;
  now: string;
}): LogEntry | null {
  const entries = readFoodLog();
  const existingId = loggedEntryIdFor(input.messageId, entries);
  if (existingId) return entries.find((e) => e.id === existingId) ?? null;
  const entry = createEstimateEntry({
    name: input.name,
    totals: input.totals,
    meal: input.meal,
    day: input.day,
    now: input.now,
  });
  if (!entry) return null;
  logEntry(entry);
  recordCoachLog(input.messageId, entry.id);
  return entry;
}
