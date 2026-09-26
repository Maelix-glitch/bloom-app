import { describe, expect, it } from 'vitest';
import {
  MODERATION_ACTIONS,
  unsafeSnowflake,
  type ModerationAction,
  type UserId,
} from '@bloom/shared-types';
import {
  TEST_ROLE_IDS,
  TEST_ROLE_POSITIONS,
  TEST_USER_IDS,
  testConfig,
  testSubject,
} from '@bloom/testing';
import { DiscordPermission } from './discord-permissions.js';
import type { AuthorizationTarget } from './context.js';
import type { BotRoleContext } from './role-hierarchy.js';
import {
  ACTION_PERMISSIONS,
  canViewCase,
  checkModerationTarget,
  DISCORD_ENFORCED_ACTIONS,
} from './moderation-target.js';

/**
 * Target protection.
 *
 * The ordering of these checks is part of the contract, not an implementation
 * detail: a moderator who is refused needs to be told the actual reason, and
 * "you cannot moderate someone above you" when the real answer is "that is an
 * administrator" sends them to argue with the wrong person.
 */

const config = testConfig();
const BOT_USER = TEST_USER_IDS.bot;

const ALL_PERMISSIONS = Object.values(DiscordPermission).reduce(
  (all, bit) => all | bit,
  0n,
);

function bot(overrides: Partial<BotRoleContext> = {}): BotRoleContext {
  return {
    highestRolePosition: TEST_ROLE_POSITIONS.bloomBot,
    highestRoleName: '◉ Bloom Bot',
    permissions: ALL_PERMISSIONS,
    ...overrides,
  };
}

function target(
  userId: UserId,
  options: {
    readonly roleIds?: readonly (typeof TEST_ROLE_IDS)[keyof typeof TEST_ROLE_IDS][];
    readonly position?: number;
    readonly isGuildOwner?: boolean;
  } = {},
): AuthorizationTarget {
  return {
    userId,
    roleIds: options.roleIds ?? [],
    highestRolePosition: options.position ?? TEST_ROLE_POSITIONS.bloomMember,
    isGuildOwner: options.isGuildOwner ?? false,
  };
}

function check(
  action: ModerationAction,
  overrides: Partial<Parameters<typeof checkModerationTarget>[0]> = {},
): ReturnType<typeof checkModerationTarget> {
  const victim = TEST_USER_IDS.member;
  return checkModerationTarget({
    action,
    actor: testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] }),
    target: target(victim),
    targetUserId: victim,
    bot: bot(),
    botUserId: BOT_USER,
    config,
    ...overrides,
  });
}

const errorCode = (result: ReturnType<typeof check>): string | null =>
  result.ok ? null : result.error.code;

describe('the ordinary case', () => {
  it('allows a moderator to action a plain member', () => {
    expect(check('kick').ok).toBe(true);
  });
});

describe('check ordering', () => {
  /**
   * An administrator is also above the moderator in role position, so both
   * rule 5 (staff) and rule 6 (position) match. Staff must win, because
   * "cannot moderate someone above you" reads as a hierarchy misconfiguration
   * and invites someone to go fix it by moving roles.
   */
  it('reports "staff" rather than "outranks you" for an administrator', () => {
    const admin = TEST_USER_IDS.administrator;
    const result = check('kick', {
      target: target(admin, {
        roleIds: [TEST_ROLE_IDS.administrator],
        position: TEST_ROLE_POSITIONS.administrator,
      }),
      targetUserId: admin,
    });

    expect(errorCode(result)).toBe('TARGET_PROTECTED');
    expect(result.ok ? '' : result.error.operatorHint).toContain('administrator');
  });

  /**
   * Self-action is checked first, before anything else can produce a more
   * confusing answer. A moderator who targets themselves should be told that,
   * not told they outrank themselves.
   */
  it('reports self-action before hierarchy', () => {
    const self = TEST_USER_IDS.moderator;
    const result = check('warn', {
      target: target(self, {
        roleIds: [TEST_ROLE_IDS.moderator],
        position: TEST_ROLE_POSITIONS.moderator,
      }),
      targetUserId: self,
    });

    expect(errorCode(result)).toBe('SELF_ACTION_BLOCKED');
  });

  it('refuses the bot as a target with its own explanation', () => {
    const result = check('kick', {
      target: target(BOT_USER, { position: TEST_ROLE_POSITIONS.bloomBot }),
      targetUserId: BOT_USER,
    });

    expect(errorCode(result)).toBe('TARGET_PROTECTED');
  });

  it('refuses the guild owner', () => {
    const owner = TEST_USER_IDS.founder;
    const result = check('kick', {
      target: target(owner, { isGuildOwner: true }),
      targetUserId: owner,
    });

    expect(errorCode(result)).toBe('TARGET_PROTECTED');
  });
});

