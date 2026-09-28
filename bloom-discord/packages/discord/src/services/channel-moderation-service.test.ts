import {
  ChannelType,
  Collection,
  DiscordAPIError,
  PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js';
import type { Client, Message } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import {
  BloomError,
  unsafeSnowflake,
  type BotName,
  type ChannelId,
  type UserId,
} from '@bloom/shared-types';
import {
  createTestLogger,
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_USER_IDS,
  type MemoryLogSink,
} from '@bloom/testing';
import {
  DiscordChannelModerationService,
  MAX_SLOWMODE_SECONDS,
} from './channel-moderation-service.js';

/**
 * `DiscordChannelModerationService` — slowmode, channel locking and purges.
 *
 * Like the member-moderation adapter, this class performs an operation that has
 * *already* been authorised: whether the caller may lock a channel is decided in
 * `@bloom/permissions` a layer up. What this class owns, and what these tests
 * cover, is input validation, channel resolution, the exact payload sent to
 * Discord, the translation of Discord's failures, and — most of all — telling
 * the truth about what happened.
 *
 * Three behaviours are load-bearing and easy to regress, so they are asserted
 * hard:
 *
 *   - **Unlock clears the overwrite, it does not grant.** `setSendPermission`
 *     maps `inherited` to `null`, not `true`. Mapping it to `true` would turn a
 *     lock followed by an unlock into a silent grant of send access to a
 *     staff-only channel that never had it. This is a privilege escalation, not
 *     a cosmetic difference, and it is covered from several angles.
 *   - **Purge reports what it actually deleted.** Discord will not bulk-delete
 *     messages older than 14 days, and may remove fewer than it was handed. The
 *     returned `deleted` comes from Discord's response, never from the size of
 *     the request, and `skippedTooOld` is reported separately. Claiming
 *     "purged 100" after removing 12 is precisely the fake functionality the
 *     brief forbids.
 *   - **Only standard text channels are accepted.** Threads, forums, voice,
 *     categories and announcement channels have different permission
 *     semantics; the service refuses them rather than doing something
 *     approximate.
 *
 * ## On the stub
 *
 * `@bloom/testing` ships `FakeChannelModerationService`, but that is a fake of
 * the *port* — it is what Guardian's feature tests use instead of this class,
 * so it cannot exercise it. Testing the adapter needs a discord.js `Client`,
 * which no shared fake provides. The stub below models only the surface this
 * service touches, mirroring the approach in `moderation-service.test.ts` and
 * `role-service.test.ts`.
 *
 * Where discord.js ships real logic, the stub uses the real thing rather than
 * imitating it: permission overwrites are genuine `PermissionsBitField`
 * instances and message batches are genuine `Collection`s, so the bit tests and
 * iteration order under test are Discord's own, not a reimplementation that
 * could agree with a bug.
 */

const CHANNEL = TEST_CHANNEL_IDS.support;
const AUTHOR = TEST_USER_IDS.member;
const OTHER_AUTHOR = TEST_USER_IDS.moderator;
const EVERYONE_ROLE_ID = TEST_GUILD_ID;
const NOW = new Date('2026-06-01T12:00:00.000Z');
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

interface StubMessage {
  readonly id: string;
  readonly authorId: UserId;
  readonly pinned: boolean;
  readonly createdTimestamp: number;
}

/** A message `ageMs` old relative to the frozen clock. */
function message(
  id: string,
  options: {
    readonly authorId?: UserId;
    readonly pinned?: boolean;
    readonly ageMs?: number;
  } = {},
): StubMessage {
  return {
    id,
    authorId: options.authorId ?? AUTHOR,
    pinned: options.pinned ?? false,
    createdTimestamp: NOW.getTime() - (options.ageMs ?? 0),
  };
}

interface EditRecord {
  readonly roleId: string;
  readonly permissions: Readonly<Record<string, boolean | null>>;
  readonly permissionKeys: readonly string[];
  readonly reason: string | undefined;
}

interface Recorded {
  readonly guildFetches: string[];
  readonly channelFetches: string[];
  readonly slowmodes: { readonly seconds: number; readonly reason: string | undefined }[];
  readonly edits: EditRecord[];
  readonly messageFetches: { readonly limit: number | undefined }[];
  readonly bulkDeletes: {
    readonly ids: readonly string[];
    readonly filterOld: unknown;
  }[];
}

interface StubOptions {
  /** `false` makes `client.guilds.fetch` reject. */
  readonly guildPresent?: boolean;
  /** `false` makes `guild.channels.fetch` resolve to `null`. */
  readonly channelPresent?: boolean;
  /** Defaults to a standard guild text channel. */
  readonly channelType?: ChannelType;
  /** `@everyone` overwrite on the channel. Absent means no overwrite at all. */
  readonly overwrite?: { readonly allow?: bigint; readonly deny?: bigint };
  /** Messages `channel.messages.fetch` returns, newest first, as Discord does. */
  readonly messages?: readonly StubMessage[];
  /** How many of the handed-over messages Discord actually removes. */
  readonly bulkDeleted?: number;
  readonly slowmodeError?: Error;
  readonly editError?: Error;
  readonly messageFetchError?: Error;
  readonly bulkDeleteError?: Error;
}

interface Stub {
  readonly client: Client;
  readonly recorded: Recorded;
}

function stubDiscord(options: StubOptions = {}): Stub {
  const recorded: Recorded = {
    guildFetches: [],
    channelFetches: [],
    slowmodes: [],
    edits: [],
    messageFetches: [],
    bulkDeletes: [],
  };

  const everyone = { id: EVERYONE_ROLE_ID };

  const overwriteCache = new Collection<string, unknown>();
  if (options.overwrite) {
    overwriteCache.set(EVERYONE_ROLE_ID, {
      id: EVERYONE_ROLE_ID,
      allow: new PermissionsBitField(options.overwrite.allow ?? 0n),
      deny: new PermissionsBitField(options.overwrite.deny ?? 0n),
    });
  }

  const channel = {
    type: options.channelType ?? ChannelType.GuildText,
    guild: { roles: { everyone } },
    permissionOverwrites: {
      cache: overwriteCache,
      edit: (
        role: { readonly id: string },
        permissions: Record<string, boolean | null>,
        editOptions?: { readonly reason?: string },
      ): Promise<void> => {
        if (options.editError) return Promise.reject(options.editError);
        recorded.edits.push({
          roleId: role.id,
          permissions,
          permissionKeys: Object.keys(permissions),
          reason: editOptions?.reason,
        });
        return Promise.resolve();
      },
    },
    setRateLimitPerUser: (seconds: number, reason?: string): Promise<void> => {
      if (options.slowmodeError) return Promise.reject(options.slowmodeError);
      recorded.slowmodes.push({ seconds, reason });
      return Promise.resolve();
    },
    messages: {
      fetch: (query: {
        readonly limit?: number;
      }): Promise<Collection<string, Message>> => {
        if (options.messageFetchError) return Promise.reject(options.messageFetchError);
        recorded.messageFetches.push({ limit: query.limit });
        const batch = new Collection<string, Message>();
        for (const entry of options.messages ?? []) {
          batch.set(entry.id, {
            id: entry.id,
            pinned: entry.pinned,
            createdTimestamp: entry.createdTimestamp,
            author: { id: entry.authorId },
          } as unknown as Message);
        }
        return Promise.resolve(batch);
      },
    },
    bulkDelete: (
      messages: readonly Message[],
      filterOld: unknown,
    ): Promise<Collection<string, Message>> => {
      if (options.bulkDeleteError) return Promise.reject(options.bulkDeleteError);
      recorded.bulkDeletes.push({
        ids: messages.map((entry) => entry.id),
        filterOld,
      });
      const removed = new Collection<string, Message>();
      const count = Math.min(options.bulkDeleted ?? messages.length, messages.length);
      for (const entry of messages.slice(0, count)) removed.set(entry.id, entry);
      return Promise.resolve(removed);
    },
  };

  const guild = {
    channels: {
      fetch: (id: string): Promise<typeof channel | null> => {
        recorded.channelFetches.push(id);
        return options.channelPresent === false
          ? Promise.resolve(null)
          : Promise.resolve(channel);
      },
    },
  };

  const client = {
    guilds: {
      fetch: (id: string): Promise<typeof guild> => {
        recorded.guildFetches.push(id);
        return options.guildPresent === false || id !== TEST_GUILD_ID
          ? Promise.reject(new Error('Unknown Guild'))
          : Promise.resolve(guild);
      },
    },
  };

  return { client: client as unknown as Client, recorded };
}

interface Harness {
  readonly service: DiscordChannelModerationService;
  readonly recorded: Recorded;
  readonly sink: MemoryLogSink;
}

function harness(options: StubOptions & { readonly bot?: BotName } = {}): Harness {
  const { client, recorded } = stubDiscord(options);
  const { logger, sink } = createTestLogger();
  const service = new DiscordChannelModerationService(
    client,
    logger,
    options.bot ?? 'guardian',
  );
  return { service, recorded, sink };
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

function apiError(code: number, msg = 'failed'): DiscordAPIError {
  return new DiscordAPIError({ code, message: msg }, code, 403, 'PATCH', '', {});
}

/** Every public method, so cross-cutting behaviour can be asserted uniformly. */
function callEach(
  service: DiscordChannelModerationService,
  channelId: ChannelId = CHANNEL,
): readonly (readonly [string, () => Promise<unknown>])[] {
  return [
    [
      'setSlowmode',
      (): Promise<unknown> =>
        service.setSlowmode({
          guildId: TEST_GUILD_ID,
          channelId,
          seconds: 10,
          reason: 'noise',
        }),
    ],
    [
      'getSendPermission',
      (): Promise<unknown> => service.getSendPermission(TEST_GUILD_ID, channelId),
    ],
    [
      'setSendPermission',
      (): Promise<unknown> =>
        service.setSendPermission({
          guildId: TEST_GUILD_ID,
          channelId,
          state: 'denied',
          reason: 'raid',
        }),
    ],
    [
      'purgeMessages',
      (): Promise<unknown> =>
        service.purgeMessages({
          guildId: TEST_GUILD_ID,
          channelId,
          limit: 5,
          reason: 'spam',
        }),
    ],
  ];
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DiscordChannelModerationService — capability gate', () => {
  it('constructs for Guardian, which holds message:manage', () => {
    expect(() => harness({ bot: 'guardian' })).not.toThrow();
  });

  it.each<BotName>(['companion', 'labs'])(
    'refuses to construct for %s, which must never delete other members messages',
    (bot) => {
      let caught: unknown;
      try {
        harness({ bot });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(BloomError);
      expect((caught as BloomError).code).toBe('CAPABILITY_DENIED');
    },
  );

  it('treats a denied capability as fatal, because it is a wiring bug', () => {
    let caught: unknown;
    try {
      harness({ bot: 'companion' });
    } catch (error) {
      caught = error;
    }
    expect((caught as BloomError).severity).toBe('fatal');
  });
});

describe('DiscordChannelModerationService — guild resolution', () => {
  const { service } = harness({ guildPresent: false });

  it.each(callEach(service))(
    '%s reports GUILD_MISMATCH when the guild cannot be resolved',
    async (_name, call) => {
      const error = await expectBloomError(call());
      expect(error.code).toBe('GUILD_MISMATCH');
    },
  );

  it('names the guild in the operator hint, not in the user message', async () => {
    const { service: local } = harness({ guildPresent: false });
    const error = await expectBloomError(local.getSendPermission(TEST_GUILD_ID, CHANNEL));
    expect(error.operatorHint).toContain(TEST_GUILD_ID);
    expect(error.details).toMatchObject({ guild_id: TEST_GUILD_ID });
  });

  it('never reaches the channel when the guild is missing', async () => {
    const { service: local, recorded } = harness({ guildPresent: false });
    await rejection(
      local.setSlowmode({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        seconds: 5,
        reason: 'noise',
      }),
    );
    expect(recorded.channelFetches).toHaveLength(0);
  });
});

describe('DiscordChannelModerationService — channel resolution', () => {
  const { service } = harness({ channelPresent: false });

  it.each(callEach(service))(
    '%s reports CHANNEL_NOT_FOUND when the channel is gone',
    async (_name, call) => {
      const error = await expectBloomError(call());
      expect(error.code).toBe('CHANNEL_NOT_FOUND');
      expect(error.userMessage).toBe('That channel could not be found.');
    },
  );

  it('reports the channel id in the details', async () => {
    const missing = unsafeSnowflake<ChannelId>('900000000000009999');
    const { service: local } = harness({ channelPresent: false });
    const error = await expectBloomError(local.getSendPermission(TEST_GUILD_ID, missing));
    expect(error.details).toMatchObject({ channel_id: missing });
  });

  it('asks the guild for the channel it was given', async () => {
    const { service: local, recorded } = harness();
    await local.getSendPermission(TEST_GUILD_ID, CHANNEL);
    expect(recorded.channelFetches).toEqual([CHANNEL]);
  });
});

describe('DiscordChannelModerationService — channel type restriction', () => {
  const unsupported: readonly (readonly [string, ChannelType])[] = [
    ['a public thread', ChannelType.PublicThread],
    ['a private thread', ChannelType.PrivateThread],
    ['a forum', ChannelType.GuildForum],
    ['a voice channel', ChannelType.GuildVoice],
    ['a category', ChannelType.GuildCategory],
    ['an announcement channel', ChannelType.GuildAnnouncement],
  ];

  it.each(unsupported)(
    'refuses %s rather than approximating text-channel semantics',
    async (_label, channelType) => {
      const { service } = harness({ channelType });
      const error = await expectBloomError(
        service.getSendPermission(TEST_GUILD_ID, CHANNEL),
      );
      expect(error.code).toBe('CHANNEL_RESTRICTED');
      expect(error.userMessage).toBe(
        'That command only works in a standard text channel.',
      );
      expect(error.details).toMatchObject({
        channel_id: CHANNEL,
        channel_type: channelType,
      });
    },
  );

  it.each(callEach(harness({ channelType: ChannelType.GuildForum }).service))(
    '%s refuses a non-text channel',
    async (_name, call) => {
      const error = await expectBloomError(call());
      expect(error.code).toBe('CHANNEL_RESTRICTED');
    },
  );

  it('explains in the operator hint why threads and forums are excluded', async () => {
    const { service } = harness({ channelType: ChannelType.PublicThread });
    const error = await expectBloomError(
      service.getSendPermission(TEST_GUILD_ID, CHANNEL),
    );
    expect(error.operatorHint).toContain('text channels only');
    expect(error.operatorHint).toContain('permission semantics');
  });

  it('accepts a standard guild text channel', async () => {
    const { service } = harness({ channelType: ChannelType.GuildText });
    await expect(service.getSendPermission(TEST_GUILD_ID, CHANNEL)).resolves.toBe(
      'inherited',
    );
  });
});

describe('DiscordChannelModerationService — setSlowmode validation', () => {
  const invalid: readonly (readonly [string, number])[] = [
    ['a negative duration', -1],
    ['a fractional duration', 5.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['one second past the maximum', MAX_SLOWMODE_SECONDS + 1],
  ];

  it.each(invalid)('rejects %s', async (_label, seconds) => {
    const { service } = harness();
    const error = await expectBloomError(
      service.setSlowmode({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        seconds,
        reason: 'noise',
      }),
    );
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.details).toMatchObject({ seconds });
  });

  it('quotes the permitted range in the user message', async () => {
    const { service } = harness();
    const error = await expectBloomError(
      service.setSlowmode({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        seconds: -1,
        reason: 'noise',
      }),
    );
    expect(error.userMessage).toBe(
      `Slowmode must be between 0 and ${String(MAX_SLOWMODE_SECONDS)} seconds.`,
    );
  });

  const valid: readonly (readonly [string, number])[] = [
    ['zero, which disables slowmode', 0],
    ['one second', 1],
    ['exactly the six-hour maximum', MAX_SLOWMODE_SECONDS],
  ];

  it.each(valid)('accepts %s', async (_label, seconds) => {
    const { service, recorded } = harness();
    await service.setSlowmode({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      seconds,
      reason: 'noise',
    });
    expect(recorded.slowmodes).toEqual([{ seconds, reason: 'noise' }]);
  });

  it('matches Discord\u2019s documented six-hour ceiling', () => {
    expect(MAX_SLOWMODE_SECONDS).toBe(21_600);
    expect(MAX_SLOWMODE_SECONDS).toBe(6 * 60 * 60);
  });

  it('validates before fetching anything, so a bad value costs no API call', async () => {
    const { service, recorded } = harness();
    await rejection(
      service.setSlowmode({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        seconds: -1,
        reason: 'noise',
      }),
    );
    expect(recorded.guildFetches).toHaveLength(0);
    expect(recorded.channelFetches).toHaveLength(0);
  });
});

describe('DiscordChannelModerationService — setSlowmode execution', () => {
  it('sets the rate limit and logs moderation.slowmode', async () => {
    const { service, recorded, sink } = harness();
    await service.setSlowmode({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      seconds: 30,
      reason: 'chat moving too fast',
    });
    expect(recorded.slowmodes).toEqual([{ seconds: 30, reason: 'chat moving too fast' }]);
    expect(sink.find('moderation.slowmode')?.context).toMatchObject({
      channel_id: CHANNEL,
      seconds: 30,
    });
  });

  it('sanitises the audit reason before sending it to Discord', async () => {
    const { service, recorded } = harness();
    await service.setSlowmode({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      seconds: 5,
      reason: '  raid\u0000 wave\n  ',
    });
    expect(recorded.slowmodes[0]?.reason).toBe('raid wave');
  });

  it('truncates an over-long reason to the audit-log limit', async () => {
    const { service, recorded } = harness();
    await service.setSlowmode({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      seconds: 5,
      reason: 'x'.repeat(900),
    });
    expect(recorded.slowmodes[0]?.reason).toHaveLength(512);
  });

  it('does not log a success event when Discord rejects the change', async () => {
    const { service, sink } = harness({ slowmodeError: apiError(50013) });
    await rejection(
      service.setSlowmode({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        seconds: 5,
        reason: 'noise',
      }),
    );
    expect(sink.has('moderation.slowmode')).toBe(false);
  });

  it('translates a Discord failure under the "slowmode" action', async () => {
    const { service } = harness({ slowmodeError: apiError(50013) });
    const error = await expectBloomError(
      service.setSlowmode({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        seconds: 5,
        reason: 'noise',
      }),
    );
    expect(error.code).toBe('BOT_MISSING_PERMISSION');
    expect(error.details).toMatchObject({ action: 'slowmode' });
  });
});

describe('DiscordChannelModerationService — getSendPermission', () => {
  it('reports inherited when the channel carries no @everyone overwrite', async () => {
    const { service } = harness();
    await expect(service.getSendPermission(TEST_GUILD_ID, CHANNEL)).resolves.toBe(
      'inherited',
    );
  });

  it('reports denied when SendMessages is explicitly denied', async () => {
    const { service } = harness({
      overwrite: { deny: PermissionFlagsBits.SendMessages },
    });
    await expect(service.getSendPermission(TEST_GUILD_ID, CHANNEL)).resolves.toBe(
      'denied',
    );
  });

  it('reports allowed when SendMessages is explicitly allowed', async () => {
    const { service } = harness({
      overwrite: { allow: PermissionFlagsBits.SendMessages },
    });
    await expect(service.getSendPermission(TEST_GUILD_ID, CHANNEL)).resolves.toBe(
      'allowed',
    );
  });

  it('reports inherited when an overwrite exists but says nothing about SendMessages', async () => {
    const { service } = harness({
      overwrite: {
        allow: PermissionFlagsBits.AddReactions,
        deny: PermissionFlagsBits.AttachFiles,
      },
    });
    await expect(service.getSendPermission(TEST_GUILD_ID, CHANNEL)).resolves.toBe(
      'inherited',
    );
  });

  it('treats a contradictory overwrite as denied, the safer reading', async () => {
    const { service } = harness({
      overwrite: {
        allow: PermissionFlagsBits.SendMessages,
        deny: PermissionFlagsBits.SendMessages,
      },
    });
    await expect(service.getSendPermission(TEST_GUILD_ID, CHANNEL)).resolves.toBe(
      'denied',
    );
  });

  it('distinguishes inherited from allowed, which is why the port has three states', async () => {
    const inherited = await harness().service.getSendPermission(TEST_GUILD_ID, CHANNEL);
    const allowed = await harness({
      overwrite: { allow: PermissionFlagsBits.SendMessages },
    }).service.getSendPermission(TEST_GUILD_ID, CHANNEL);
    expect(inherited).not.toBe(allowed);
  });

  it('reads state without writing anything', async () => {
    const { service, recorded } = harness({
      overwrite: { deny: PermissionFlagsBits.SendMessages },
    });
    await service.getSendPermission(TEST_GUILD_ID, CHANNEL);
    expect(recorded.edits).toHaveLength(0);
  });
});

describe('DiscordChannelModerationService — setSendPermission', () => {
  const states: readonly (readonly [
    'allowed' | 'denied' | 'inherited',
    boolean | null,
  ])[] = [
    ['denied', false],
    ['allowed', true],
    ['inherited', null],
  ];

  it.each(states)(
    'maps state %s to %s on every send-related permission',
    async (state, expected) => {
      const { service, recorded } = harness();
      await service.setSendPermission({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        state,
        reason: 'raid',
      });
      expect(recorded.edits[0]?.permissions).toEqual({
        SendMessages: expected,
        SendMessagesInThreads: expected,
        CreatePublicThreads: expected,
        CreatePrivateThreads: expected,
      });
    },
  );

  it('clears the overwrite on unlock instead of granting send access', async () => {
    const { service, recorded } = harness();
    await service.setSendPermission({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      state: 'inherited',
      reason: 'all clear',
    });
    expect(recorded.edits[0]?.permissions['SendMessages']).toBeNull();
    expect(recorded.edits[0]?.permissions['SendMessages']).not.toBe(true);
  });

  it('leaves a staff-only channel closed after a lock then unlock cycle', async () => {
    const { service, recorded } = harness();
    await service.setSendPermission({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      state: 'denied',
      reason: 'raid',
    });
    await service.setSendPermission({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      state: 'inherited',
      reason: 'all clear',
    });
    expect(recorded.edits.map((edit) => edit.permissions['SendMessages'])).toEqual([
      false,
      null,
    ]);
  });

  it('closes the thread-creation routes around a lock, not just SendMessages', async () => {
    const { service, recorded } = harness();
    await service.setSendPermission({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      state: 'denied',
      reason: 'raid',
    });
    expect(recorded.edits[0]?.permissionKeys).toEqual([
      'SendMessages',
      'SendMessagesInThreads',
      'CreatePublicThreads',
      'CreatePrivateThreads',
    ]);
  });

  it('edits the @everyone role, not the acting member', async () => {
    const { service, recorded } = harness();
    await service.setSendPermission({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      state: 'denied',
      reason: 'raid',
    });
    expect(recorded.edits[0]?.roleId).toBe(EVERYONE_ROLE_ID);
  });

  it('sanitises the audit reason', async () => {
    const { service, recorded } = harness();
    await service.setSendPermission({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      state: 'denied',
      reason: '  raid\u0007 wave  ',
    });
    expect(recorded.edits[0]?.reason).toBe('raid wave');
  });

  it('logs moderation.channel_permission with the requested state', async () => {
    const { service, sink } = harness();
    await service.setSendPermission({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      state: 'denied',
      reason: 'raid',
    });
    expect(sink.find('moderation.channel_permission')?.context).toMatchObject({
      channel_id: CHANNEL,
      state: 'denied',
    });
  });

  it('translates a Discord failure under the "lock" action', async () => {
    const { service } = harness({ editError: apiError(50013) });
    const error = await expectBloomError(
      service.setSendPermission({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        state: 'denied',
        reason: 'raid',
      }),
    );
    expect(error.code).toBe('BOT_MISSING_PERMISSION');
    expect(error.details).toMatchObject({ action: 'lock' });
  });

  it('does not log success when the edit fails', async () => {
    const { service, sink } = harness({ editError: apiError(50013) });
    await rejection(
      service.setSendPermission({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        state: 'denied',
        reason: 'raid',
      }),
    );
    expect(sink.has('moderation.channel_permission')).toBe(false);
  });
});

describe('DiscordChannelModerationService — purgeMessages validation', () => {
  const invalid: readonly (readonly [string, number])[] = [
    ['zero', 0],
    ['a negative limit', -5],
    ['a fractional limit', 2.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['one past Discord\u2019s bulk-delete batch limit', 101],
  ];

  it.each(invalid)('rejects %s', async (_label, limit) => {
    const { service } = harness();
    const error = await expectBloomError(
      service.purgeMessages({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        limit,
        reason: 'spam',
      }),
    );
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.details).toMatchObject({ limit });
  });

  it('explains why larger purges are deliberately not offered', async () => {
    const { service } = harness();
    const error = await expectBloomError(
      service.purgeMessages({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        limit: 500,
        reason: 'spam',
      }),
    );
    expect(error.userMessage).toBe(
      'Purge can remove between 1 and 100 messages at a time.',
    );
    expect(error.operatorHint).toContain('unrecoverable');
  });

  it.each([1, 100])('accepts the boundary limit %i', async (limit) => {
    const { service } = harness({ messages: [message('m1')] });
    await expect(
      service.purgeMessages({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        limit,
        reason: 'spam',
      }),
    ).resolves.toMatchObject({ requested: limit });
  });

  it('validates before fetching anything', async () => {
    const { service, recorded } = harness();
    await rejection(
      service.purgeMessages({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        limit: 0,
        reason: 'spam',
      }),
    );
    expect(recorded.guildFetches).toHaveLength(0);
    expect(recorded.messageFetches).toHaveLength(0);
  });
});

describe('DiscordChannelModerationService — purgeMessages selection', () => {
  it('fetches exactly the requested number when not filtering by author', async () => {
    const { service, recorded } = harness({ messages: [message('m1')] });
    await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 7,
      reason: 'spam',
    });
    expect(recorded.messageFetches).toEqual([{ limit: 7 }]);
  });

  it('over-fetches to the batch maximum when filtering by author', async () => {
    const { service, recorded } = harness({ messages: [message('m1')] });
    await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 7,
      authorId: AUTHOR,
      reason: 'spam',
    });
    expect(recorded.messageFetches).toEqual([{ limit: 100 }]);
  });

  it('deletes only the named author\u2019s messages', async () => {
    const { service, recorded } = harness({
      messages: [
        message('a1', { authorId: AUTHOR }),
        message('b1', { authorId: OTHER_AUTHOR }),
        message('a2', { authorId: AUTHOR }),
      ],
    });
    const result = await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 10,
      authorId: AUTHOR,
      reason: 'spam',
    });
    expect(recorded.bulkDeletes[0]?.ids).toEqual(['a1', 'a2']);
    expect(result.deleted).toBe(2);
  });

  it('never deletes pinned messages', async () => {
    const { service, recorded } = harness({
      messages: [message('m1'), message('pinned', { pinned: true }), message('m2')],
    });
    await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 10,
      reason: 'spam',
    });
    expect(recorded.bulkDeletes[0]?.ids).toEqual(['m1', 'm2']);
  });

  it('caps the deletion at the requested limit even after over-fetching', async () => {
    const { service, recorded } = harness({
      messages: Array.from({ length: 20 }, (_unused, index) =>
        message(`m${String(index)}`),
      ),
    });
    await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 3,
      authorId: AUTHOR,
      reason: 'spam',
    });
    expect(recorded.bulkDeletes[0]?.ids).toEqual(['m0', 'm1', 'm2']);
  });

  it('applies the limit after filtering, not before', async () => {
    const { service, recorded } = harness({
      messages: [
        message('other1', { authorId: OTHER_AUTHOR }),
        message('other2', { authorId: OTHER_AUTHOR }),
        message('mine1', { authorId: AUTHOR }),
        message('mine2', { authorId: AUTHOR }),
      ],
    });
    await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 2,
      authorId: AUTHOR,
      reason: 'spam',
    });
    expect(recorded.bulkDeletes[0]?.ids).toEqual(['mine1', 'mine2']);
  });

  it('asks Discord to filter old messages as a second line of defence', async () => {
    const { service, recorded } = harness({ messages: [message('m1')] });
    await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 5,
      reason: 'spam',
    });
    expect(recorded.bulkDeletes[0]?.filterOld).toBe(true);
  });
});

