/**
 * What a qualified referral is worth, and what "qualified" means.
 *
 * These live in shared types rather than in either bot because both need
 * them and they must agree: Guardian decides whether a referral qualifies,
 * Companion decides what to pay for it, and a member-facing message that
 * quotes a different number from the one actually paid is the kind of small
 * dishonesty that costs a community its trust in the whole system.
 *
 * Deliberately constants rather than per-guild settings. A configurable
 * payout is a knob that can be turned up, and a points economy whose rate can
 * be changed by whoever holds the settings command is not an economy. If this
 * ever needs to vary, it should vary through a migration and a review, not a
 * slash command.
 */

/**
 * Points paid to the inviter when a referral qualifies.
 *
 * Twenty-five: five times a check-in, and worth roughly a week of showing up.
 * High enough that bringing a friend feels recognised, low enough that it is
 * not worth farming — which matters more than the exact figure, because the
 * qualification rules below are what actually stop farming and the payout is
 * what decides how hard someone will try to get around them.
 *
 * The referred member is paid nothing. Paying both sides is how referral
 * schemes turn into two people trading accounts.
 */
export const REFERRAL_POINTS = 25;

/**
 * The rules a referral must pass before anyone is paid.
 *
 * All four are deliberately boring and deterministic. A fraud model that
 * cannot be explained to the person it refused is not a feature, and none of
 * this needs one: the combination of a waiting period and an account-age floor
 * removes the entire economic case for farming, because the cheapest attack
 * costs a month of real time per fake account.
 */
export const REFERRAL_QUALIFICATION = {
  /**
   * How old the invited member's Discord account must be, in days.
   *
   * Read from the account snowflake, so it costs nothing and cannot be
   * forged. Thirty days is the standard raid-resistance floor: long enough
   * that bulk-registered accounts have not matured, short enough that a real
   * person who made an account to join is only mildly inconvenienced — and
   * they are not refused, only unpaid, which is the important distinction.
   */
  minAccountAgeDays: 30,

  /**
   * How long the invited member must remain in the server, in days.
   *
   * The anti-farming rule that does the real work. Nothing is paid at join
   * time, so an invite that produces someone who leaves the same afternoon
   * produces nothing. Seven days is a week of exposure to the community: long
   * enough to be a real arrival, short enough that the inviter has not
   * forgotten.
   */
  minMembershipDays: 7,
} as const;

export type ReferralQualification = typeof REFERRAL_QUALIFICATION;