describe('role position', () => {
  /**
   * Equal position is refused, not allowed. Discord's own rule is strictly
   * "above", and being one-off here would produce recorded actions that the
   * API then rejects.
   */
  it('refuses a target at exactly the actor’s level', () => {
    const peer = unsafeSnowflake<UserId>('900000000000001010');
    const result = check('timeout', {
      target: target(peer, { position: TEST_ROLE_POSITIONS.moderator }),
      targetUserId: peer,
    });

    expect(errorCode(result)).toBe('TARGET_PROTECTED');
  });

  /**
   * The guild owner outranks everyone regardless of role position. Not
   * reproducing this makes the tooling look broken to the one person who
   * cannot be locked out of it.
   */
  it('lets the guild owner act regardless of position', () => {
    const victim = unsafeSnowflake<UserId>('900000000000001011');
    const result = check('kick', {
      actor: testSubject({ userId: TEST_USER_IDS.founder, isGuildOwner: true }),
      target: target(victim, { position: TEST_ROLE_POSITIONS.betaTester }),
      targetUserId: victim,
    });

    expect(result.ok).toBe(true);
  });
});

describe('bot hierarchy', () => {
  /**
   * The distinction this file turns on: a warning is a row in our database, so
   * Guardian being below the target changes nothing about our ability to write
   * it. Requiring bot hierarchy for `warn` would mean we could not even record
   * a concern about someone we cannot action — which is exactly when recording
   * matters most.
   */
  it('does not require bot hierarchy for database-only actions', () => {
    const highUp = unsafeSnowflake<UserId>('900000000000001012');
    const above = target(highUp, { position: TEST_ROLE_POSITIONS.bloomBot + 5 });

    for (const action of ['warn', 'note', 'clear_warnings'] as const) {
      const result = check(action, {
        actor: testSubject({ userId: TEST_USER_IDS.founder, isGuildOwner: true }),
        target: above,
        targetUserId: highUp,
      });
      expect(errorCode(result)).toBeNull();
    }
  });

  it('requires bot hierarchy for every action Discord enforces', () => {
    const highUp = unsafeSnowflake<UserId>('900000000000001013');
    const above = target(highUp, { position: TEST_ROLE_POSITIONS.bloomBot + 5 });

    for (const action of DISCORD_ENFORCED_ACTIONS) {
      const result = check(action, {
        actor: testSubject({ userId: TEST_USER_IDS.founder, isGuildOwner: true }),
        target: above,
        targetUserId: highUp,
      });
      expect(errorCode(result)).toBe('ROLE_HIERARCHY_BLOCKED');
    }
  });

  /**
   * The operator hint is the whole value of catching this ourselves rather than
   * letting Discord 50013. It has to say where to go and what to do.
   */
  it('tells the admin how to fix a hierarchy block', () => {
    const highUp = unsafeSnowflake<UserId>('900000000000001014');
    const result = check('kick', {
      target: target(highUp, { position: TEST_ROLE_POSITIONS.bloomBot + 5 }),
      targetUserId: highUp,
      actor: testSubject({ userId: TEST_USER_IDS.founder, isGuildOwner: true }),
    });

    const hint = result.ok ? '' : result.error.operatorHint;
    expect(hint).toContain('Server Settings');
    expect(hint).toContain('◉ Bloom Bot');
  });

  it('never leaks the hint into the member-facing message', () => {
    const highUp = unsafeSnowflake<UserId>('900000000000001015');
    const result = check('kick', {
      target: target(highUp, { position: TEST_ROLE_POSITIONS.bloomBot + 5 }),
      targetUserId: highUp,
      actor: testSubject({ userId: TEST_USER_IDS.founder, isGuildOwner: true }),
    });

    const userMessage = result.ok ? '' : result.error.userMessage;
    expect(userMessage).not.toContain('Server Settings');
    expect(userMessage).not.toContain('position');
  });
});

