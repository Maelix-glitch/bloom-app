import { describe, expect, it } from 'vitest';
import {
  unsafeSnowflake,
  type ChannelId,
  type RoleId,
  type UserId,
} from '@bloom/shared-types';
import {
  TEST_CHANNEL_IDS,
  TEST_ROLE_IDS,
  TEST_ROLE_POSITIONS,
  TEST_USER_IDS,
  testConfig,
  testSubject,
} from '@bloom/testing';
import type { AuthorizationContext, AuthorizationTarget } from './context.js';
import {
  allOf,
  allowAnyone,
  anyOf,
  checkTarget,
  requireAdministrator,
  requireBetaTester,
  requireBloomMember,
  requireChannel,
  requireConfiguredGuild,
  requireModerator,
  requirePermission,
  requireRole,
} from './policies.js';
import { DiscordPermission } from './discord-permissions.js';

function context(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    subject: testSubject(),
    channelId: TEST_CHANNEL_IDS.introductions,
    config: testConfig(),
    command: 'guardian test',
    ...overrides,
  };
}

function target(overrides: Partial<AuthorizationTarget> = {}): AuthorizationTarget {
  return {
    userId: TEST_USER_IDS.newcomer,
    roleIds: [TEST_ROLE_IDS.bloomMember],
    highestRolePosition: TEST_ROLE_POSITIONS.bloomMember,
    isGuildOwner: false,
    ...overrides,
  };
}

