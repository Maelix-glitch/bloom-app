/**
 * Account verification — the blue tick, and the record behind it.
 *
 * Verification v3 (owner directive, 2026-11-22): the badge is
 * GRANT-ONLY. A row in `public.account_verifications` is the tick — no
 * row, no tick, whatever the profile looks like — and rows are created
 * ONLY by the owner, from a trusted SQL session, through the
 * service-role grant function in the 20261122 migration.
 *
 * This supersedes v2 (2026-11-15), under which the record was granted
 * by a client-reachable claim when three gates passed (invited member,
 * confirmed email, complete profile). Bloom is invite-only, so those
 * gates were effectively every member — the owner ended that: who is
 * eligible is his call, released by him, and nothing a member is or
 * completes earns the badge.
 *
 * So the record is not one input among several; it is the whole truth,
 * for the signed-in user exactly as for anyone else. There are no steps
 * to report and no grant ever "on its way": a member without a record
 * is simply not verified, full stop. Facts that have not loaded yet are
 * passed in as unproven (false), never assumed — an unknown record
 * state reads as "not verified", so the tick can appear once the facts
 * land but can never show without them.
 *
 * `verificationStatus` is the one place that truth lives: the hero
 * badge, the sidebar badge, the settings row and these tests all read
 * it.
 */

/**
 * The universal verification blue (the #1d9bf0 family). Deliberately NOT a
 * Bloom palette token: blue is what makes the tick read as "verified"
 * everywhere, and it lives here in lib — the design-token guard's home
 * rules keep hex out of components, and this is data, not chrome.
 */
export const VERIFIED_BLUE = "#1d9bf0";

/**
 * Bloom gold — the rail's tone for the same badge (brief v4 Part 4;
 * M-91). The tick's MEANING is unchanged (it renders only when a record
 * exists); inside the sidebar's gold palette the blue read as an
 * off-palette social-media import, so the rail wears the badge in the
 * app's own gold. Profile surfaces keep the blue, pending the roll-out
 * decision.
 */
export const VERIFIED_GOLD = "#dcc08f";

export type VerificationStepId = "invite" | "email" | "profile";

export interface VerificationStep {
  id: VerificationStepId;
  label: string;
  done: boolean;
  /** What to do about this step, written for the settings row. */
  guidance: string;
}

export interface VerificationStatus {
  verified: boolean;
  /**
   * Always 0. Under v2 this counted the unmet claim gates; grant-only
   * has no ladder left to climb. Kept so the status keeps the shape
   * its readers were built against.
   */
  remaining: number;
  /**
   * Always false. Under v2 this marked "every step done, grant being
   * recorded" — a promise that a grant was on its way from something
   * the member did. No such promise exists any more, so the field is
   * kept for shape and never set.
   */
  pendingRecord: boolean;
  /**
   * Always empty: there are no steps to report — not because they were
   * skipped, but because verification is granted, not stepped through.
   */
  steps: VerificationStep[];
}

export interface VerificationInput {
  /**
   * A row exists in `account_verifications` for this account. False
   * until proven — the record is the tick, so an unloaded read is no
   * tick. It is the ONLY input: the record is the whole truth.
   */
  hasRecord: boolean;
}

export function verificationStatus(input: VerificationInput): VerificationStatus {
  return {
    verified: input.hasRecord,
    remaining: 0,
    pendingRecord: false,
    steps: [],
  };
}

/**
 * The status of SOMEONE ELSE, from the one public fact about their
 * tick: whether a record exists in `account_verifications`. Under
 * grant-only this is the same truth as the signed-in reading — a
 * record can only have been created by the owner's grant — so both
 * readings share the one implementation above.
 */
export function verificationStatusFromRecord(hasRecord: boolean): VerificationStatus {
  return verificationStatus({ hasRecord });
}
