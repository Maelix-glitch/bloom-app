import { describe, expect, it } from 'vitest';
import { unsafeSnowflake, type RoleId } from '@bloom/shared-types';
import { TEST_ROLE_IDS, TEST_ROLE_POSITIONS, testConfig } from '@bloom/testing';
import {
  auditGuardianRolePlacement,
  checkRoleManageable,
  describeHierarchyFix,
  isRoleWritePermitted,
  type BotRoleContext,
  type RoleSnapshot,
} from './role-hierarchy.js';

const MANAGE_ROLES = 1n << 28n;
const ADMINISTRATOR = 1n << 3n;

function bot(overrides: Partial<BotRoleContext> = {}): BotRoleContext {
  return {
    highestRolePosition: TEST_ROLE_POSITIONS.bloomBot,
    highestRoleName: '◉ Bloom Bot',
    permissions: MANAGE_ROLES,
    ...overrides,
  };
}

function role(overrides: Partial<RoleSnapshot> = {}): RoleSnapshot {
  return {
    id: TEST_ROLE_IDS.earlyBloom,
    name: '✧ Early Bloom',
    position: TEST_ROLE_POSITIONS.earlyBloom,
    managed: false,
    ...overrides,
  };
}

describe('checkRoleManageable', () => {
  it('permits a role strictly below the bot', () => {
    expect(checkRoleManageable(bot(), role()).ok).toBe(true);
  });

  /*
   * The boundary case, and the one that actually bites in production. Discord
   * requires the acting role to be *strictly* above the target; equal positions
   * are refused by the API. Getting this wrong means the bot looks correctly
   * configured and fails on every single role change.
   */
  it('refuses a role at the same position as the bot', () => {
    const result = checkRoleManageable(
      bot({ highestRolePosition: 20 }),
      role({ position: 20 }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('ROLE_HIERARCHY_BLOCKED');
  });

  it('refuses a role above the bot', () => {
    const result = checkRoleManageable(
      bot({ highestRolePosition: 10 }),
      role({ position: 50, name: '⟡ Moderator' }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('ROLE_HIERARCHY_BLOCKED');
  });

  it('refuses when the bot lacks Manage Roles', () => {
    const result = checkRoleManageable(bot({ permissions: 0n }), role());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('BOT_MISSING_PERMISSION');
  });

  it('accepts Administrator as implying Manage Roles', () => {
    expect(checkRoleManageable(bot({ permissions: ADMINISTRATOR }), role()).ok).toBe(
      true,
    );
  });

  /*
   * Integration-managed roles (a bot's own role, a Nitro booster role) cannot be
   * assigned by anyone, including administrators. Discord returns a generic
   * "Missing Permissions" for this, so catching it up front produces a far
   * better message than the API does.
   */
  it('refuses a managed role regardless of position', () => {
    const result = checkRoleManageable(
      bot({ highestRolePosition: 90 }),
      role({ managed: true, position: 5, name: 'Some Integration' }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('ROLE_HIERARCHY_BLOCKED');
    // The code is shared with the position failure, so the operator hint has to
    // carry the distinction — otherwise an admin reorders roles forever trying
    // to fix something reordering cannot fix.
    expect(result.error.operatorHint).toMatch(/managed integration role/i);
    expect(result.error.details).toMatchObject({ managed: true });
  });

  it('never marks a hierarchy failure retryable', () => {
    const result = checkRoleManageable(
      bot({ highestRolePosition: 1 }),
      role({ position: 50 }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.retryable).toBe(false);
  });
});

describe('describeHierarchyFix', () => {
  it('names both roles, both positions and where to go', () => {
    const message = describeHierarchyFix(
      bot({ highestRolePosition: 5, highestRoleName: '◉ Bloom Bot' }),
      role({ name: '✧ Early Bloom', position: 20 }),
    );

    expect(message).toContain('◉ Bloom Bot');
    expect(message).toContain('✧ Early Bloom');
    expect(message).toContain('5');
    expect(message).toContain('20');
    expect(message).toMatch(/Server Settings/i);
  });
});

describe('auditGuardianRolePlacement', () => {
  const config = testConfig();

  function standardRoles(
    botPosition = TEST_ROLE_POSITIONS.bloomBot,
  ): Map<RoleId, RoleSnapshot> {
    const roles = new Map<RoleId, RoleSnapshot>();
    for (const [key, id] of Object.entries(TEST_ROLE_IDS)) {
      roles.set(id, {
        id,
        name: key,
        position:
          key === 'bloomBot'
            ? botPosition
            : TEST_ROLE_POSITIONS[key as keyof typeof TEST_ROLE_POSITIONS],
        managed: key === 'bloomBot',
      });
    }
    return roles;
  }

  it('reports nothing when the hierarchy is correct', () => {
    const advisories = auditGuardianRolePlacement(config, bot(), standardRoles());
    expect(advisories.filter((entry) => entry.severity === 'error')).toEqual([]);
  });

  it('errors when the bot sits below a role it must manage', () => {
    const advisories = auditGuardianRolePlacement(
      config,
      bot({ highestRolePosition: 5 }),
      standardRoles(5),
    );

    const blocked = advisories.filter((entry) => entry.code === 'BOT_ROLE_TOO_LOW');
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked.every((entry) => entry.severity === 'error')).toBe(true);
  });

  /*
   * Above staff is not an outage, but it is over-privilege: the bot could
   * modify moderator roles if a bug ever asked it to. A warning, because the
   * server still works and refusing to start would be worse.
   */
  it('warns when the bot sits above staff roles', () => {
    const advisories = auditGuardianRolePlacement(
      config,
      bot({ highestRolePosition: 99 }),
      standardRoles(99),
    );

    expect(advisories.some((entry) => entry.code === 'BOT_ROLE_TOO_HIGH')).toBe(true);
    expect(
      advisories
        .filter((entry) => entry.code === 'BOT_ROLE_TOO_HIGH')
        .every((entry) => entry.severity === 'warn'),
    ).toBe(true);
  });

  it('warns when the bot has been granted Administrator', () => {
    const advisories = auditGuardianRolePlacement(
      config,
      bot({ permissions: ADMINISTRATOR }),
      standardRoles(),
    );

    expect(advisories.some((entry) => /administrator/i.test(entry.message))).toBe(true);
  });

  it('reports a configured role that no longer exists', () => {
    const roles = standardRoles();
    roles.delete(TEST_ROLE_IDS.earlyBloom);

    const advisories = auditGuardianRolePlacement(config, bot(), roles);
    expect(advisories.some((entry) => entry.code === 'ROLE_NOT_FOUND')).toBe(true);
  });
});

describe('isRoleWritePermitted', () => {
  const config = testConfig();

  it('permits the two roles Guardian owns', () => {
    expect(isRoleWritePermitted(config, TEST_ROLE_IDS.earlyBloom).ok).toBe(true);
    expect(isRoleWritePermitted(config, TEST_ROLE_IDS.bloomMember).ok).toBe(true);
  });

  /*
   * The allow-list is the last line of defence against a bug that passes the
   * wrong role id. Beta Tester is the interesting case: it is not a staff role,
   * so it might look assignable, but the brief keeps it a manual grant.
   */
  it.each([
    ['founder', TEST_ROLE_IDS.founder],
    ['administrator', TEST_ROLE_IDS.administrator],
    ['moderator', TEST_ROLE_IDS.moderator],
    ['betaTester', TEST_ROLE_IDS.betaTester],
    ['bloomBot', TEST_ROLE_IDS.bloomBot],
  ])('refuses %s', (_name, roleId) => {
    const result = isRoleWritePermitted(config, roleId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNAUTHORIZED');
  });

  it('refuses an unknown role id', () => {
    const unknown = unsafeSnowflake<RoleId>('900000000000099999');
    expect(isRoleWritePermitted(config, unknown).ok).toBe(false);
  });
});