describe('requireConfiguredGuild', () => {
  it('accepts a subject in the configured guild', () => {
    expect(requireConfiguredGuild(context()).ok).toBe(true);
  });

  /*
   * A bot invited to a second server must do nothing there. Without this check,
   * every command would happily operate against role ids belonging to a
   * completely different guild.
   */
  it('refuses a subject from a different guild', () => {
    const elsewhere = testSubject();
    const result = requireConfiguredGuild(
      context({
        subject: { ...elsewhere, guildId: unsafeSnowflake('900000000000000999') },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('GUILD_MISMATCH');
  });
});

describe('requireRole', () => {
  it('accepts a member holding the role', () => {
    const result = requireRole('moderator')(
      context({ subject: testSubject({ roles: ['moderator'] }) }),
    );
    expect(result.ok).toBe(true);
  });

  it('refuses a member without it', () => {
    const result = requireRole('moderator')(
      context({ subject: testSubject({ roles: ['bloomMember'] }) }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNAUTHORIZED');
  });

  it('accepts when the member holds any one of several roles', () => {
    const result = requireRole(
      'founder',
      'administrator',
      'moderator',
    )(context({ subject: testSubject({ roles: ['administrator'] }) }));
    expect(result.ok).toBe(true);
  });

  /*
   * An unconfigured role is an operator problem, not a member problem. Telling
   * someone "you are not authorized" when the truth is "BLOOM_ROLE_MODERATOR_ID
   * was never set" sends them to the wrong person and hides a real bug.
   */
  it('reports a configuration error, not a denial, when the role is unset', () => {
    const config = testConfig({
      roles: { ...testConfig().roles, moderator: null },
    });

    const result = requireRole('moderator')(context({ config }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFIGURATION_ERROR');
  });

  it('lets the guild owner through regardless of roles', () => {
    const result = requireRole('founder')(
      context({ subject: testSubject({ roles: [], isGuildOwner: true }) }),
    );
    expect(result.ok).toBe(true);
  });
});

describe('requirePermission', () => {
  it('accepts a member with the permission', () => {
    const result = requirePermission('ModerateMembers')(
      context({
        subject: testSubject({ permissions: DiscordPermission.ModerateMembers }),
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('refuses a member without it', () => {
    const result = requirePermission('BanMembers')(
      context({
        subject: testSubject({ permissions: DiscordPermission.ModerateMembers }),
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INSUFFICIENT_PERMISSION');
  });

  it('treats Administrator as implying every permission, as Discord does', () => {
    const result = requirePermission('BanMembers')(
      context({ subject: testSubject({ permissions: DiscordPermission.Administrator }) }),
    );
    expect(result.ok).toBe(true);
  });
});

describe('role shorthands', () => {
  it('requireModerator accepts moderator, admin and founder', () => {
    for (const role of ['moderator', 'administrator', 'founder'] as const) {
      expect(
        requireModerator()(context({ subject: testSubject({ roles: [role] }) })).ok,
      ).toBe(true);
    }
  });

  /*
   * Beta Tester is explicitly not a staff role. The brief calls this out
   * because the name reads like elevated access, and a reasonable person could
   * wire it up that way by mistake.
   */
  it('requireModerator refuses a beta tester', () => {
    expect(
      requireModerator()(context({ subject: testSubject({ roles: ['betaTester'] }) })).ok,
    ).toBe(false);
  });

  it('requireAdministrator refuses a moderator', () => {
    expect(
      requireAdministrator()(context({ subject: testSubject({ roles: ['moderator'] }) }))
        .ok,
    ).toBe(false);
  });

  it('requireBetaTester refuses a plain member', () => {
    expect(
      requireBetaTester()(context({ subject: testSubject({ roles: ['bloomMember'] }) }))
        .ok,
    ).toBe(false);
  });

  /*
   * Early Bloom is an onboarding state, not a lesser membership tier — someone
   * still in it has not finished verifying, so member-only features stay shut.
   */
  it('requireBloomMember refuses someone still in Early Bloom', () => {
    expect(
      requireBloomMember()(context({ subject: testSubject({ roles: ['earlyBloom'] }) }))
        .ok,
    ).toBe(false);
  });
});

describe('requireChannel', () => {
  it('accepts the configured channel', () => {
    const result = requireChannel('betaTesting')(
      context({ channelId: TEST_CHANNEL_IDS.betaTesting }),
    );
    expect(result.ok).toBe(true);
  });

  it('refuses elsewhere', () => {
    const result = requireChannel('betaTesting')(
      context({ channelId: TEST_CHANNEL_IDS.introductions }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CHANNEL_RESTRICTED');
  });
});

describe('combinators', () => {
  it('allowAnyone always passes', () => {
    expect(allowAnyone(context()).ok).toBe(true);
  });

  it('allOf fails on the first failing policy', () => {
    const result = allOf(
      allowAnyone,
      requireRole('moderator'),
      requireRole('founder'),
    )(context({ subject: testSubject({ roles: [] }) }));

    expect(result.ok).toBe(false);
  });

  it('allOf passes when every policy passes', () => {
    const result = allOf(
      requireConfiguredGuild,
      requireRole('moderator'),
    )(context({ subject: testSubject({ roles: ['moderator'] }) }));

    expect(result.ok).toBe(true);
  });

  it('anyOf passes when one policy passes', () => {
    const result = anyOf(
      requireRole('founder'),
      requireRole('betaTester'),
    )(context({ subject: testSubject({ roles: ['betaTester'] }) }));

    expect(result.ok).toBe(true);
  });

  it('anyOf fails when none pass', () => {
    const result = anyOf(
      requireRole('founder'),
      requireRole('moderator'),
    )(context({ subject: testSubject({ roles: ['bloomMember'] }) }));

    expect(result.ok).toBe(false);
  });
});

describe('checkTarget', () => {
  const moderator = context({
    subject: testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] }),
  });

  it('permits a moderator actioning a plain member', () => {
    expect(checkTarget(moderator, target()).ok).toBe(true);
  });

  it('blocks self-action by default', () => {
    const result = checkTarget(moderator, target({ userId: TEST_USER_IDS.moderator }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SELF_ACTION_BLOCKED');
  });

  it('allows self-action when a command opts in', () => {
    const result = checkTarget(moderator, target({ userId: TEST_USER_IDS.moderator }), {
      allowSelf: true,
    });
    expect(result.ok).toBe(true);
  });

  it('never allows actioning the guild owner', () => {
    const result = checkTarget(moderator, target({ isGuildOwner: true }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TARGET_PROTECTED');
  });

  it('protects staff targets', () => {
    const result = checkTarget(
      moderator,
      target({
        userId: TEST_USER_IDS.administrator,
        roleIds: [TEST_ROLE_IDS.administrator],
        highestRolePosition: TEST_ROLE_POSITIONS.administrator,
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TARGET_PROTECTED');
  });

  /*
   * Peers are blocked, not just superiors. Two moderators at the same position
   * being able to time each other out is how a moderation dispute becomes a
   * moderation war, and Discord applies the same rule to humans.
   */
  it('blocks a target at the same position as the actor', () => {
    const result = checkTarget(
      moderator,
      target({
        userId: unsafeSnowflake<UserId>('900000000000001007'),
        roleIds: [unsafeSnowflake<RoleId>('900000000000029999')],
        highestRolePosition: TEST_ROLE_POSITIONS.moderator,
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TARGET_PROTECTED');
  });

  it('never leaks the target id into the member-facing message', () => {
    const result = checkTarget(moderator, target({ isGuildOwner: true }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.userMessage).not.toContain(TEST_USER_IDS.newcomer);
  });
});

describe('channel ids are compared as ids, never as names', () => {
  it('ignores a channel whose id is not configured', () => {
    const unknownChannel = unsafeSnowflake<ChannelId>('900000000000039999');
    const result = requireChannel('betaTesting')(context({ channelId: unknownChannel }));
    expect(result.ok).toBe(false);
  });
});