describe('DiscordChannelModerationService — purgeMessages honesty', () => {
  it('skips messages older than fourteen days rather than claiming to delete them', async () => {
    const { service, recorded } = harness({
      messages: [
        message('fresh', { ageMs: 1000 }),
        message('ancient', { ageMs: FOURTEEN_DAYS_MS + 60_000 }),
      ],
    });
    const result = await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 10,
      reason: 'spam',
    });
    expect(recorded.bulkDeletes[0]?.ids).toEqual(['fresh']);
    expect(result).toEqual({ requested: 10, deleted: 1, skippedTooOld: 1 });
  });

  it('keeps a message one millisecond inside the cutoff', async () => {
    const { service, recorded } = harness({
      messages: [message('edge', { ageMs: FOURTEEN_DAYS_MS - 1 })],
    });
    await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 5,
      reason: 'spam',
    });
    expect(recorded.bulkDeletes[0]?.ids).toEqual(['edge']);
  });

  it('skips a message exactly on the cutoff, because the comparison is strict', async () => {
    const { service } = harness({
      messages: [message('edge', { ageMs: FOURTEEN_DAYS_MS })],
    });
    const result = await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 5,
      reason: 'spam',
    });
    expect(result).toEqual({ requested: 5, deleted: 0, skippedTooOld: 1 });
  });

  it('reports what Discord actually removed, not what it was asked to remove', async () => {
    const { service } = harness({
      messages: [message('m1'), message('m2'), message('m3')],
      bulkDeleted: 1,
    });
    const result = await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 3,
      reason: 'spam',
    });
    expect(result.deleted).toBe(1);
    expect(result.requested).toBe(3);
  });

  it('echoes the requested limit even when far fewer messages exist', async () => {
    const { service } = harness({ messages: [message('m1')] });
    const result = await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 100,
      reason: 'spam',
    });
    expect(result).toEqual({ requested: 100, deleted: 1, skippedTooOld: 0 });
  });

  it('does not count pinned messages as skipped-too-old', async () => {
    const { service } = harness({
      messages: [message('m1'), message('pin', { pinned: true })],
    });
    const result = await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 10,
      reason: 'spam',
    });
    expect(result.skippedTooOld).toBe(0);
  });
});

