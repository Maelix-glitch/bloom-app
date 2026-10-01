import { describe, expect, it } from 'vitest';
import { BOT_CAPABILITIES, STAFF_ROLE_KEYS } from '@bloom/shared-types';
import {
  MODERATOR_STAFF_CAPABILITIES,
  STAFF_CAPABILITIES,
  STAFF_TIERS,
  STAFF_TIER_CAPABILITIES,
  isStaffCapability,
  type StaffCapability,
} from './staff-capabilities.js';

describe('STAFF_CAPABILITIES', () => {
  /*
   * Requirement 15: the vocabulary is stable. Commands, docs and audit rows
   * will carry these strings, so a rename is a breaking change to stored data
   * and not merely a refactor. Pinning the exact list makes that visible in
   * review instead of silent.
   */
  it('is exactly the thirteen agreed capability names', () => {
    expect([...STAFF_CAPABILITIES]).toEqual([
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
    ]);
  });

  it('has no duplicates', () => {
    expect(new Set(STAFF_CAPABILITIES).size).toBe(STAFF_CAPABILITIES.length);
  });

  it('namespaces every name under staff., so the two vocabularies cannot be confused', () => {
    for (const capability of STAFF_CAPABILITIES) {
      expect(capability.startsWith('staff.')).toBe(true);
    }
  });

  /*
   * The brief's hardest constraint: staff capabilities are not bot
   * capabilities. If a name ever appeared in both manifests, a reviewer could
   * reasonably assume one implied the other.
   */
  it('shares no name with the bot capability manifest', () => {
    const botCapabilities = new Set<string>(Object.values(BOT_CAPABILITIES).flat());

    for (const capability of STAFF_CAPABILITIES) {
      expect(botCapabilities.has(capability)).toBe(false);
    }
  });

  it('recognises its own members and rejects anything else', () => {
    expect(isStaffCapability('staff.cases.manage')).toBe(true);
    expect(isStaffCapability('staff.nope')).toBe(false);
    expect(isStaffCapability('moderation:execute')).toBe(false);
    expect(isStaffCapability('')).toBe(false);
    expect(isStaffCapability(null)).toBe(false);
    expect(isStaffCapability(undefined)).toBe(false);
    expect(isStaffCapability(42)).toBe(false);
    expect(isStaffCapability(['staff.cases.manage'])).toBe(false);
  });
});

describe('STAFF_TIERS', () => {
  it('matches the existing staff role vocabulary, so the two cannot drift', () => {
    expect([...STAFF_TIERS]).toEqual([...STAFF_ROLE_KEYS]);
  });

  it('has a grant row for every tier and no rows for anything else', () => {
    expect(Object.keys(STAFF_TIER_CAPABILITIES).sort()).toEqual([...STAFF_TIERS].sort());
  });

  it('grants only recognised capabilities', () => {
    for (const tier of STAFF_TIERS) {
      for (const capability of STAFF_TIER_CAPABILITIES[tier]) {
        expect(isStaffCapability(capability)).toBe(true);
      }
    }
  });
});

describe('STAFF_TIER_CAPABILITIES', () => {
  it('gives Founder and Administrator everything', () => {
    expect([...STAFF_TIER_CAPABILITIES.founder]).toEqual([...STAFF_CAPABILITIES]);
    expect([...STAFF_TIER_CAPABILITIES.administrator]).toEqual([...STAFF_CAPABILITIES]);
  });

  it('gives Moderator exactly the eight agreed capabilities', () => {
    expect([...STAFF_TIER_CAPABILITIES.moderator]).toEqual([
      'staff.members.read',
      'staff.cases.read',
      'staff.cases.manage',
      'staff.reports.manage',
      'staff.moderation.execute',
      'staff.audit.read',
      'staff.labs.read',
      'staff.labs.triage',
    ]);
    expect(MODERATOR_STAFF_CAPABILITIES).toHaveLength(8);
  });

  /*
   * Stated as an explicit list rather than as a length check, because these
   * five are the whole reason the Moderator tier exists as something narrower
   * than Administrator. A future edit that grants one of them to moderators
   * should have to delete a line here.
   */
  it('withholds the five escalation-sensitive capabilities from Moderator', () => {
    const moderator = new Set<StaffCapability>(STAFF_TIER_CAPABILITIES.moderator);
    const withheld = STAFF_CAPABILITIES.filter(
      (capability) => !moderator.has(capability),
    );

    expect([...withheld]).toEqual([
      'staff.rewards.read',
      'staff.rewards.award',
      'staff.rewards.revoke',
      'staff.community.manage',
      'staff.staff.manage',
    ]);
  });

  it('is covered: every capability is reachable by at least one tier', () => {
    const union = new Set<StaffCapability>(
      STAFF_TIERS.flatMap((tier) => [...STAFF_TIER_CAPABILITIES[tier]]),
    );

    expect([...union].sort()).toEqual([...STAFF_CAPABILITIES].sort());
  });
});
