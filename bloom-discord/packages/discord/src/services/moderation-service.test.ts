import { DiscordAPIError, PermissionFlagsBits } from 'discord.js';
import type { Client } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BloomError,
  unsafeSnowflake,
  type BotName,
  type GuildId,
} from '@bloom/shared-types';
import { MAX_TIMEOUT_MS } from '@bloom/utils';
import {
  createTestLogger,
  TEST_GUILD_ID,
  TEST_USER_IDS,
  type MemoryLogSink,
} from '@bloom/testing';
import {
  DiscordModerationService,
  MODERATION_PERMISSION_BITS,
} from './moderation-service.js';

/**
 * `DiscordModerationService` — the adapter that performs member moderation.
 *
 * Scope matters here, so it is worth stating what this class is *not*. It does
 * not decide whether an action is allowed: self-action, staff targets, the
 * guild owner, role position and bot hierarchy are all settled in
 * `@bloom/permissions` before a call arrives, and they are covered by
 * `packages/permissions/src/moderation-target.test.ts`. This class performs an
 * already-authorised action and translates Discord's failures. These tests
 * therefore cover execution, argument marshalling, error translation and
 * logging — not authorization, which lives a layer up.
 *
 * Two behaviours are easy to regress and are asserted hard:
 *
 *   - **Ban does not fetch the member.** Banning a user id that never joined is
 *     how a known raider is kept out ahead of time. A "helpful" member lookup
 *     added to `banMember` would silently break that workflow.
 *   - **Unban returns `false` rather than throwing on Discord 10026.** The
 *     desired end state is already true, so it is a no-op, not a failure.
 *
 * ## On the stub
 *
 * `@bloom/testing` provides `FakeModerationService`, but that is a fake of the
 * *port* — it is what feature tests use instead of this class. Testing the
 * adapter itself needs a discord.js `Client`, which no shared fake supplies.
 * The stub below is therefore new rather than duplicated, and models only the
 * surface this service touches. It mirrors the approach already taken in
 * `role-service.test.ts`; the two stubs differ because the services use
 * different client APIs (`guilds.fetch` here, `guilds.cache.get` there).
 *
 * Importing `@bloom/testing` from inside `@bloom/discord` is safe: the
 * testing package's dependency on `@bloom/discord` is `import type` only, so
 * it erases at runtime, and tests sit outside the project-reference graph.
 */

interface RecordedCall {
  readonly action: 'timeout' | 'kick' | 'ban' | 'unban';
  readonly userId: string;
  readonly reason: string | undefined;
  /** Milliseconds for a timeout, `null` when a timeout is being lifted. */
  readonly durationMs?: number | null;
  readonly deleteMessageSeconds?: number | undefined;
}

interface BanOptions {
  readonly reason?: string;
  readonly deleteMessageSeconds?: number;
}

interface StubOptions {
  /** `false` makes `client.guilds.fetch` reject. */
  readonly guildPresent?: boolean;
  /** `false` makes `guild.members.fetch` reject. */
  readonly memberPresent?: boolean;
  /** Thrown by whichever write operation the service reaches. */
  readonly writeError?: Error;
}

interface Stub {
  readonly client: Client;
  readonly calls: readonly RecordedCall[];
  /** Keys present on the object handed to `bans.create`. */
  readonly banOptionKeys: readonly string[][];
}

