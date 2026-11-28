import { describe, expect, it } from 'vitest';
import { unsafeSnowflake, type GuildId } from '@bloom/shared-types';
import { TEST_CHANNEL_IDS, testConfig, testSubject } from '@bloom/testing';
import type { AuthorizationContext } from './context.js';
import { allOf, requireConfiguredGuild, requireModerator } from './policies.js';
import { DiscordPermission } from './discord-permissions.js';
import {
  MODERATOR_STAFF_CAPABILITIES,
  STAFF_CAPABILITIES,
  type StaffCapability,
} from './staff-capabilities.js';
import {
  hasStaffCapability,
  requireAllStaffCapabilities,
  requireAnyStaffCapability,
  requireStaffCapability,
  resolveStaffCapabilities,
} from './staff-policies.js';

type SubjectOptions = Parameters<typeof testSubject>[0];

function context(
  subject: SubjectOptions = {},
  overrides: Partial<AuthorizationContext> = {},
): AuthorizationContext {
  return {
    subject: testSubject(subject),
    channelId: TEST_CHANNEL_IDS.introductions,
    config: testConfig(),
    command: 'guardian staff test',
    ...overrides,
  };
}

function sorted(capabilities: ReadonlySet<StaffCapability>): StaffCapability[] {
  return [...capabilities].sort();
}

const ALL = [...STAFF_CAPABILITIES].sort();

describe('resolveStaffCapabilities', () => {
  it('gives the guild owner every capability', () => {
    expect(sorted(resolveStaffCapabilities(context({ isGuildOwner: true })))).toEqual(
      ALL,
    );
  });

  it('gives ✦ Founder every capability', () => {
    expect(sorted(resolveStaffCapabilities(context({ roles: ['founder'] })))).toEqual(
      ALL,
    );
  });

  it('gives ◈ Administrator every capability', () => {
    expect(
      sorted(resolveStaffCapabilities(context({ roles: ['administrator'] }))),
    ).toEqual(ALL);
  });

  it('gives ⟡ Moderator exactly the moderator set', () => {
    const held = resolveStaffCapabilities(context({ roles: ['moderator'] }));

    expect(sorted(held)).toEqual([...MODERATOR_STAFF_CAPABILITIES].sort());
    expect(held.size).toBe(8);
  });

  it('denies a moderator the reward levers', () => {
    const moderator = context({ roles: ['moderator'] });

    expect(hasStaffCapability(moderator, 'staff.rewards.award')).toBe(false);
    expect(hasStaffCapability(moderator, 'staff.rewards.revoke')).toBe(false);
    // Even read access to the economy is Administrator-and-above for now.
    expect(hasStaffCapability(moderator, 'staff.rewards.read')).toBe(false);
  });

  it('denies a moderator staff management', () => {
    expect(
      hasStaffCapability(context({ roles: ['moderator'] }), 'staff.staff.manage'),
    ).toBe(false);
  });

  it('denies a moderator community management', () => {
    expect(
      hasStaffCapability(context({ roles: ['moderator'] }), 'staff.community.manage'),
    ).toBe(false);
  });

  it('gives a member with no staff role nothing at all', () => {
    expect(resolveStaffCapabilities(context({ roles: ['bloomMember'] })).size).toBe(0);
    expect(resolveStaffCapabilities(context({ roles: ['betaTester'] })).size).toBe(0);
    expect(resolveStaffCapabilities(context({ roles: ['earlyBloom'] })).size).toBe(0);
    expect(resolveStaffCapabilities(context()).size).toBe(0);
  });

  /*
   * The deny-by-default rule that is easiest to get wrong. Discord permission
   * bits are a server-configuration accident as often as they are an intent:
   * plenty of guilds hand Manage Messages to a helper role. If those bits fed
   * the staff kernel, that helper could award points.
   */
  it('does not convert Discord permissions into staff capabilities', () => {
    const permissive = context({
      permissions:
        DiscordPermission.Administrator |
        DiscordPermission.ModerateMembers |
        DiscordPermission.ManageGuild |
        DiscordPermission.BanMembers,
    });

    expect(resolveStaffCapabilities(permissive).size).toBe(0);
  });

  it('unions the grants of a member holding several tiers', () => {
    const both = resolveStaffCapabilities(
      context({ roles: ['moderator', 'administrator'] }),
    );

    expect(sorted(both)).toEqual(ALL);
  });

  /*
   * `isGuildOwner` describes standing in whatever guild the interaction came
   * from. Honouring it without checking the guild would let the owner of any
   * server the bot is in resolve as full Bloom staff.
   */
  it('grants nothing when the subject is from another guild, even the owner', () => {
    const elsewhere: GuildId = unsafeSnowflake<GuildId>('900000000000000999');

    const foreignOwner = context(
      {},
      { subject: { ...testSubject({ isGuildOwner: true }), guildId: elsewhere } },
    );
    const foreignFounder = context(
      {},
      { subject: { ...testSubject({ roles: ['founder'] }), guildId: elsewhere } },
    );

    expect(resolveStaffCapabilities(foreignOwner).size).toBe(0);
    expect(resolveStaffCapabilities(foreignFounder).size).toBe(0);
  });

  it('returns a fresh set each call, so a caller cannot poison the next answer', () => {
    const first = resolveStaffCapabilities(context({ roles: ['moderator'] }));
    (first as Set<StaffCapability>).add('staff.staff.manage');

    const second = resolveStaffCapabilities(context({ roles: ['moderator'] }));

    expect(second.has('staff.staff.manage')).toBe(false);
    expect(second.size).toBe(8);
  });
});

