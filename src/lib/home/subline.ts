/**
 * The Home hero subtitle — a pure function, so its behaviour is testable.
 *
 * The line has exactly three states and never rotates:
 *
 *   1. the record is still loading  → one fixed reading message
 *   2. the record has loaded        → a sentence derived from today's data
 *   3. (no data)                    → the same sentence model, with a quiet day
 *
 * It is deliberately not time-based, random, or interval-driven: the earlier
 * bug was a volatile loading flag alternating with the loaded summary, which
 * made a stable product look unstable.
 */

export const RECORD_READING = "Reading today's record…";

export type SublineInput = {
  /** Latched: true once the stores have loaded at least once. */
  ready: boolean;
  /** The onboarding answer says this is the person's first day. */
  firstDay: boolean;
  /** Unfinished items in today's focus list. */
  openCount: number;
};

/**
 * Whether the hero may use its day-one line. The onboarding answer's
 * "first day" claim lives on ONE device: a person who signs in on a new
 * browser re-answers onboarding and the claim says "day one" over a
 * months-old record (seen live — "Day one" beside 405 points and a
 * three-month history). The record itself is the authority: day one is
 * only real when the record holds at most one logged day.
 */
export function genuineFirstDay(claimedFirstDay: boolean, distinctLoggedDays: number): boolean {
  return claimedFirstDay && distinctLoggedDays <= 1;
}

const WORDS = ["Two", "Three", "Four", "Five"];

export function sublineFor({ ready, firstDay, openCount }: SublineInput): string {
  if (!ready) return RECORD_READING;
  if (firstDay) return "Day one — look around, log one thing when it's natural.";
  if (openCount <= 0) return "Everything you track is logged. Enjoy the quiet.";
  if (openCount === 1) return "One thing left to shape your day.";
  const count = openCount <= WORDS.length + 1 ? WORDS[openCount - 2] : String(openCount);
  return `${count} things left to shape your day.`;
}