function stubDiscord(options: StubOptions = {}): Stub {
  const calls: RecordedCall[] = [];
  const banOptionKeys: string[][] = [];
  const fail = (error: Error): Promise<never> => Promise.reject(error);

  const member = {
    timeout: (durationMs: number | null, reason?: string): Promise<void> => {
      if (options.writeError) return fail(options.writeError);
      calls.push({ action: 'timeout', userId: TEST_USER_IDS.member, reason, durationMs });
      return Promise.resolve();
    },
    kick: (reason?: string): Promise<void> => {
      if (options.writeError) return fail(options.writeError);
      calls.push({ action: 'kick', userId: TEST_USER_IDS.member, reason });
      return Promise.resolve();
    },
  };

  const guild = {
    members: {
      fetch: (): Promise<typeof member> =>
        options.memberPresent === false
          ? Promise.reject(
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
    bans: {
      create: (userId: string, banOptions: BanOptions): Promise<void> => {
        if (options.writeError) return fail(options.writeError);
        banOptionKeys.push(Object.keys(banOptions));
        calls.push({
          action: 'ban',
          userId,
          reason: banOptions.reason,
          deleteMessageSeconds: banOptions.deleteMessageSeconds,
        });
        return Promise.resolve();
      },
      remove: (userId: string, reason?: string): Promise<void> => {
        if (options.writeError) return fail(options.writeError);
        calls.push({ action: 'unban', userId, reason });
        return Promise.resolve();
      },
    },
  };

  const client = {
    guilds: {
      fetch: (id: string): Promise<typeof guild> =>
        options.guildPresent === false || id !== TEST_GUILD_ID
          ? Promise.reject(new Error('Unknown Guild'))
          : Promise.resolve(guild),
    },
  };

  return { client: client as unknown as Client, calls, banOptionKeys };
}

interface Harness {
  readonly service: DiscordModerationService;
  readonly calls: readonly RecordedCall[];
  readonly banOptionKeys: readonly string[][];
  readonly sink: MemoryLogSink;
}

function harness(options: StubOptions & { readonly bot?: BotName } = {}): Harness {
  const { client, calls, banOptionKeys } = stubDiscord(options);
  const { logger, sink } = createTestLogger();
  const service = new DiscordModerationService(client, logger, options.bot ?? 'guardian');
  return { service, calls, banOptionKeys, sink };
}

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

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to reject, but it resolved');
}

function apiError(code: number, message = 'failed'): DiscordAPIError {
  return new DiscordAPIError({ code, message }, code, 403, 'PUT', '', {});
}

const MEMBER = TEST_USER_IDS.member;
const NOW = new Date('2026-01-01T00:00:00.000Z');

/** Every method, so cross-cutting behaviour can be asserted uniformly. */
function callEach(
  service: DiscordModerationService,
  until: Date,
): readonly [string, () => Promise<unknown>][] {
  const base = { guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'spam' };
  return [
    ['timeoutMember', (): Promise<unknown> => service.timeoutMember({ ...base, until })],
    ['removeTimeout', (): Promise<unknown> => service.removeTimeout(base)],
    ['kickMember', (): Promise<unknown> => service.kickMember(base)],
    ['banMember', (): Promise<unknown> => service.banMember(base)],
    ['unbanMember', (): Promise<unknown> => service.unbanMember(base)],
  ];
}

describe('DiscordModerationService — capability gate', () => {
  it('constructs for Guardian, which holds moderation:execute', () => {
    expect(() => harness({ bot: 'guardian' })).not.toThrow();
  });

  it.each<BotName>(['companion', 'labs'])(
    'refuses to construct for %s, so a mis-wire fails at boot',
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

describe('DiscordModerationService — guild resolution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(['timeoutMember', 'removeTimeout', 'kickMember', 'banMember', 'unbanMember'])(
    'reports GUILD_MISMATCH from %s when the guild cannot be fetched',
    async (name) => {
      const { service, calls } = harness({ guildPresent: false });
      const until = new Date(Date.now() + 60_000);
      const entry = callEach(service, until).find(([label]) => label === name);
      expect(entry).toBeDefined();

      const error = await expectBloomError(entry![1]());

      expect(error.code).toBe('GUILD_MISMATCH');
      expect(error.details['guild_id']).toBe(TEST_GUILD_ID);
      expect(calls).toHaveLength(0);
    },
  );

  it('reports GUILD_MISMATCH when asked about a different guild', async () => {
    const { service, calls } = harness();

    const error = await expectBloomError(
      service.kickMember({
        guildId: unsafeSnowflake<GuildId>('900000000000000099'),
        userId: MEMBER,
        reason: 'spam',
      }),
    );

    expect(error.code).toBe('GUILD_MISMATCH');
    expect(calls).toHaveLength(0);
  });
});

describe('DiscordModerationService — timeoutMember duration rules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function timeoutAt(service: DiscordModerationService, offsetMs: number): Promise<void> {
    return service.timeoutMember({
      guildId: TEST_GUILD_ID,
      userId: MEMBER,
      until: new Date(Date.now() + offsetMs),
      reason: 'spam',
    });
  }

  it("refuses a timeout longer than Discord's 28-day maximum", async () => {
    const { service, calls } = harness();

    const error = await expectBloomError(timeoutAt(service, MAX_TIMEOUT_MS + 1));

    expect(error.code).toBe('INVALID_INPUT');
    expect(error.userMessage).toBe('Timeouts cannot be longer than 28 days.');
    expect(error.details['maximum_ms']).toBe(MAX_TIMEOUT_MS);
    expect(error.details['requested_ms']).toBe(MAX_TIMEOUT_MS + 1);
    expect(calls).toHaveLength(0);
  });

  it('accepts a timeout of exactly 28 days, because the check is strictly greater', async () => {
    const { service, calls } = harness();

    await timeoutAt(service, MAX_TIMEOUT_MS);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.durationMs).toBe(MAX_TIMEOUT_MS);
  });

  it('refuses a timeout that would end in the past', async () => {
    const { service, calls } = harness();

    const error = await expectBloomError(timeoutAt(service, -1000));

    expect(error.code).toBe('INVALID_INPUT');
    expect(error.userMessage).toBe('That timeout would end in the past.');
    expect(calls).toHaveLength(0);
  });

  it('refuses a zero-length timeout', async () => {
    const { service, calls } = harness();

    const error = await expectBloomError(timeoutAt(service, 0));

    expect(error.code).toBe('INVALID_INPUT');
    expect(error.userMessage).toBe('That timeout would end in the past.');
    expect(calls).toHaveLength(0);
  });

  it('accepts the smallest positive duration', async () => {
    const { service, calls } = harness();

    await timeoutAt(service, 1);

    expect(calls[0]?.durationMs).toBe(1);
  });

  it('validates the duration before touching the guild', async () => {
    // Both would fail. The duration error must win, because it is the one the
    // moderator can act on and it costs no API call.
    const { service } = harness({ guildPresent: false });

    const error = await expectBloomError(timeoutAt(service, MAX_TIMEOUT_MS + 1));

    expect(error.code).toBe('INVALID_INPUT');
  });

  it('passes the computed duration, not the absolute timestamp', async () => {
    const { service, calls } = harness();

    await timeoutAt(service, 60_000);

    expect(calls[0]?.durationMs).toBe(60_000);
  });
});