describe('requireStaffCapability', () => {
  it('allows a subject who holds the capability', () => {
    const policy = requireStaffCapability('staff.cases.manage');

    expect(policy(context({ roles: ['moderator'] })).ok).toBe(true);
    expect(policy(context({ roles: ['administrator'] })).ok).toBe(true);
    expect(policy(context({ isGuildOwner: true })).ok).toBe(true);
  });

  it('denies a subject who does not, with UNAUTHORIZED and actionable details', () => {
    const result = requireStaffCapability('staff.rewards.award')(
      context({ roles: ['moderator'] }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(result.error.details['required_staff_capabilities']).toEqual([
      'staff.rewards.award',
    ]);
    expect(result.error.details['missing_staff_capabilities']).toEqual([
      'staff.rewards.award',
    ]);
    expect(result.error.details['command']).toBe('guardian staff test');
  });

  it('denies a non-staff member', () => {
    expect(
      requireStaffCapability('staff.members.read')(context({ roles: ['bloomMember'] }))
        .ok,
    ).toBe(false);
  });

  /*
   * The user-facing string must not name the capability. Someone probing a
   * command should learn that it is staff-only and nothing more; the lever
   * name belongs in the operator log.
   */
  it('does not leak the capability name to the member', () => {
    const result = requireStaffCapability('staff.staff.manage')(context());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.userMessage).toBe(
      'This command is available to the Bloom staff team.',
    );
    expect(result.error.userMessage).not.toContain('staff.staff.manage');
  });
});

describe('requireAnyStaffCapability', () => {
  const policy = requireAnyStaffCapability('staff.rewards.award', 'staff.cases.manage');

  it('allows a subject holding any one of them', () => {
    // Moderator holds cases.manage but not rewards.award.
    expect(policy(context({ roles: ['moderator'] })).ok).toBe(true);
    expect(policy(context({ roles: ['founder'] })).ok).toBe(true);
  });

  it('denies a subject holding none, reporting all of them as missing', () => {
    const result = policy(context({ roles: ['bloomMember'] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(result.error.details['missing_staff_capabilities']).toEqual([
      'staff.rewards.award',
      'staff.cases.manage',
    ]);
  });

  it('denies, as a configuration error, when called with no capabilities', () => {
    const result = requireAnyStaffCapability()(context({ isGuildOwner: true }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFIGURATION_ERROR');
  });
});

describe('requireAllStaffCapabilities', () => {
  const policy = requireAllStaffCapabilities(
    'staff.cases.manage',
    'staff.rewards.revoke',
  );

  it('allows a subject holding every one of them', () => {
    expect(policy(context({ roles: ['administrator'] })).ok).toBe(true);
    expect(policy(context({ isGuildOwner: true })).ok).toBe(true);
  });

  it('denies a partial holder, reporting only what is missing', () => {
    const result = policy(context({ roles: ['moderator'] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(result.error.details['required_staff_capabilities']).toEqual([
      'staff.cases.manage',
      'staff.rewards.revoke',
    ]);
    expect(result.error.details['missing_staff_capabilities']).toEqual([
      'staff.rewards.revoke',
    ]);
  });

  it('denies, as a configuration error, when called with no capabilities', () => {
    const result = requireAllStaffCapabilities()(context({ isGuildOwner: true }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFIGURATION_ERROR');
  });
});

describe('composition with the existing policy set', () => {
  it('still denies a guild mismatch when combined with a staff policy', () => {
    const elsewhere: GuildId = unsafeSnowflake<GuildId>('900000000000000999');
    const policy = allOf(
      requireConfiguredGuild,
      requireStaffCapability('staff.moderation.execute'),
    );

    const result = policy(
      context(
        {},
        { subject: { ...testSubject({ roles: ['founder'] }), guildId: elsewhere } },
      ),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // requireConfiguredGuild runs first and owns the message.
    expect(result.error.code).toBe('GUILD_MISMATCH');
  });

  it('denies on the staff policy even if the guild check is omitted', () => {
    const elsewhere: GuildId = unsafeSnowflake<GuildId>('900000000000000999');

    const result = requireStaffCapability('staff.moderation.execute')(
      context(
        {},
        { subject: { ...testSubject({ roles: ['founder'] }), guildId: elsewhere } },
      ),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNAUTHORIZED');
  });

  /*
   * Requirement 14. `requireModerator` deliberately accepts Timeout Members as
   * a fallback so a privileged member is not locked out by a missing role
   * assignment. That behaviour must survive this change, and must not bleed
   * into the staff kernel. Both halves are asserted on one subject.
   */
  it('leaves the existing permission fallback intact without widening the staff kernel', () => {
    const permissionOnly = context({ permissions: DiscordPermission.ModerateMembers });

    expect(requireModerator()(permissionOnly).ok).toBe(true);
    expect(requireStaffCapability('staff.moderation.execute')(permissionOnly).ok).toBe(
      false,
    );
    expect(resolveStaffCapabilities(permissionOnly).size).toBe(0);
  });

  it('leaves requireModerator role behaviour unchanged', () => {
    expect(requireModerator()(context({ roles: ['moderator'] })).ok).toBe(true);
    expect(requireModerator()(context({ roles: ['bloomMember'] })).ok).toBe(false);
    expect(requireModerator()(context({ isGuildOwner: true })).ok).toBe(true);
  });
});
