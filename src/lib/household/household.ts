/**
 * One-Kitchen Family — the household the account holder cooks for.
 *
 * One kitchen cooks for the whole household. This module stores the
 * OTHER people at the table: a name, the dietary pattern they eat
 * (the app's own `DietaryPattern` vocabulary — the same values the
 * Assessment offers, never a second list), and their allergies and
 * dislikes in their own words.
 *
 * The account holder is NOT a stored member. They are member #1 by
 * construction (see `ownerAsMember` in suitability.ts): their pattern
 * and allergies come from their own stored Assessment, because the
 * owner's rule is that pattern and budget are asked only in the
 * Assessment. This surface manages other household members only, and
 * the UI says so.
 *
 * Storage is a versioned prefs key, `health.household.v1`, in the
 * shared preferences document — sync, export (`loadDoc()` wholesale)
 * and erasure (device wipe + `erase_my_data()` on `user_prefs`) are
 * inherited by construction, the same pattern the assessment history
 * and the target adjustment use.
 */

import { getPref, setPref } from "@/lib/prefs";
import { DIETARY_PATTERNS, type DietaryPattern } from "@/lib/vitalis/domain/profile";

export const HOUSEHOLD_KEY = "health.household.v1";
export const HOUSEHOLD_VERSION = 1;

/** A household is a kitchen, not a crowd: the list is capped so a
 *  corrupted or runaway value can never grow without bound. */
export const MAX_HOUSEHOLD_MEMBERS = 12;
const MAX_NAME_CHARS = 60;
const MAX_TERMS = 30;
const MAX_TERM_CHARS = 60;

export interface HouseholdMember {
  id: string;
  name: string;
  /** Null = no pattern stated for this person: no pattern filter is
   *  applied to them (the plan's own rule for an unanswered pattern). */
  pattern: DietaryPattern | null;
  /** Free text, in the words of the person who typed them. Matching
   *  against dish ingredients happens in suitability.ts, with the
   *  plan's own name-matching discipline — and anything that cannot
   *  be matched is surfaced as "check manually", never as safe. */
  allergies: string[];
  dislikes: string[];
}

export interface HouseholdValue {
  version: typeof HOUSEHOLD_VERSION;
  members: HouseholdMember[];
}

export const EMPTY_HOUSEHOLD: HouseholdValue = { version: HOUSEHOLD_VERSION, members: [] };

/* ------------------------------- parsing -------------------------------- */

function cleanText(value: unknown, maxChars: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length === 0 || text.length > maxChars) return null;
  return text;
}

function cleanTerms(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const term = cleanText(item, MAX_TERM_CHARS);
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(term);
    if (out.length >= MAX_TERMS) break;
  }
  return out;
}

function parseMember(raw: unknown): HouseholdMember | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const id = cleanText(r["id"], 80);
  const name = cleanText(r["name"], MAX_NAME_CHARS);
  if (!id || !name) return null;
  const patternRaw = r["pattern"];
  const pattern =
    typeof patternRaw === "string" &&
    (DIETARY_PATTERNS as readonly string[]).includes(patternRaw)
      ? (patternRaw as DietaryPattern)
      : null;
  return {
    id,
    name,
    pattern,
    allergies: cleanTerms(r["allergies"]),
    dislikes: cleanTerms(r["dislikes"]),
  };
}

/** Strict parse: anything unrecognisable is dropped, never repaired
 *  into a claim the person did not make. Duplicate ids keep the
 *  first entry. */
export function parseHouseholdValue(raw: unknown): HouseholdValue | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== HOUSEHOLD_VERSION) return null;
  if (!Array.isArray(r["members"])) return null;
  const members: HouseholdMember[] = [];
  const seenIds = new Set<string>();
  for (const item of r["members"]) {
    const member = parseMember(item);
    if (!member || seenIds.has(member.id)) continue;
    seenIds.add(member.id);
    members.push(member);
    if (members.length >= MAX_HOUSEHOLD_MEMBERS) break;
  }
  return { version: HOUSEHOLD_VERSION, members };
}

/* ------------------------------ prefs I/O ------------------------------- */

export function readHouseholdValue(): HouseholdValue {
  return getPref(HOUSEHOLD_KEY, parseHouseholdValue, EMPTY_HOUSEHOLD);
}

export function writeHouseholdValue(value: HouseholdValue): void {
  setPref(HOUSEHOLD_KEY, value);
}

/** A stable id for a new member. Uses the platform UUID when present;
 *  the fallback only needs to be unique within one household list. */
export function newMemberId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `member-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** Append a member. Returns the stored value, or null when the
 *  household is already at the cap (the caller says so honestly
 *  rather than silently dropping someone). */
export function addHouseholdMember(
  current: HouseholdValue,
  draft: Omit<HouseholdMember, "id">,
): HouseholdValue | null {
  if (current.members.length >= MAX_HOUSEHOLD_MEMBERS) return null;
  const member = parseMember({ ...draft, id: newMemberId() });
  if (!member) return null;
  return { version: HOUSEHOLD_VERSION, members: [...current.members, member] };
}

export function removeHouseholdMember(
  current: HouseholdValue,
  memberId: string,
): HouseholdValue {
  return {
    version: HOUSEHOLD_VERSION,
    members: current.members.filter((m) => m.id !== memberId),
  };
}

/** Split a comma-separated line the person typed into clean terms —
 *  the add form's one text field for allergies and for dislikes. */
export function splitTerms(text: string): string[] {
  return cleanTerms(text.split(","));
}