describe('DiscordModerationService — member resolution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(['timeoutMember', 'removeTimeout', 'kickMember'])(
    '%s reports MEMBER_NOT_FOUND when the member is gone',
    async (name) => {
      const { service, calls } = harness({ memberPresent: false });
      const until = new Date(Date.now() + 60_000);
      const entry = callEach(service, until).find(([label]) => label === name);

      const error = await expectBloomError(entry![1]());

      expect(error.code).toBe('MEMBER_NOT_FOUND');
      expect(error.details['user_id']).toBe(MEMBER);
      expect(error.userMessage).toBe('That member is no longer in this server.');
      expect(calls).toHaveLength(0);
    },
  );

  it('bans a user who is not a member of the guild', async () => {
    // The pre-emptive-ban workflow. `banMember` must not fetch the member.
    const { service, calls } = harness({ memberPresent: false });

    await service.banMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'raider' });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.action).toBe('ban');
  });

  it('unbans a user who is not a member of the guild', async () => {
    const { service, calls } = harness({ memberPresent: false });

    await expect(
      service.unbanMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'appeal' }),
    ).resolves.toBe(true);

    expect(calls[0]?.action).toBe('unban');
  });
});

describe('DiscordModerationService — successful actions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies a timeout and logs moderation.timeout with the end time', async () => {
    const { service, calls, sink } = harness();
    const until = new Date(Date.now() + 60_000);

    await service.timeoutMember({
      guildId: TEST_GUILD_ID,
      userId: MEMBER,
      until,
      reason: 'spam',
    });

    expect(calls).toEqual([
      { action: 'timeout', userId: MEMBER, reason: 'spam', durationMs: 60_000 },
    ]);
    const logged = sink.find('moderation.timeout');
    expect(logged?.severity).toBe('info');
    expect(logged?.context?.['until']).toBe(until.toISOString());
    expect(logged?.context?.['user_id']).toBe(MEMBER);
  });

  it('lifts a timeout by passing null, and logs moderation.untimeout', async () => {
    const { service, calls, sink } = harness();

    await service.removeTimeout({
      guildId: TEST_GUILD_ID,
      userId: MEMBER,
      reason: 'appeal upheld',
    });

    expect(calls[0]?.action).toBe('timeout');
    // null is what clears a timeout; 0 would be a validation error at Discord.
    expect(calls[0]?.durationMs).toBeNull();
    expect(sink.find('moderation.untimeout')?.severity).toBe('info');
  });

  it('kicks a member and logs moderation.kick', async () => {
    const { service, calls, sink } = harness();

    await service.kickMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'spam' });

    expect(calls).toEqual([{ action: 'kick', userId: MEMBER, reason: 'spam' }]);
    expect(sink.find('moderation.kick')?.severity).toBe('info');
  });

  it('bans a user and logs moderation.ban', async () => {
    const { service, calls, sink } = harness();

    await service.banMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'raid' });

    expect(calls[0]?.action).toBe('ban');
    expect(calls[0]?.userId).toBe(MEMBER);
    expect(sink.find('moderation.ban')?.severity).toBe('info');
  });

  it('unbans a user, returns true and logs moderation.unban', async () => {
    const { service, sink } = harness();

    const result = await service.unbanMember({
      guildId: TEST_GUILD_ID,
      userId: MEMBER,
      reason: 'appeal',
    });

    expect(result).toBe(true);
    expect(sink.find('moderation.unban')?.severity).toBe('info');
  });
});