describe('DiscordChannelModerationService — purgeMessages no-op', () => {
  it('returns a zero result without calling bulkDelete when nothing matches', async () => {
    const { service, recorded } = harness({ messages: [] });
    const result = await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 10,
      reason: 'spam',
    });
    expect(result).toEqual({ requested: 10, deleted: 0, skippedTooOld: 0 });
    expect(recorded.bulkDeletes).toHaveLength(0);
  });

  it('reports every candidate as too old when they all are', async () => {
    const { service, recorded } = harness({
      messages: [
        message('old1', { ageMs: FOURTEEN_DAYS_MS * 2 }),
        message('old2', { ageMs: FOURTEEN_DAYS_MS * 3 }),
      ],
    });
    const result = await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 10,
      reason: 'spam',
    });
    expect(result).toEqual({ requested: 10, deleted: 0, skippedTooOld: 2 });
    expect(recorded.bulkDeletes).toHaveLength(0);
  });

  it('logs nothing when it deleted nothing, so the audit trail stays honest', async () => {
    const { service, sink } = harness({
      messages: [message('old', { ageMs: FOURTEEN_DAYS_MS * 2 })],
    });
    await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 10,
      reason: 'spam',
    });
    expect(sink.has('moderation.purge')).toBe(false);
  });

  it('returns zero when the author has no messages in the batch', async () => {
    const { service, recorded } = harness({
      messages: [message('m1', { authorId: OTHER_AUTHOR })],
    });
    const result = await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 10,
      authorId: AUTHOR,
      reason: 'spam',
    });
    expect(result.deleted).toBe(0);
    expect(recorded.bulkDeletes).toHaveLength(0);
  });
});

