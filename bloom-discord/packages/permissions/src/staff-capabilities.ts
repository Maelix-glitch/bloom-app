import type { RoleKey } from '@bloom/shared-types';

/**
 * What a *person* on the staff team is allowed to do.
 *
 * This is deliberately a separate concept from `Capability` in
 * `@bloom/shared-types`, which answers a different question: what a *bot
 * process* is allowed to do. The two are easy to confuse and must never be
 * merged. Guardian holding `moderation:execute` says the Guardian process may
 * run moderation code; a moderator holding `staff.moderation.execute` says a
 * human is permitted to ask it to. A command needs both, and neither implies
 * the other.
 *
 * Names are namespaced `staff.<area>.<action>` so that a grep for `staff.`
 * finds every human-authorization decision in the codebase, and so that adding
 * an area later cannot collide with the bot capability vocabulary.
 */
export const STAFF_CAPABILITIES = [
  'staff.members.read',
  'staff.cases.read',
  'staff.cases.manage',
  'staff.reports.manage',
  'staff.moderation.execute',
  'staff.audit.read',
  'staff.rewards.read',
  'staff.rewards.award',
  'staff.rewards.revoke',
  'staff.labs.read',
  'staff.labs.triage',
  'staff.community.manage',
  'staff.staff.manage',
] as const;

export type StaffCapability = (typeof STAFF_CAPABILITIES)[number];

/**
 * The role keys that carry staff capabilities.
 *
 * A subset of the role vocabulary, pinned as a literal tuple so the tier table
 * below is exhaustive at compile time. `satisfies` keeps it honest: a tier that
 * is not a real role key will not compile. A test asserts this stays in step
 * with `STAFF_ROLE_KEYS`, which is the same set expressed for a different
 * purpose (who may run moderation commands at all).
 */
export const STAFF_TIERS = [
  'founder',
  'administrator',
  'moderator',
] as const satisfies readonly RoleKey[];

export type StaffTier = (typeof STAFF_TIERS)[number];

/**
 * Everything a moderator may do, and nothing more.
 *
 * The exclusions are the point of this list, so they are stated rather than
 * implied: a moderator cannot award or revoke rewards, cannot manage the staff
 * team, and cannot manage community configuration. Those are the capabilities
 * where the damage is economic or structural rather than correctable, so they
 * stay with Administrator and Founder.
 */
export const MODERATOR_STAFF_CAPABILITIES = [
  'staff.members.read',
  'staff.cases.read',
  'staff.cases.manage',
  'staff.reports.manage',
  'staff.moderation.execute',
  'staff.audit.read',
  'staff.labs.read',
  'staff.labs.triage',
] as const satisfies readonly StaffCapability[];

/**
 * The grant table: one row per staff tier.
 *
 * Adding a tier means adding a role key to `STAFF_TIERS` and a row here. No
 * policy code changes, because the policies read this table rather than
 * branching on role names. That is the extension point — future dedicated
 * staff roles (a rewards steward, a labs lead) slot in without touching the
 * authorization API.
 */
export const STAFF_TIER_CAPABILITIES: Readonly<
  Record<StaffTier, readonly StaffCapability[]>
> = {
  founder: STAFF_CAPABILITIES,
  administrator: STAFF_CAPABILITIES,
  moderator: MODERATOR_STAFF_CAPABILITIES,
};

export function isStaffCapability(value: unknown): value is StaffCapability {
  return (
    typeof value === 'string' && (STAFF_CAPABILITIES as readonly string[]).includes(value)
  );
}