describe('DiscordModerationService — ban message deletion window', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('omits deleteMessageSeconds entirely when it is not supplied', async () => {
    // Not "passes undefined" — the key must be absent, so Discord applies its
    // own default rather than receiving an explicit undefined.
    const { service, banOptionKeys, calls } = harness();

    await service.banMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'raid' });

    expect(banOptionKeys[0]).toEqual(['reason']);
    expect(banOptionKeys[0]).not.toContain('deleteMessageSeconds');
    expect(calls[0]?.deleteMessageSeconds).toBeUndefined();
  });

  it('forwards deleteMessageSeconds when supplied', async () => {
    const { service, banOptionKeys, calls } = harness();

    await service.banMember({
      guildId: TEST_GUILD_ID,
      userId: MEMBER,
      reason: 'raid',
      deleteMessageSeconds: 3600,
    });

    expect(banOptionKeys[0]).toContain('deleteMessageSeconds');
    expect(calls[0]?.deleteMessageSeconds).toBe(3600);
  });

  it('forwards an explicit zero rather than dropping it', async () => {
    // 0 is falsy; a truthiness check instead of an undefined check would lose it.
    const { service, banOptionKeys, calls } = harness();

    await service.banMember({
      guildId: TEST_GUILD_ID,
      userId: MEMBER,
      reason: 'raid',
      deleteMessageSeconds: 0,
    });

    expect(banOptionKeys[0]).toContain('deleteMessageSeconds');
    expect(calls[0]?.deleteMessageSeconds).toBe(0);
  });

  it('logs delete_message_seconds as 0 when none was requested', async () => {
    const { service, sink } = harness();

    await service.banMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'raid' });

    expect(sink.find('moderation.ban')?.context?.['delete_message_seconds']).toBe(0);
  });

  it('logs the requested delete_message_seconds', async () => {
    const { service, sink } = harness();

    await service.banMember({
      guildId: TEST_GUILD_ID,
      userId: MEMBER,
      reason: 'raid',
      deleteMessageSeconds: 604_800,
    });

    expect(sink.find('moderation.ban')?.context?.['delete_message_seconds']).toBe(
      604_800,
    );
  });
});