describe('DiscordChannelModerationService — purgeMessages logging', () => {
  it('logs the requested, deleted and skipped counts', async () => {
    const { service, sink } = harness({
      messages: [
        message('m1'),
        message('m2'),
        message('old', { ageMs: FOURTEEN_DAYS_MS * 2 }),
      ],
    });
    await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 10,
      reason: 'spam',
    });
    expect(sink.find('moderation.purge')?.context).toMatchObject({
      channel_id: CHANNEL,
      requested: 10,
      deleted: 2,
      skipped_too_old: 1,
    });
  });

  it('omits author_id entirely from a channel-wide purge', async () => {
    const { service, sink } = harness({ messages: [message('m1')] });
    await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 5,
      reason: 'spam',
    });
    expect(sink.find('moderation.purge')?.context).not.toHaveProperty('author_id');
  });

  /*
   * The service adds `author_id` to the log context, but the logger's mandatory
   * redactor removes the value: `isSensitiveKey` lowercases and strips the key
   * to `authorid`, which contains the fragment `auth`, so it matches the same
   * rule that catches `authorization`. The key is still emitted, so the log
   * records *that* the purge was scoped to one member, but not to whom.
   *
   * This is over-redaction rather than a leak — it fails in the safe direction —
   * so it is pinned here as the current, observable behaviour rather than
   * quietly worked around. Narrowing the fragment is a change to
   * `@bloom/utils` and belongs in its own review.
   */
  it('records that the purge was author-scoped, with the id redacted by the logger', async () => {
    const { service, sink } = harness({ messages: [message('m1')] });
    await service.purgeMessages({
      guildId: TEST_GUILD_ID,
      channelId: CHANNEL,
      limit: 5,
      authorId: AUTHOR,
      reason: 'spam',
    });
    const context = sink.find('moderation.purge')?.context;
    expect(context).toHaveProperty('author_id');
    expect(context?.['author_id']).not.toBe(AUTHOR);
    expect(sink.serialised()).not.toContain(AUTHOR);
  });
});

