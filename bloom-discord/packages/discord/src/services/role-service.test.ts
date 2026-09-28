import { DiscordAPIError } from 'discord.js';
import type { Client } from 'discord.js';
import { describe, expect, it } from 'vitest';
import {
  BloomError,
  unsafeSnowflake,
  type BotName,
  type GuildId,
  type RoleId,
  type UserId,
} from '@bloom/shared-types';
import { DiscordPermission } from '@bloom/permissions';
import {
  createTestLogger,
  FakeGuild,
  GUARDIAN_TEST_PERMISSIONS,
  testConfig,
  TEST_GUILD_ID,
  TEST_ROLE_IDS,
  TEST_ROLE_POSITIONS,
  TEST_USER_IDS,
  type MemoryLogSink,
} from '@bloom/testing';
import type { Logger } from '@bloom/logging';
import { DiscordRoleService } from './role-service.js';

/**
 * `DiscordRoleService` — the only code path in the platform that writes roles.
 *
 * Four gates stand between a caller and a role change (capability, allow-list,
 * hierarchy, idempotency). Each one is tested in both directions: that it
 * refuses what it should, and that it permits what it should. A gate only
 * tested in the failing direction can be broken by making it refuse
 * everything, and the suite would stay green.
 *
 * The recurring assertion is `writes` being empty. "It threw the right error"
 * is only half the guarantee — the half that matters for privilege escalation
 * is that Discord was never called at all.
 *
 * ## On the local Discord stub
 *
 * `@bloom/testing` supplies `FakeGuild` for the `GuildQueryService` port, and
 * that is reused here. It does not supply a discord.js `Client`, because no
 * other test needs one: every other consumer talks to the ports, and this
 * service is the adapter underneath them. The stub below is therefore new
 * rather than duplicated, and it is deliberately the smallest surface the
 * service actually touches — `guilds.cache.get`, `members.fetch`,
 * `roles.cache.has`, `roles.add`, `roles.remove`.
 *
 * Importing `@bloom/testing` from inside `@bloom/discord` is safe despite the
 * package depending on `@bloom/discord`: that dependency is `import type` only
 * (`packages/testing/src/fake-discord.ts:13`), so it erases at runtime, and
 * tests sit outside the project-reference graph because every package tsconfig
 * excludes `*.test.ts`.
 */

interface RecordedWrite {
  readonly action: 'add' | 'remove';
  readonly roleId: string;
  readonly reason: string | undefined;
}

interface StubRoleManager {
  readonly cache: { has(roleId: string): boolean };
  add(roleId: string, reason?: string): Promise<void>;
  remove(roleId: string, reason?: string): Promise<void>;
}

interface StubMember {
  readonly roles: StubRoleManager;
}

interface StubGuild {
  readonly members: { fetch(userId: string): Promise<StubMember> };
}

interface StubDiscordOptions {
  /** Roles the member already holds — drives the idempotency gate. */
  readonly heldRoleIds?: readonly RoleId[];
  /** `false` models the bot not being connected to the guild. */
  readonly guildPresent?: boolean;
  /** `false` models a member who left between trigger and write. */
  readonly memberPresent?: boolean;
  /** Thrown by `roles.add`/`roles.remove`, to exercise error translation. */
  readonly writeError?: Error;
}

interface StubDiscord {
  readonly client: Client;
  readonly writes: readonly RecordedWrite[];
}