describe('DiscordModerationService — unban no-op', () => {
  it('returns false instead of throwing when the user was not banned', async () => {
    const { service, sink } = harness({ writeError: apiError(10026, 'Unknown Ban') });

    const result = await service.unbanMember({
      guildId: TEST_GUILD_ID,
      userId: MEMBER,
      reason: 'appeal',
    });

    expect(result).toBe(false);
    expect(sink.has('moderation.unban_noop')).toBe(true);
    // A no-op must not be logged as a completed action.
    expect(sink.has('moderation.unban')).toBe(false);
  });

  it('logs the no-op at debug, not at info', async () => {
    const { service, sink } = harness({ writeError: apiError(10026, 'Unknown Ban') });

    await service.unbanMember({
      guildId: TEST_GUILD_ID,
      userId: MEMBER,
      reason: 'appeal',
    });

    expect(sink.find('moderation.unban_noop')?.severity).toBe('debug');
  });

  it('treats 10026 as a no-op only for unban, not for other actions', async () => {
    const { service } = harness({ writeError: apiError(10026, 'Unknown Ban') });

    const error = await expectBloomError(
      service.kickMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'spam' }),
    );

    expect(error.code).toBe('DISCORD_API_ERROR');
  });

  it('still throws for a non-10026 failure during unban', async () => {
    const { service } = harness({ writeError: apiError(50013, 'Missing Permissions') });

    const error = await expectBloomError(
      service.unbanMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'appeal' }),
    );

    expect(error.code).toBe('ROLE_HIERARCHY_BLOCKED');
  });
});

describe('DiscordModerationService — reason sanitisation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each<[string, (s: DiscordModerationService, reason: string) => Promise<unknown>]>([
    [
      'timeoutMember',
      (s, reason): Promise<unknown> =>
        s.timeoutMember({
          guildId: TEST_GUILD_ID,
          userId: MEMBER,
          until: new Date(Date.now() + 60_000),
          reason,
        }),
    ],
    [
      'removeTimeout',
      (s, reason): Promise<unknown> =>
        s.removeTimeout({ guildId: TEST_GUILD_ID, userId: MEMBER, reason }),
    ],
    [
      'kickMember',
      (s, reason): Promise<unknown> =>
        s.kickMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason }),
    ],
    [
      'banMember',
      (s, reason): Promise<unknown> =>
        s.banMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason }),
    ],
    [
      'unbanMember',
      (s, reason): Promise<unknown> =>
        s.unbanMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason }),
    ],
  ])('%s strips control characters and trims the reason', async (_label, invoke) => {
    const { service, calls } = harness();

    await invoke(service, '  spam\u0000and\u001fraid  ');

    expect(calls[0]?.reason).toBe('spamandraid');
  });

  it.each<[string, (s: DiscordModerationService, reason: string) => Promise<unknown>]>([
    [
      'kickMember',
      (s, reason): Promise<unknown> =>
        s.kickMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason }),
    ],
    [
      'banMember',
      (s, reason): Promise<unknown> =>
        s.banMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason }),
    ],
  ])(
    "%s truncates the reason to Discord's 512-character audit limit",
    async (_label, invoke) => {
      const { service, calls } = harness();

      await invoke(service, 'x'.repeat(600));

      expect(calls[0]?.reason).toHaveLength(512);
    },
  );
});