describe('absent members', () => {
  /**
   * Pre-emptively banning a known raider before they join is a real workflow
   * and the one where speed matters most. Requiring a member snapshot would
   * break exactly that case.
   */
  it('allows ban and unban for someone not in the guild', () => {
    const stranger = unsafeSnowflake<UserId>('900000000000001016');
    for (const action of ['ban', 'unban'] as const) {
      expect(check(action, { target: null, targetUserId: stranger }).ok).toBe(true);
    }
  });

  it('refuses everything else for someone not in the guild', () => {
    const stranger = unsafeSnowflake<UserId>('900000000000001017');
    for (const action of ['warn', 'timeout', 'kick', 'note'] as const) {
      expect(errorCode(check(action, { target: null, targetUserId: stranger }))).toBe(
        'MEMBER_NOT_FOUND',
      );
    }
  });
});

describe('bot permissions', () => {
  it('names the missing permission instead of letting Discord 50013', () => {
    const result = check('kick', {
      bot: bot({ permissions: DiscordPermission.ViewChannel }),
    });

    expect(errorCode(result)).toBe('BOT_MISSING_PERMISSION');
    expect(result.ok ? '' : result.error.operatorHint).toContain('Kick Members');
  });

  /**
   * Purge needs Read Message History as well as Manage Messages — without it
   * the bulk delete silently finds nothing and reports "deleted 0", which looks
   * like the command not working rather than a missing permission.
   */
  it('requires both permissions for purge', () => {
    const result = check('purge', {
      bot: bot({ permissions: DiscordPermission.ManageMessages }),
    });

    expect(errorCode(result)).toBe('BOT_MISSING_PERMISSION');
    expect(result.ok ? '' : result.error.operatorHint).toContain('Read Message History');
  });

  /**
   * Checked against the canonical action list, not against the table's own
   * keys — the latter is tautological. A new action added to
   * `MODERATION_ACTIONS` without an entry here reads as `undefined` and throws
   * on `.filter`, turning the permission check into a crash at the moment
   * somebody uses the new command.
   */
  it('covers every action in MODERATION_ACTIONS', () => {
    for (const action of MODERATION_ACTIONS) {
      expect(
        ACTION_PERMISSIONS[action],
        `no permission entry for "${action}"`,
      ).toBeDefined();
    }
    expect(Object.keys(ACTION_PERMISSIONS).sort()).toEqual(
      [...MODERATION_ACTIONS].sort(),
    );
  });
});

describe('canViewCase', () => {
  const staff = testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] });
  const reporter = testSubject({ userId: TEST_USER_IDS.member });
  const stranger = testSubject({ userId: TEST_USER_IDS.newcomer });

  it('gives staff the whole case', () => {
    expect(
      canViewCase({ actor: staff, reporterId: reporter.userId, isStaff: true }),
    ).toBe('full');
  });

  /**
   * A report that vanishes into silence is why people stop reporting. The
   * reporter gets the status and nothing else — not the notes, not the other
   * party's account.
   */
  it('gives the reporter status only', () => {
    expect(
      canViewCase({ actor: reporter, reporterId: reporter.userId, isStaff: false }),
    ).toBe('status_only');
  });

  it('gives an uninvolved member nothing', () => {
    expect(
      canViewCase({ actor: stranger, reporterId: reporter.userId, isStaff: false }),
    ).toBe('none');
  });

  /**
   * A case with no reporter — one a moderator opened directly — must not become
   * readable by anyone who happens not to be staff.
   */
  it('gives nothing when the case has no reporter', () => {
    expect(canViewCase({ actor: stranger, reporterId: null, isStaff: false })).toBe(
      'none',
    );
  });
});
