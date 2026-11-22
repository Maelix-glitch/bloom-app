/**
 * Member badges — the labelled pills beside the verified tick
 * (owner directive, 2026-11-22: "add badges like trainer, tester, and
 * other badges").
 *
 * Three badges exist — Founder, Trainer, Tester — and each has ONE
 * truth, never two:
 *
 *   · Trainer derives from the EXISTING trainer grant: a row in
 *     `trainer_profiles` (migration 20261121). There is no second
 *     grant path for it, and `member_badges` cannot even hold it —
 *     the table's check constraint is exactly ('founder', 'tester').
 *   · Founder and Tester are rows in `member_badges` (migration
 *     20261122_member_badges), created ONLY by the owner's
 *     service-role grant function from a trusted session — the M-208
 *     grant-only pattern. Nothing a member does earns one.
 *
 * This module is the one place that derivation lives: every surface
 * (Profile hero, people search, the rail, Settings) feeds it the same
 * facts and renders what it returns. Facts that have not loaded yet
 * are passed in as unproven (no row, no kinds), so a badge can appear
 * once its facts land but can never show without them.
 *
 * Display order is fixed — founder, then trainer, then tester —
 * whatever order the facts arrived in.
 */

export type MemberBadgeKind = "founder" | "trainer" | "tester";

/** The kinds a `member_badges` row can carry. Trainer is deliberately
 *  absent: it is not granted through that table. */
export type GrantedBadgeKind = "founder" | "tester";

export interface MemberBadge {
  kind: MemberBadgeKind;
  /** The pill's words — exactly these, on every surface. */
  label: string;
}

export const MEMBER_BADGE_LABEL: Record<MemberBadgeKind, string> = {
  founder: "Founder",
  trainer: "Trainer",
  tester: "Tester",
};

/** Display order, highest first: founder, trainer, tester. */
export const MEMBER_BADGE_ORDER: readonly MemberBadgeKind[] = ["founder", "trainer", "tester"];

export interface BadgeFactsInput {
  /**
   * A row exists in `trainer_profiles` for this person. False until
   * proven — it is the trainer badge's whole truth.
   */
  hasTrainerRow: boolean;
  /**
   * The raw badge values of the person's `member_badges` rows.
   * Unfiltered on purpose: unknown values are ignored by the
   * derivation, never rendered, so a surprise row cannot invent a
   * badge.
   */
  memberBadgeKinds: readonly string[];
}

export function isGrantedBadgeKind(value: string): value is GrantedBadgeKind {
  return value === "founder" || value === "tester";
}

/**
 * The badges a person holds, in display order. A "trainer" string
 * among the granted kinds earns NOTHING — the trainer badge is the
 * trainer row's to give (one truth per badge).
 */
export function memberBadgesOf(input: BadgeFactsInput): MemberBadge[] {
  const held = new Set<MemberBadgeKind>();
  for (const raw of input.memberBadgeKinds) {
    if (isGrantedBadgeKind(raw)) held.add(raw);
  }
  if (input.hasTrainerRow) held.add("trainer");
  return MEMBER_BADGE_ORDER.filter((kind) => held.has(kind)).map((kind) => ({
    kind,
    label: MEMBER_BADGE_LABEL[kind],
  }));
}