describe('DiscordChannelModerationService — purgeMessages failures', () => {
  it('translates a failure while fetching messages', async () => {
    const { service } = harness({ messageFetchError: apiError(50013) });
    const error = await expectBloomError(
      service.purgeMessages({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        limit: 5,
        reason: 'spam',
      }),
    );
    expect(error.code).toBe('BOT_MISSING_PERMISSION');
    expect(error.details).toMatchObject({ action: 'purge' });
  });

  it('translates a failure while bulk-deleting', async () => {
    const { service } = harness({
      messages: [message('m1')],
      bulkDeleteError: apiError(50013),
    });
    const error = await expectBloomError(
      service.purgeMessages({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        limit: 5,
        reason: 'spam',
      }),
    );
    expect(error.details).toMatchObject({ action: 'purge' });
  });

  it('maps Discord 50034 to a clear "too old" message', async () => {
    const { service } = harness({
      messages: [message('m1')],
      bulkDeleteError: apiError(50034, 'You can only bulk delete messages under 14 days'),
    });
    const error = await expectBloomError(
      service.purgeMessages({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        limit: 5,
        reason: 'spam',
      }),
    );
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.userMessage).toContain('14 days');
  });

  it('does not log a purge that failed', async () => {
    const { service, sink } = harness({
      messages: [message('m1')],
      bulkDeleteError: apiError(50013),
    });
    await rejection(
      service.purgeMessages({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        limit: 5,
        reason: 'spam',
      }),
    );
    expect(sink.has('moderation.purge')).toBe(false);
  });
});