function stubDiscord(options: StubDiscordOptions = {}): StubDiscord {
  const held = new Set<string>(options.heldRoleIds ?? []);
  const writes: RecordedWrite[] = [];

  const roles: StubRoleManager = {
    cache: { has: (roleId: string): boolean => held.has(roleId) },
    add: (roleId: string, reason?: string): Promise<void> => {
      if (options.writeError) return Promise.reject(options.writeError);
      held.add(roleId);
      writes.push({ action: 'add', roleId, reason });
      return Promise.resolve();
    },
    remove: (roleId: string, reason?: string): Promise<void> => {
      if (options.writeError) return Promise.reject(options.writeError);
      held.delete(roleId);
      writes.push({ action: 'remove', roleId, reason });
      return Promise.resolve();
    },
  };

  const member: StubMember = { roles };

  const guild: StubGuild = {
    members: {
      fetch: (): Promise<StubMember> =>
        options.memberPresent === false
          ? // discord.js rejects with DiscordAPIError 10007 in reality; the
            // service only cares that the fetch rejected, because it catches
            // everything and maps to MEMBER_NOT_FOUND.
            Promise.reject(
              new DiscordAPIError(
                { code: 10007, message: 'Unknown Member' },
                10007,
                404,
                'GET',
                '',
                {},
              ),
            )
          : Promise.resolve(member),
    },
  };

  const client = {
    guilds: {
      cache: {
        get: (id: string): StubGuild | undefined =>
          options.guildPresent === false || id !== TEST_GUILD_ID ? undefined : guild,
      },
    },
  };

  return { client: client as unknown as Client, writes };
}

interface Harness {
  readonly service: DiscordRoleService;
  readonly guild: FakeGuild;
  readonly writes: readonly RecordedWrite[];
  readonly sink: MemoryLogSink;
  readonly logger: Logger;
}

function harness(
  options: StubDiscordOptions & {
    readonly bot?: BotName;
    readonly guild?: FakeGuild;
  } = {},
): Harness {
  const guild = options.guild ?? new FakeGuild().withStandardRoles();
  const { client, writes } = stubDiscord(options);
  const { logger, sink } = createTestLogger();
  const service = new DiscordRoleService(
    client,
    guild,
    testConfig(),
    logger,
    options.bot ?? 'guardian',
  );
  return { service, guild, writes, sink, logger };
}

/** Await a rejection and assert it is a BloomError, without casting. */
async function expectBloomError(promise: Promise<unknown>): Promise<BloomError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof BloomError) return error;
    throw new Error(`expected a BloomError, received: ${String(error)}`, {
      cause: error,
    });
  }
  throw new Error('expected the call to reject, but it resolved');
}