describe('DiscordModerationService — Discord error translation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps 50013 to ROLE_HIERARCHY_BLOCKED naming both possible causes', async () => {
    const thrown = apiError(50013, 'Missing Permissions');
    const { service } = harness({ writeError: thrown });

    const error = await expectBloomError(
      service.kickMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'spam' }),
    );

    expect(error.code).toBe('ROLE_HIERARCHY_BLOCKED');
    expect(error.details['discord_code']).toBe(50013);
    expect(error.details['action']).toBe('kick');
    expect(error.cause).toBe(thrown);
    expect(error.operatorHint).toMatch(/Server Settings/);
    expect(error.operatorHint).toMatch(/missing the permission/i);
    // The member-facing text must not carry the operator diagnosis.
    expect(error.userMessage).toBe('Bloom could not complete that action.');
  });

  it('maps 10007 Unknown Member to MEMBER_NOT_FOUND', async () => {
    const { service } = harness({ writeError: apiError(10007, 'Unknown Member') });

    const error = await expectBloomError(
      service.kickMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'spam' }),
    );

    expect(error.code).toBe('MEMBER_NOT_FOUND');
    expect(error.userMessage).toBe('That member is no longer in this server.');
  });

  it('maps 10013 Unknown User to MEMBER_NOT_FOUND with a distinct message', async () => {
    const { service } = harness({ writeError: apiError(10013, 'Unknown User') });

    const error = await expectBloomError(
      service.banMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'raid' }),
    );

    expect(error.code).toBe('MEMBER_NOT_FOUND');
    // Deliberately different from 10007: a wrong id is not a departed member.
    expect(error.userMessage).toBe('That user does not exist.');
  });

  it('maps 30035 to INVALID_INPUT for the ban limit', async () => {
    const { service } = harness({ writeError: apiError(30035, 'Too many bans') });

    const error = await expectBloomError(
      service.banMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'raid' }),
    );

    expect(error.code).toBe('INVALID_INPUT');
    expect(error.userMessage).toMatch(/ban limit/);
  });

  it('maps any other Discord code to DISCORD_API_ERROR', async () => {
    const { service } = harness({ writeError: apiError(50001, 'Missing Access') });

    const error = await expectBloomError(
      service.kickMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'spam' }),
    );

    expect(error.code).toBe('DISCORD_API_ERROR');
    expect(error.details['discord_code']).toBe(50001);
    expect(error.details['action']).toBe('kick');
  });

  it.each<[string, string]>([
    ['timeoutMember', 'timeout'],
    ['removeTimeout', 'untimeout'],
    ['kickMember', 'kick'],
    ['banMember', 'ban'],
    ['unbanMember', 'unban'],
  ])('%s labels the translated error with the action name %s', async (name, action) => {
    const { service } = harness({ writeError: apiError(50001, 'Missing Access') });
    const until = new Date(Date.now() + 60_000);
    const entry = callEach(service, until).find(([label]) => label === name);

    const error = await expectBloomError(entry![1]());

    expect(error.details['action']).toBe(action);
  });

  it('rethrows a non-Discord error unchanged rather than mislabelling it', async () => {
    const thrown = new Error('socket hang up');
    const { service } = harness({ writeError: thrown });

    const error = await rejection(
      service.kickMember({ guildId: TEST_GUILD_ID, userId: MEMBER, reason: 'spam' }),
    );

    expect(error).toBe(thrown);
    expect(error).not.toBeInstanceOf(BloomError);
  });

  it.each(['timeoutMember', 'removeTimeout', 'kickMember', 'banMember', 'unbanMember'])(
    '%s logs no success event when the write fails',
    async (name) => {
      const { service, sink } = harness({ writeError: apiError(50013) });
      const until = new Date(Date.now() + 60_000);
      const entry = callEach(service, until).find(([label]) => label === name);

      await rejection(entry![1]());

      expect(sink.bySeverity('info')).toHaveLength(0);
    },
  );
});

describe('DiscordModerationService — permission bit map', () => {
  it('maps each action to the permission the matrix documents', () => {
    expect(MODERATION_PERMISSION_BITS.timeout).toBe(PermissionFlagsBits.ModerateMembers);
    expect(MODERATION_PERMISSION_BITS.kick).toBe(PermissionFlagsBits.KickMembers);
    expect(MODERATION_PERMISSION_BITS.ban).toBe(PermissionFlagsBits.BanMembers);
  });

  it('does not claim Administrator for any action', () => {
    // The brief forbids Administrator outright; this is the cheapest place to
    // notice somebody "fixing" a permission problem with it.
    for (const bit of Object.values(MODERATION_PERMISSION_BITS)) {
      expect(bit).not.toBe(PermissionFlagsBits.Administrator);
    }
  });
});