describe('DiscordChannelModerationService — Discord error translation', () => {
  it('maps 50013 to BOT_MISSING_PERMISSION and names the channel-overwrite trap', async () => {
    const { service } = harness({
      slowmodeError: apiError(50013, 'Missing Permissions'),
    });
    const error = await expectBloomError(
      service.setSlowmode({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        seconds: 5,
        reason: 'noise',
      }),
    );
    expect(error.code).toBe('BOT_MISSING_PERMISSION');
    expect(error.userMessage).toBe('Bloom could not complete that action.');
    expect(error.operatorHint).toContain('Manage Channels');
    expect(error.operatorHint).toContain('Manage Roles');
    expect(error.operatorHint).toContain('Manage Messages');
    expect(error.operatorHint).toContain('channel-level overwrite');
    expect(error.details).toMatchObject({ action: 'slowmode', discord_code: 50013 });
  });

  it('maps 10003 to CHANNEL_NOT_FOUND for a channel deleted mid-flight', async () => {
    const { service } = harness({ editError: apiError(10003, 'Unknown Channel') });
    const error = await expectBloomError(
      service.setSendPermission({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        state: 'denied',
        reason: 'raid',
      }),
    );
    expect(error.code).toBe('CHANNEL_NOT_FOUND');
    expect(error.operatorHint).toContain('deleted between the command and the API call');
  });

  it('maps an unrecognised code to DISCORD_API_ERROR carrying the code', async () => {
    const { service } = harness({ slowmodeError: apiError(50001, 'Missing Access') });
    const error = await expectBloomError(
      service.setSlowmode({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        seconds: 5,
        reason: 'noise',
      }),
    );
    expect(error.code).toBe('DISCORD_API_ERROR');
    expect(error.details).toMatchObject({ action: 'slowmode', discord_code: 50001 });
    expect(error.operatorHint).toContain('50001');
  });

  it('preserves the Discord error as the cause for every mapped code', async () => {
    for (const code of [50013, 10003, 50034, 50001]) {
      const thrown = apiError(code);
      const { service } = harness({ slowmodeError: thrown });
      const error = await expectBloomError(
        service.setSlowmode({
          guildId: TEST_GUILD_ID,
          channelId: CHANNEL,
          seconds: 5,
          reason: 'noise',
        }),
      );
      expect(error.cause).toBe(thrown);
    }
  });

  it('rethrows a non-Discord error unchanged rather than mislabelling it', async () => {
    const thrown = new Error('socket hang up');
    const { service } = harness({ slowmodeError: thrown });
    const error = await rejection(
      service.setSlowmode({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        seconds: 5,
        reason: 'noise',
      }),
    );
    expect(error).toBe(thrown);
    expect(error).not.toBeInstanceOf(BloomError);
  });

  it('labels the action differently per operation, so operators can tell them apart', async () => {
    const slowmode = await expectBloomError(
      harness({ slowmodeError: apiError(50013) }).service.setSlowmode({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        seconds: 5,
        reason: 'noise',
      }),
    );
    const lock = await expectBloomError(
      harness({ editError: apiError(50013) }).service.setSendPermission({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        state: 'denied',
        reason: 'raid',
      }),
    );
    const purge = await expectBloomError(
      harness({ messageFetchError: apiError(50013) }).service.purgeMessages({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        limit: 5,
        reason: 'spam',
      }),
    );
    expect([slowmode.details, lock.details, purge.details]).toEqual([
      { action: 'slowmode', discord_code: 50013 },
      { action: 'lock', discord_code: 50013 },
      { action: 'purge', discord_code: 50013 },
    ]);
  });

  it('never leaks the raw Discord message to the user', async () => {
    const { service } = harness({
      slowmodeError: apiError(50001, 'Missing Access to internal-staff'),
    });
    const error = await expectBloomError(
      service.setSlowmode({
        guildId: TEST_GUILD_ID,
        channelId: CHANNEL,
        seconds: 5,
        reason: 'noise',
      }),
    );
    expect(error.userMessage).not.toContain('internal-staff');
  });
});