/** Await a rejection of any kind, for the pass-through case. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to reject, but it resolved');
}

const MEMBER = TEST_USER_IDS.member;

function assign(
  service: DiscordRoleService,
  roleId: RoleId,
  reason = 'onboarding',
  userId: UserId = MEMBER,
): Promise<void> {
  return service.assignRole({ guildId: TEST_GUILD_ID, userId, roleId, reason });
}

function remove(
  service: DiscordRoleService,
  roleId: RoleId,
  reason = 'onboarding',
  userId: UserId = MEMBER,
): Promise<void> {
  return service.removeRole({ guildId: TEST_GUILD_ID, userId, roleId, reason });
}

describe('DiscordRoleService — gate 1: capability', () => {
  it('constructs for Guardian, which holds role:write', () => {
    expect(() => harness({ bot: 'guardian' })).not.toThrow();
  });

  it.each<BotName>(['companion', 'labs'])(
    'refuses to construct for %s, so a mis-wire fails at boot rather than at write time',
    (bot) => {
      let caught: unknown;
      try {
        harness({ bot });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(BloomError);
      expect(caught instanceof BloomError ? caught.code : null).toBe('CAPABILITY_DENIED');
    },
  );
});

describe('DiscordRoleService — gate 2: allow-list', () => {
  it.each<[string, keyof typeof TEST_ROLE_IDS]>([
    ['moderator', 'moderator'],
    ['administrator', 'administrator'],
    ['founder', 'founder'],
    ['bloomBot', 'bloomBot'],
    // Excluded on purpose: beta access is a Labs product decision, not a
    // side effect of onboarding. See GUARDIAN_MANAGED_ROLE_KEYS.
    ['betaTester', 'betaTester'],
  ])('refuses to assign the configured %s role', async (_label, key) => {
    const { service, writes } = harness();
    const error = await expectBloomError(assign(service, TEST_ROLE_IDS[key]));

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.details['role_key']).toBe(key);
    expect(writes).toHaveLength(0);
  });

  it('refuses an arbitrary role id that is not configured at all', async () => {
    const { service, writes } = harness();
    const rogue = unsafeSnowflake<RoleId>('900000000000009999');

    const error = await expectBloomError(assign(service, rogue));

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.details['requested_role']).toBe(rogue);
    expect(writes).toHaveLength(0);
  });

  it('applies the allow-list to removal as well as assignment', async () => {
    const { service, writes } = harness({ heldRoleIds: [TEST_ROLE_IDS.moderator] });

    const error = await expectBloomError(remove(service, TEST_ROLE_IDS.moderator));

    expect(error.code).toBe('UNAUTHORIZED');
    expect(writes).toHaveLength(0);
  });

  it('rejects before consulting the guild, so a bad role id cannot probe state', async () => {
    // No guild in the client cache at all. If the allow-list ran after the
    // guild lookup this would surface GUILD_MISMATCH instead.
    const { service } = harness({ guildPresent: false });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.moderator));

    expect(error.code).toBe('UNAUTHORIZED');
  });

  it.each<[string, keyof typeof TEST_ROLE_IDS]>([
    ['earlyBloom', 'earlyBloom'],
    ['bloomMember', 'bloomMember'],
  ])('permits the Guardian-managed %s role', async (_label, key) => {
    const { service, writes } = harness();

    await assign(service, TEST_ROLE_IDS[key]);

    expect(writes).toHaveLength(1);
    expect(writes[0]?.roleId).toBe(TEST_ROLE_IDS[key]);
  });
});

describe('DiscordRoleService — guild and role resolution', () => {
  it('reports GUILD_MISMATCH when the bot is not connected to the guild', async () => {
    const { service, writes } = harness({ guildPresent: false });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('GUILD_MISMATCH');
    expect(error.details['guild_id']).toBe(TEST_GUILD_ID);
    expect(writes).toHaveLength(0);
  });

  it('reports ROLE_NOT_FOUND when the configured role no longer exists', async () => {
    const guild = new FakeGuild().withStandardRoles();
    guild.roles.delete(TEST_ROLE_IDS.earlyBloom);
    const { service, writes } = harness({ guild });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('ROLE_NOT_FOUND');
    expect(error.details['role_id']).toBe(TEST_ROLE_IDS.earlyBloom);
    expect(writes).toHaveLength(0);
  });
});

describe('DiscordRoleService — gate 3: hierarchy and permissions', () => {
  it('reports BOT_MISSING_PERMISSION when the bot lacks Manage Roles', async () => {
    const guild = new FakeGuild()
      .withStandardRoles()
      .withBotPermissions(GUARDIAN_TEST_PERMISSIONS & ~DiscordPermission.ManageRoles);
    const { service, writes } = harness({ guild });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('BOT_MISSING_PERMISSION');
    expect(error.details['required_permission']).toBe('ManageRoles');
    expect(writes).toHaveLength(0);
  });

  it('refuses a managed integration role even when it is on the allow-list', async () => {
    const guild = new FakeGuild().withStandardRoles();
    const existing = guild.roles.get(TEST_ROLE_IDS.earlyBloom);
    expect(existing).toBeDefined();
    guild.roles.set(TEST_ROLE_IDS.earlyBloom, { ...existing!, managed: true });
    const { service, writes } = harness({ guild });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('ROLE_HIERARCHY_BLOCKED');
    expect(error.details['managed']).toBe(true);
    expect(writes).toHaveLength(0);
  });

  it('refuses when the bot sits exactly level with the target role', async () => {
    // Discord compares positions and refuses ties. This is the off-by-one the
    // implementation comments call out; `<=` rather than `<` is the fix.
    const guild = new FakeGuild()
      .withStandardRoles()
      .withBotAtPosition(TEST_ROLE_POSITIONS.earlyBloom);
    const { service, writes } = harness({ guild });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('ROLE_HIERARCHY_BLOCKED');
    expect(error.details['bot_position']).toBe(TEST_ROLE_POSITIONS.earlyBloom);
    expect(error.details['target_position']).toBe(TEST_ROLE_POSITIONS.earlyBloom);
    expect(writes).toHaveLength(0);
  });

  it('refuses when the bot sits below the target role', async () => {
    const guild = new FakeGuild()
      .withStandardRoles()
      .withBotAtPosition(TEST_ROLE_POSITIONS.bloomMember - 1);
    const { service, writes } = harness({ guild });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.bloomMember));

    expect(error.code).toBe('ROLE_HIERARCHY_BLOCKED');
    expect(writes).toHaveLength(0);
  });

  it('permits when the bot sits strictly above the target role', async () => {
    const guild = new FakeGuild()
      .withStandardRoles()
      .withBotAtPosition(TEST_ROLE_POSITIONS.earlyBloom + 1);
    const { service, writes } = harness({ guild });

    await assign(service, TEST_ROLE_IDS.earlyBloom);

    expect(writes).toHaveLength(1);
  });

  it('logs role.hierarchy_blocked at error severity with an actionable hint', async () => {
    const guild = new FakeGuild()
      .withStandardRoles()
      .withBotAtPosition(TEST_ROLE_POSITIONS.earlyBloom);
    const { service, sink } = harness({ guild });

    await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    const logged = sink.find('role.hierarchy_blocked');
    expect(logged).toBeDefined();
    expect(logged?.severity).toBe('error');
    expect(logged?.error_code).toBe('ROLE_HIERARCHY_BLOCKED');
    // The hint names the fix, not just the failure.
    expect(logged?.message).toMatch(/Server Settings|above|drag|position/i);
  });

  it('checks hierarchy before fetching the member', async () => {
    // Both would fail. Hierarchy must win, because it is the cheaper check and
    // the one whose message an admin can act on.
    const guild = new FakeGuild()
      .withStandardRoles()
      .withBotAtPosition(TEST_ROLE_POSITIONS.earlyBloom);
    const { service } = harness({ guild, memberPresent: false });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('ROLE_HIERARCHY_BLOCKED');
  });
});

describe('DiscordRoleService — member resolution', () => {
  it('reports MEMBER_NOT_FOUND when the member cannot be fetched', async () => {
    const { service, writes } = harness({ memberPresent: false });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('MEMBER_NOT_FOUND');
    expect(error.details['user_id']).toBe(MEMBER);
    expect(writes).toHaveLength(0);
  });

  it('reports MEMBER_NOT_FOUND on the removal path too', async () => {
    const { service, writes } = harness({ memberPresent: false });

    const error = await expectBloomError(remove(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('MEMBER_NOT_FOUND');
    expect(writes).toHaveLength(0);
  });
});

describe('DiscordRoleService — gate 4: idempotency', () => {
  it('treats assigning a role the member already holds as a no-op success', async () => {
    const { service, writes, sink } = harness({
      heldRoleIds: [TEST_ROLE_IDS.earlyBloom],
    });

    await expect(assign(service, TEST_ROLE_IDS.earlyBloom)).resolves.toBeUndefined();

    expect(writes).toHaveLength(0);
    expect(sink.has('role.noop')).toBe(true);
    // A no-op must not look like a change in the logs.
    expect(sink.has('role.add')).toBe(false);
  });

  it('treats removing a role the member does not hold as a no-op success', async () => {
    const { service, writes, sink } = harness({ heldRoleIds: [] });

    await expect(remove(service, TEST_ROLE_IDS.earlyBloom)).resolves.toBeUndefined();

    expect(writes).toHaveLength(0);
    expect(sink.has('role.noop')).toBe(true);
    expect(sink.has('role.remove')).toBe(false);
  });

  it('still writes when adding a role the member does not hold', async () => {
    const { service, writes, sink } = harness({ heldRoleIds: [] });

    await assign(service, TEST_ROLE_IDS.earlyBloom);

    expect(writes).toHaveLength(1);
    expect(sink.has('role.noop')).toBe(false);
  });

  it('still writes when removing a role the member holds', async () => {
    const { service, writes, sink } = harness({
      heldRoleIds: [TEST_ROLE_IDS.earlyBloom],
    });

    await remove(service, TEST_ROLE_IDS.earlyBloom);

    expect(writes).toHaveLength(1);
    expect(sink.has('role.noop')).toBe(false);
  });

  it('is idempotent across repeated assignment', async () => {
    const { service, writes } = harness({ heldRoleIds: [] });

    await assign(service, TEST_ROLE_IDS.earlyBloom);
    await assign(service, TEST_ROLE_IDS.earlyBloom);
    await assign(service, TEST_ROLE_IDS.earlyBloom);

    expect(writes).toHaveLength(1);
  });
});

describe('DiscordRoleService — successful writes', () => {
  it('assigns the role and records the action', async () => {
    const { service, writes } = harness();

    await assign(service, TEST_ROLE_IDS.earlyBloom, 'verified');

    expect(writes).toEqual([
      { action: 'add', roleId: TEST_ROLE_IDS.earlyBloom, reason: 'verified' },
    ]);
  });

  it('removes the role and records the action', async () => {
    const { service, writes } = harness({ heldRoleIds: [TEST_ROLE_IDS.earlyBloom] });

    await remove(service, TEST_ROLE_IDS.earlyBloom, 'promoted');

    expect(writes).toEqual([
      { action: 'remove', roleId: TEST_ROLE_IDS.earlyBloom, reason: 'promoted' },
    ]);
  });

  it('logs role.add at info with the role name and reason', async () => {
    const { service, sink } = harness();

    await assign(service, TEST_ROLE_IDS.earlyBloom, 'verified');

    const logged = sink.find('role.add');
    expect(logged).toBeDefined();
    expect(logged?.severity).toBe('info');
    expect(logged?.context?.['role_id']).toBe(TEST_ROLE_IDS.earlyBloom);
    expect(logged?.context?.['reason']).toBe('verified');
  });

  it('logs role.remove at info', async () => {
    const { service, sink } = harness({ heldRoleIds: [TEST_ROLE_IDS.earlyBloom] });

    await remove(service, TEST_ROLE_IDS.earlyBloom);

    const logged = sink.find('role.remove');
    expect(logged).toBeDefined();
    expect(logged?.severity).toBe('info');
  });

  it('sanitises the audit-log reason before handing it to Discord', async () => {
    const { service, writes } = harness();

    await assign(service, TEST_ROLE_IDS.earlyBloom, '  verified\u0000by\u001fstaff  ');

    expect(writes[0]?.reason).toBe('verifiedbystaff');
  });

  it("truncates an over-long reason to Discord's 512-character audit limit", async () => {
    const { service, writes } = harness();

    await assign(service, TEST_ROLE_IDS.earlyBloom, 'x'.repeat(600));

    expect(writes[0]?.reason).toHaveLength(512);
  });
});

describe('DiscordRoleService — Discord API error translation', () => {
  function apiError(code: number, message = 'failed'): DiscordAPIError {
    return new DiscordAPIError({ code, message }, code, 403, 'PATCH', '', {});
  }

  it('maps 50013 Missing Permissions to ROLE_HIERARCHY_BLOCKED', async () => {
    const thrown = apiError(50013, 'Missing Permissions');
    const { service } = harness({ writeError: thrown });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('ROLE_HIERARCHY_BLOCKED');
    expect(error.details['discord_code']).toBe(50013);
    // The cause is preserved so the original is still in the log chain.
    expect(error.cause).toBe(thrown);
    // Discord cannot distinguish "below the role" from "no Manage Roles", so
    // the hint has to name both rather than guess.
    expect(error.operatorHint).toMatch(/Manage Roles/);
    expect(error.operatorHint).toMatch(/Server Settings/);
  });

  it('maps 10011 Unknown Role to ROLE_NOT_FOUND', async () => {
    const { service } = harness({ writeError: apiError(10011, 'Unknown Role') });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('ROLE_NOT_FOUND');
    expect(error.details['role_id']).toBe(TEST_ROLE_IDS.earlyBloom);
  });

  it('maps 10007 Unknown Member to MEMBER_NOT_FOUND', async () => {
    const { service } = harness({ writeError: apiError(10007, 'Unknown Member') });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('MEMBER_NOT_FOUND');
  });

  it('maps any other Discord code to DISCORD_API_ERROR', async () => {
    const { service } = harness({ writeError: apiError(50001, 'Missing Access') });

    const error = await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('DISCORD_API_ERROR');
    expect(error.details['discord_code']).toBe(50001);
  });

  it('translates errors on the removal path too', async () => {
    const { service } = harness({
      heldRoleIds: [TEST_ROLE_IDS.earlyBloom],
      writeError: apiError(50013, 'Missing Permissions'),
    });

    const error = await expectBloomError(remove(service, TEST_ROLE_IDS.earlyBloom));

    expect(error.code).toBe('ROLE_HIERARCHY_BLOCKED');
  });

  it('rethrows a non-Discord error unchanged rather than mislabelling it', async () => {
    // A bug in our own code, or a network failure, must not be dressed up as a
    // Discord API error — that would send an admin looking in the wrong place.
    const thrown = new Error('socket hang up');
    const { service } = harness({ writeError: thrown });

    const error = await rejection(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(error).toBe(thrown);
    expect(error).not.toBeInstanceOf(BloomError);
  });

  it('does not log a success event when the write fails', async () => {
    const { service, sink } = harness({ writeError: apiError(50013) });

    await expectBloomError(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(sink.has('role.add')).toBe(false);
  });
});

describe('DiscordRoleService — safety invariants', () => {
  it.each<[string, StubDiscordOptions & { readonly roleId?: RoleId }]>([
    ['guild missing', { guildPresent: false }],
    ['member missing', { memberPresent: false }],
    [
      'write rejected',
      {
        writeError: new DiscordAPIError(
          { code: 50013, message: 'x' },
          50013,
          403,
          'PATCH',
          '',
          {},
        ),
      },
    ],
  ])('performs no role write when %s', async (_label, options) => {
    const { service, writes } = harness(options);

    await rejection(assign(service, TEST_ROLE_IDS.earlyBloom));

    expect(writes).toHaveLength(0);
  });

  it('never writes a role that is not on the allow-list, whatever the caller passes', async () => {
    const { service, writes } = harness();

    for (const key of [
      'founder',
      'administrator',
      'moderator',
      'betaTester',
      'bloomBot',
    ] as const) {
      await rejection(assign(service, TEST_ROLE_IDS[key]));
    }

    expect(writes).toHaveLength(0);
  });

  it('reads the role position live on every call rather than caching it', async () => {
    // Positions change without notice when staff reorder roles. A service that
    // cached the first answer would keep writing after it lost the hierarchy.
    const guild = new FakeGuild().withStandardRoles();
    const { service, writes } = harness({ guild });

    await assign(service, TEST_ROLE_IDS.earlyBloom);
    expect(writes).toHaveLength(1);

    // Someone drags Early Bloom above the bot.
    const existing = guild.roles.get(TEST_ROLE_IDS.earlyBloom);
    guild.roles.set(TEST_ROLE_IDS.earlyBloom, {
      ...existing!,
      position: TEST_ROLE_POSITIONS.bloomBot + 5,
    });

    const error = await expectBloomError(remove(service, TEST_ROLE_IDS.earlyBloom));
    expect(error.code).toBe('ROLE_HIERARCHY_BLOCKED');
    expect(writes).toHaveLength(1);
  });

  it('keeps the guild id it was given rather than trusting a different one', async () => {
    const { service, writes } = harness();
    const otherGuild = unsafeSnowflake<GuildId>('900000000000000099');

    const error = await expectBloomError(
      service.assignRole({
        guildId: otherGuild,
        userId: MEMBER,
        roleId: TEST_ROLE_IDS.earlyBloom,
        reason: 'test',
      }),
    );

    expect(error.code).toBe('GUILD_MISMATCH');
    expect(writes).toHaveLength(0);
  });
});
