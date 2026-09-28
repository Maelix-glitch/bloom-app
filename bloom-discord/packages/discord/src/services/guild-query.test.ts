import { Collection, DiscordAPIError, PermissionsBitField } from 'discord.js';
import type { Client } from 'discord.js';
import { describe, expect, it } from 'vitest';
import {
  BloomError,
  unsafeSnowflake,
  type ChannelId,
  type RoleId,
  type UserId,
} from '@bloom/shared-types';
import { DiscordPermission } from '@bloom/permissions';
import {
  GUARDIAN_TEST_PERMISSIONS,
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_ROLE_IDS,
  TEST_ROLE_POSITIONS,
  TEST_USER_IDS,
} from '@bloom/testing';
import { botHasPermission, DiscordGuildQueryService } from './guild-query.js';

/**
 * `DiscordGuildQueryService` — read-only guild access.
 *
 * What this service is *not* is as important as what it is:
 *
 *   - **No capability gate.** The other three adapters assert a capability in
 *     their constructor because they write. This one only reads, and every bot
 *     is allowed to read, so it takes nothing but a `Client`. The absence is
 *     deliberate, and a test below pins it so that adding a gate — or removing
 *     one from a sibling by copying this class — is a visible decision.
 *   - **No database or repository access.** It talks to discord.js and nothing
 *     else, so there are no repository arguments to verify and no persistence
 *     failures to translate.
 *   - **Almost no error translation.** Only an unreachable guild becomes a
 *     `BloomError`. Two Discord codes are deliberately reinterpreted as
 *     ordinary answers rather than failures — 10007 "Unknown Member" is how
 *     Discord says "that person is not here", and 10003 "Unknown Channel" is
 *     how it says "that id is stale". Everything else propagates untouched, by
 *     identity, so a transport fault is never disguised as a missing member.
 *     Tests assert both directions of that split.
 *
 * The cache-versus-fetch split is the other load-bearing behaviour. Roles and
 * channels arrive with GUILD_CREATE and are kept current by gateway events, so
 * the guild lookup prefers the cache; members are only cached once seen, so a
 * member lookup must be able to reach the API. Tests assert that a cache hit
 * issues no fetch, and that a cache miss still resolves.
 *
 * ## On the stub
 *
 * `@bloom/testing` provides `FakeGuild`, but that implements the
 * `GuildQueryService` *port* — it is the substitute for this class in feature
 * tests, so it cannot exercise it. Testing the adapter needs a discord.js
 * `Client`, which no shared fake supplies. The stub below models only the
 * surface this service touches, following `role-service.test.ts`,
 * `moderation-service.test.ts` and `channel-moderation-service.test.ts`.
 *
 * Where discord.js ships real logic the stub uses the real thing: role
 * collections are genuine `Collection`s and permissions genuine
 * `PermissionsBitField`s, so iteration order and bit semantics are Discord's
 * own rather than a reimplementation that might agree with a bug.
 */

const MEMBER = TEST_USER_IDS.member;
const CHANNEL = TEST_CHANNEL_IDS.support;
const GUILD_NAME = 'Bloom Labs';
const JOINED_AT = new Date('2026-02-03T09:15:00.000Z');

interface StubRole {
  readonly id: RoleId;
  readonly name: string;
  readonly position: number;
  readonly managed: boolean;
}

function role(
  key: keyof typeof TEST_ROLE_IDS,
  overrides: { readonly name?: string; readonly managed?: boolean } = {},
): StubRole {
  return {
    id: TEST_ROLE_IDS[key],
    name: overrides.name ?? key,
    position: TEST_ROLE_POSITIONS[key],
    managed: overrides.managed ?? false,
  };
}

interface Recorded {
  readonly cacheReads: string[];
  readonly guildFetches: string[];
  readonly memberFetches: string[];
  readonly fetchMeCalls: number[];
  readonly roleFetches: (string | undefined)[];
  readonly channelFetches: string[];
}

interface StubOptions {
  /** `false` removes the guild from the cache, forcing a fetch. */
  readonly guildCached?: boolean;
  /** `false` makes `client.guilds.fetch` reject — the bot is not in the guild. */
  readonly guildFetchable?: boolean;
  readonly guildName?: string;
  /** Who owns the guild. Defaults to somebody other than the member. */
  readonly ownerId?: UserId;
  /** Rejection from `guild.members.fetch`. */
  readonly memberError?: Error;
  readonly memberRoles?: readonly StubRole[];
  readonly joinedAt?: Date | null;
  readonly communicationDisabledUntil?: Date | null;
  readonly username?: string;
  /** Roles in the guild, for `roles.fetch()`. */
  readonly guildRoles?: readonly StubRole[];
  /** `false` makes `roles.fetch(id)` resolve to `null`. */
  readonly rolePresent?: boolean;
  /** `false` models `guild.members.me` being absent, forcing `fetchMe`. */
  readonly selfCached?: boolean;
  /** `null` models a client with no application yet. */
  readonly applicationId?: string | null;
  readonly selfPermissions?: bigint;
  readonly selfHighestRole?: StubRole;
  /** `false` makes `channels.fetch` resolve to `null`. */
  readonly channelPresent?: boolean;
  /** Rejection from `guild.channels.fetch`. */
  readonly channelError?: Error;
}

interface Stub {
  readonly client: Client;
  readonly recorded: Recorded;
}

function stubDiscord(options: StubOptions = {}): Stub {
  const recorded: Recorded = {
    cacheReads: [],
    guildFetches: [],
    memberFetches: [],
    fetchMeCalls: [],
    roleFetches: [],
    channelFetches: [],
  };

  const memberRoles = options.memberRoles ?? [role('bloomMember')];
  const highestMemberRole = [...memberRoles].sort((a, b) => b.position - a.position)[0];

  const memberRoleCache = new Collection<string, StubRole>();
  for (const entry of memberRoles) memberRoleCache.set(entry.id, entry);

  const member = {
    id: MEMBER,
    user: { username: options.username ?? 'bloomer' },
    roles: {
      cache: memberRoleCache,
      highest: highestMemberRole ?? role('bloomMember'),
    },
    joinedAt: options.joinedAt === undefined ? JOINED_AT : options.joinedAt,
    communicationDisabledUntil: options.communicationDisabledUntil ?? null,
  };

  const selfRole =
    options.selfHighestRole ?? role('bloomBot', { name: '\u25c9 Bloom Bot' });
  const self = {
    id: TEST_USER_IDS.bot,
    roles: { highest: selfRole },
    permissions: new PermissionsBitField(
      options.selfPermissions ?? GUARDIAN_TEST_PERMISSIONS,
    ),
  };

  const guildRoleCollection = new Collection<string, StubRole>();
  for (const entry of options.guildRoles ?? []) guildRoleCollection.set(entry.id, entry);

  const guild = {
    name: options.guildName ?? GUILD_NAME,
    ownerId: options.ownerId ?? TEST_USER_IDS.founder,
    members: {
      me: options.selfCached === false ? null : self,
      fetch: (userId: string): Promise<typeof member> => {
        recorded.memberFetches.push(userId);
        return options.memberError
          ? Promise.reject(options.memberError)
          : Promise.resolve(member);
      },
      fetchMe: (): Promise<typeof self> => {
        recorded.fetchMeCalls.push(1);
        return Promise.resolve(self);
      },
    },
    roles: {
      fetch: (
        roleId?: string,
      ): Promise<Collection<string, StubRole> | StubRole | null> => {
        recorded.roleFetches.push(roleId);
        if (roleId === undefined) return Promise.resolve(guildRoleCollection);
        if (options.rolePresent === false) return Promise.resolve(null);
        return Promise.resolve(guildRoleCollection.get(roleId) ?? role('bloomMember'));
      },
    },
    channels: {
      fetch: (channelId: string): Promise<{ readonly id: string } | null> => {
        recorded.channelFetches.push(channelId);
        if (options.channelError) return Promise.reject(options.channelError);
        return Promise.resolve(
          options.channelPresent === false ? null : { id: channelId },
        );
      },
    },
  };

  const application =
    options.applicationId === null ? null : { id: options.applicationId ?? 'app-1' };

  const client = {
    application,
    guilds: {
      cache: {
        get: (id: string): typeof guild | undefined => {
          recorded.cacheReads.push(id);
          return options.guildCached === false ? undefined : guild;
        },
      },
      fetch: (id: string): Promise<typeof guild> => {
        recorded.guildFetches.push(id);
        return options.guildFetchable === false
          ? Promise.reject(new Error('Unknown Guild'))
          : Promise.resolve(guild);
      },
    },
  };

  return { client: client as unknown as Client, recorded };
}

interface Harness {
  readonly service: DiscordGuildQueryService;
  readonly recorded: Recorded;
}

function harness(options: StubOptions = {}): Harness {
  const { client, recorded } = stubDiscord(options);
  return { service: new DiscordGuildQueryService(client), recorded };
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
  return new DiscordAPIError({ code, message }, code, 404, 'GET', '', {});
}

/** Every public method, so guild resolution can be asserted uniformly. */
function callEach(
  service: DiscordGuildQueryService,
): readonly (readonly [string, () => Promise<unknown>])[] {
  return [
    ['getGuildName', (): Promise<unknown> => service.getGuildName(TEST_GUILD_ID)],
    ['getMember', (): Promise<unknown> => service.getMember(TEST_GUILD_ID, MEMBER)],
    ['getRoles', (): Promise<unknown> => service.getRoles(TEST_GUILD_ID)],
    [
      'getRole',
      (): Promise<unknown> => service.getRole(TEST_GUILD_ID, TEST_ROLE_IDS.bloomMember),
    ],
    ['getSelf', (): Promise<unknown> => service.getSelf(TEST_GUILD_ID)],
    [
      'channelExists',
      (): Promise<unknown> => service.channelExists(TEST_GUILD_ID, CHANNEL),
    ],
  ];
}

describe('DiscordGuildQueryService — construction', () => {
  /*
   * Deliberate contrast with the three writing adapters, each of which asserts a
   * capability here. Reading guild state is allowed for every bot, so this
   * constructor takes only a client and gates nothing.
   */
  it('needs only a client, because reading is ungated', () => {
    const { client } = stubDiscord();
    expect(() => new DiscordGuildQueryService(client)).not.toThrow();
  });

  it('performs no Discord I/O until a method is called', () => {
    const { client, recorded } = stubDiscord();
    new DiscordGuildQueryService(client);
    expect(recorded.cacheReads).toHaveLength(0);
    expect(recorded.guildFetches).toHaveLength(0);
  });
});

describe('DiscordGuildQueryService — guild resolution', () => {
  it.each(callEach(harness().service))('%s serves a cached guild', async (_n, call) => {
    await expect(call()).resolves.not.toThrow();
  });

  it.each(callEach(harness({ guildCached: false }).service))(
    '%s falls back to a fetch when the guild is not cached',
    async (_n, call) => {
      await expect(call()).resolves.not.toThrow();
    },
  );

  it.each(callEach(harness({ guildCached: false, guildFetchable: false }).service))(
    '%s reports GUILD_MISMATCH when the guild cannot be reached',
    async (_n, call) => {
      const error = await expectBloomError(call());
      expect(error.code).toBe('GUILD_MISMATCH');
    },
  );

  it('prefers the cache and issues no fetch when the guild is cached', async () => {
    const { service, recorded } = harness();
    await service.getGuildName(TEST_GUILD_ID);
    expect(recorded.cacheReads).toEqual([TEST_GUILD_ID]);
    expect(recorded.guildFetches).toHaveLength(0);
  });

  it('fetches exactly once when the cache misses', async () => {
    const { service, recorded } = harness({ guildCached: false });
    await service.getGuildName(TEST_GUILD_ID);
    expect(recorded.guildFetches).toEqual([TEST_GUILD_ID]);
  });

  it('gives an operator hint that names the env var and how to check the id', async () => {
    const { service } = harness({ guildCached: false, guildFetchable: false });
    const error = await expectBloomError(service.getGuildName(TEST_GUILD_ID));
    expect(error.operatorHint).toContain(TEST_GUILD_ID);
    expect(error.operatorHint).toContain('DISCORD_GUILD_ID');
    expect(error.operatorHint).toContain('Developer Mode');
    expect(error.details).toMatchObject({ guild_id: TEST_GUILD_ID });
  });

  it('translates the unreachable guild rather than leaking the discord.js error', async () => {
    const { service } = harness({ guildCached: false, guildFetchable: false });
    const error = await rejection(service.getGuildName(TEST_GUILD_ID));
    expect(error).toBeInstanceOf(BloomError);
    expect((error as Error).message).not.toBe('Unknown Guild');
  });
});

describe('DiscordGuildQueryService — getGuildName', () => {
  it('returns the guild name', async () => {
    const { service } = harness({ guildName: 'Bloom Labs' });
    await expect(service.getGuildName(TEST_GUILD_ID)).resolves.toBe('Bloom Labs');
  });

  it('returns names verbatim, without trimming or sanitising', async () => {
    const { service } = harness({ guildName: '  \u2728 Bloom  ' });
    await expect(service.getGuildName(TEST_GUILD_ID)).resolves.toBe('  \u2728 Bloom  ');
  });
});

describe('DiscordGuildQueryService — getMember', () => {
  it('maps a member onto the snapshot the ports declare', async () => {
    const { service } = harness({
      username: 'rosie',
      memberRoles: [role('bloomMember'), role('betaTester')],
    });
    const snapshot = await service.getMember(TEST_GUILD_ID, MEMBER);
    expect(snapshot).toEqual({
      userId: MEMBER,
      username: 'rosie',
      roleIds: [TEST_ROLE_IDS.bloomMember, TEST_ROLE_IDS.betaTester],
      highestRolePosition: TEST_ROLE_POSITIONS.betaTester,
      joinedAt: JOINED_AT,
      isGuildOwner: false,
      communicationDisabledUntil: null,
    });
  });

  it('asks Discord for the member it was given', async () => {
    const { service, recorded } = harness();
    await service.getMember(TEST_GUILD_ID, MEMBER);
    expect(recorded.memberFetches).toEqual([MEMBER]);
  });

  it('reports the highest role position, not the first', async () => {
    const { service } = harness({
      memberRoles: [role('bloomMember'), role('moderator'), role('earlyBloom')],
    });
    const snapshot = await service.getMember(TEST_GUILD_ID, MEMBER);
    expect(snapshot?.highestRolePosition).toBe(TEST_ROLE_POSITIONS.moderator);
  });

  it('returns an empty role list for a member holding no roles', async () => {
    const { service } = harness({ memberRoles: [] });
    const snapshot = await service.getMember(TEST_GUILD_ID, MEMBER);
    expect(snapshot?.roleIds).toEqual([]);
  });

  it('flags the guild owner', async () => {
    const { service } = harness({ ownerId: MEMBER });
    const snapshot = await service.getMember(TEST_GUILD_ID, MEMBER);
    expect(snapshot?.isGuildOwner).toBe(true);
  });

  it('does not flag an ordinary member as owner', async () => {
    const { service } = harness({ ownerId: TEST_USER_IDS.founder });
    const snapshot = await service.getMember(TEST_GUILD_ID, MEMBER);
    expect(snapshot?.isGuildOwner).toBe(false);
  });

  it('passes through a null joinedAt rather than inventing a date', async () => {
    const { service } = harness({ joinedAt: null });
    const snapshot = await service.getMember(TEST_GUILD_ID, MEMBER);
    expect(snapshot?.joinedAt).toBeNull();
  });

  it('reports an active timeout expiry', async () => {
    const until = new Date('2026-03-01T00:00:00.000Z');
    const { service } = harness({ communicationDisabledUntil: until });
    const snapshot = await service.getMember(TEST_GUILD_ID, MEMBER);
    expect(snapshot?.communicationDisabledUntil).toBe(until);
  });

  it('reports null when the member is not timed out', async () => {
    const { service } = harness({ communicationDisabledUntil: null });
    const snapshot = await service.getMember(TEST_GUILD_ID, MEMBER);
    expect(snapshot?.communicationDisabledUntil).toBeNull();
  });

  it('treats Discord 10007 as "not a member", not as a failure', async () => {
    const { service } = harness({ memberError: apiError(10007, 'Unknown Member') });
    await expect(service.getMember(TEST_GUILD_ID, MEMBER)).resolves.toBeNull();
  });

  it.each([10013, 50001, 50013, 500])(
    'propagates Discord %i untouched rather than reporting absence',
    async (code) => {
      const thrown = apiError(code);
      const { service } = harness({ memberError: thrown });
      const error = await rejection(service.getMember(TEST_GUILD_ID, MEMBER));
      expect(error).toBe(thrown);
    },
  );

  it('propagates a transport error untouched, so an outage is never read as absence', async () => {
    const thrown = new Error('socket hang up');
    const { service } = harness({ memberError: thrown });
    const error = await rejection(service.getMember(TEST_GUILD_ID, MEMBER));
    expect(error).toBe(thrown);
    expect(error).not.toBeInstanceOf(BloomError);
  });

  it('does not convert a plain error carrying the number 10007 into null', async () => {
    const thrown = Object.assign(new Error('Unknown Member'), { code: 10007 });
    const { service } = harness({ memberError: thrown });
    const error = await rejection(service.getMember(TEST_GUILD_ID, MEMBER));
    expect(error).toBe(thrown);
  });
});

describe('DiscordGuildQueryService — getRoles', () => {
  it('returns every role as a snapshot keyed by id', async () => {
    const { service } = harness({
      guildRoles: [role('founder'), role('bloomBot'), role('bloomMember')],
    });
    const roles = await service.getRoles(TEST_GUILD_ID);
    expect([...roles.keys()]).toEqual([
      TEST_ROLE_IDS.founder,
      TEST_ROLE_IDS.bloomBot,
      TEST_ROLE_IDS.bloomMember,
    ]);
  });

  it('carries name, position and managed onto each snapshot', async () => {
    const { service } = harness({
      guildRoles: [role('bloomBot', { name: '\u25c9 Bloom Bot', managed: true })],
    });
    const roles = await service.getRoles(TEST_GUILD_ID);
    expect(roles.get(TEST_ROLE_IDS.bloomBot)).toEqual({
      id: TEST_ROLE_IDS.bloomBot,
      name: '\u25c9 Bloom Bot',
      position: TEST_ROLE_POSITIONS.bloomBot,
      managed: true,
    });
  });

  it('returns an empty map for a guild with no roles', async () => {
    const { service } = harness({ guildRoles: [] });
    const roles = await service.getRoles(TEST_GUILD_ID);
    expect(roles.size).toBe(0);
  });

  it('fetches the whole role list rather than a single role', async () => {
    const { service, recorded } = harness({ guildRoles: [role('founder')] });
    await service.getRoles(TEST_GUILD_ID);
    expect(recorded.roleFetches).toEqual([undefined]);
  });

  it('preserves managed=false for ordinary roles', async () => {
    const { service } = harness({ guildRoles: [role('moderator')] });
    const roles = await service.getRoles(TEST_GUILD_ID);
    expect(roles.get(TEST_ROLE_IDS.moderator)?.managed).toBe(false);
  });

  it('keeps positions intact, since hierarchy checks depend on them', async () => {
    const { service } = harness({
      guildRoles: [role('founder'), role('bloomBot'), role('earlyBloom')],
    });
    const roles = await service.getRoles(TEST_GUILD_ID);
    expect([...roles.values()].map((entry) => entry.position)).toEqual([
      TEST_ROLE_POSITIONS.founder,
      TEST_ROLE_POSITIONS.bloomBot,
      TEST_ROLE_POSITIONS.earlyBloom,
    ]);
  });
});

describe('DiscordGuildQueryService — getRole', () => {
  it('returns a snapshot for a role that exists', async () => {
    const { service } = harness({
      guildRoles: [role('moderator', { name: '\u27e1 Moderator' })],
    });
    const snapshot = await service.getRole(TEST_GUILD_ID, TEST_ROLE_IDS.moderator);
    expect(snapshot).toEqual({
      id: TEST_ROLE_IDS.moderator,
      name: '\u27e1 Moderator',
      position: TEST_ROLE_POSITIONS.moderator,
      managed: false,
    });
  });

  it('returns null for a role that does not exist', async () => {
    const { service } = harness({ rolePresent: false });
    await expect(
      service.getRole(TEST_GUILD_ID, TEST_ROLE_IDS.moderator),
    ).resolves.toBeNull();
  });

  it('asks Discord for the role it was given', async () => {
    const { service, recorded } = harness({ guildRoles: [role('moderator')] });
    await service.getRole(TEST_GUILD_ID, TEST_ROLE_IDS.moderator);
    expect(recorded.roleFetches).toEqual([TEST_ROLE_IDS.moderator]);
  });

  it('reports a managed integration role as managed', async () => {
    const { service } = harness({
      guildRoles: [role('bloomBot', { managed: true })],
    });
    const snapshot = await service.getRole(TEST_GUILD_ID, TEST_ROLE_IDS.bloomBot);
    expect(snapshot?.managed).toBe(true);
  });

  it('distinguishes a missing role from a role with falsy-looking fields', async () => {
    const { service } = harness({
      guildRoles: [
        { id: TEST_ROLE_IDS.bloomMember, name: '', position: 0, managed: false },
      ],
    });
    const snapshot = await service.getRole(TEST_GUILD_ID, TEST_ROLE_IDS.bloomMember);
    expect(snapshot).not.toBeNull();
    expect(snapshot).toMatchObject({ name: '', position: 0 });
  });
});

describe('DiscordGuildQueryService — getSelf', () => {
  it('describes the bot from the cached member', async () => {
    const { service } = harness();
    const self = await service.getSelf(TEST_GUILD_ID);
    expect(self).toEqual({
      userId: TEST_USER_IDS.bot,
      applicationId: 'app-1',
      highestRolePosition: TEST_ROLE_POSITIONS.bloomBot,
      highestRoleName: '\u25c9 Bloom Bot',
      permissions: GUARDIAN_TEST_PERMISSIONS,
    });
  });

  it('uses the cached self without calling fetchMe', async () => {
    const { service, recorded } = harness();
    await service.getSelf(TEST_GUILD_ID);
    expect(recorded.fetchMeCalls).toHaveLength(0);
  });

  it('fetches itself when not yet cached, which happens before the guild populates', async () => {
    const { service, recorded } = harness({ selfCached: false });
    const self = await service.getSelf(TEST_GUILD_ID);
    expect(recorded.fetchMeCalls).toHaveLength(1);
    expect(self.userId).toBe(TEST_USER_IDS.bot);
  });

  it('prefers the application id when the client has one', async () => {
    const { service } = harness({ applicationId: '123456789012345678' });
    const self = await service.getSelf(TEST_GUILD_ID);
    expect(self.applicationId).toBe('123456789012345678');
  });

  it('falls back to the bot user id when the client has no application', async () => {
    const { service } = harness({ applicationId: null });
    const self = await service.getSelf(TEST_GUILD_ID);
    expect(self.applicationId).toBe(TEST_USER_IDS.bot);
  });

  it('reports the raw permission bitfield hierarchy checks depend on', async () => {
    const { service } = harness({
      selfPermissions: DiscordPermission.ManageRoles | DiscordPermission.KickMembers,
    });
    const self = await service.getSelf(TEST_GUILD_ID);
    expect(self.permissions).toBe(
      DiscordPermission.ManageRoles | DiscordPermission.KickMembers,
    );
  });

  it('reports an empty bitfield honestly rather than substituting a default', async () => {
    const { service } = harness({ selfPermissions: 0n });
    const self = await service.getSelf(TEST_GUILD_ID);
    expect(self.permissions).toBe(0n);
  });

  it('names the highest role, so an admin error can say where to drag it', async () => {
    const { service } = harness({
      selfHighestRole: role('bloomBot', { name: '\u25c9 Bloom Bot' }),
    });
    const self = await service.getSelf(TEST_GUILD_ID);
    expect(self.highestRoleName).toBe('\u25c9 Bloom Bot');
    expect(self.highestRolePosition).toBe(TEST_ROLE_POSITIONS.bloomBot);
  });
});

describe('DiscordGuildQueryService — channelExists', () => {
  it('returns true when the channel resolves', async () => {
    const { service } = harness();
    await expect(service.channelExists(TEST_GUILD_ID, CHANNEL)).resolves.toBe(true);
  });

  it('returns false when the fetch resolves to null', async () => {
    const { service } = harness({ channelPresent: false });
    await expect(service.channelExists(TEST_GUILD_ID, CHANNEL)).resolves.toBe(false);
  });

  it('treats Discord 10003 as a stale id, not a failure', async () => {
    const { service } = harness({ channelError: apiError(10003, 'Unknown Channel') });
    await expect(service.channelExists(TEST_GUILD_ID, CHANNEL)).resolves.toBe(false);
  });

  it('asks Discord for the channel it was given', async () => {
    const { service, recorded } = harness();
    await service.channelExists(TEST_GUILD_ID, CHANNEL);
    expect(recorded.channelFetches).toEqual([CHANNEL]);
  });

  it.each([10007, 50001, 50013, 500])(
    'propagates Discord %i rather than answering false',
    async (code) => {
      const thrown = apiError(code);
      const { service } = harness({ channelError: thrown });
      const error = await rejection(service.channelExists(TEST_GUILD_ID, CHANNEL));
      expect(error).toBe(thrown);
    },
  );

  it('propagates a transport error, so an outage never looks like a deleted channel', async () => {
    const thrown = new Error('ECONNRESET');
    const { service } = harness({ channelError: thrown });
    const error = await rejection(service.channelExists(TEST_GUILD_ID, CHANNEL));
    expect(error).toBe(thrown);
  });

  it('does not convert a plain error carrying the number 10003 into false', async () => {
    const thrown = Object.assign(new Error('Unknown Channel'), { code: 10003 });
    const { service } = harness({ channelError: thrown });
    const error = await rejection(service.channelExists(TEST_GUILD_ID, CHANNEL));
    expect(error).toBe(thrown);
  });

  it('answers for an id that was never configured without throwing', async () => {
    const stray = unsafeSnowflake<ChannelId>('900000000000009999');
    const { service } = harness({ channelPresent: false });
    await expect(service.channelExists(TEST_GUILD_ID, stray)).resolves.toBe(false);
  });
});

describe('botHasPermission', () => {
  it('confirms a permission the bot holds', () => {
    expect(
      botHasPermission(GUARDIAN_TEST_PERMISSIONS, DiscordPermission.ManageRoles),
    ).toBe(true);
  });

  it('denies a permission the bot does not hold', () => {
    expect(
      botHasPermission(GUARDIAN_TEST_PERMISSIONS, DiscordPermission.ManageGuild),
    ).toBe(false);
  });

  it('requires every bit when several are asked for at once', () => {
    expect(
      botHasPermission(
        DiscordPermission.ManageRoles | DiscordPermission.BanMembers,
        DiscordPermission.ManageRoles | DiscordPermission.BanMembers,
      ),
    ).toBe(true);
  });

  it('denies when only some of the requested bits are held', () => {
    expect(
      botHasPermission(
        DiscordPermission.ManageRoles,
        DiscordPermission.ManageRoles | DiscordPermission.ManageGuild,
      ),
    ).toBe(false);
  });

  it('denies everything for an empty bitfield', () => {
    expect(botHasPermission(0n, DiscordPermission.ViewChannel)).toBe(false);
  });

  it('treats an empty requirement as satisfied', () => {
    expect(botHasPermission(0n, 0n)).toBe(true);
  });

  /*
   * discord.js's `PermissionsBitField.has` defaults `checkAdmin` to true, so an
   * Administrator bitfield satisfies every requirement without holding the bit
   * asked for. That is Discord's real semantics and the right answer for a
   * "can this call succeed?" check.
   *
   * It is worth pinning because the brief forbids granting Administrator: a
   * preflight built on this helper would report every permission as present for
   * an over-permissioned bot, and so would never be the thing that catches the
   * mis-grant. Detecting Administrator needs an explicit test for the bit, not
   * this function.
   */
  it('reports every permission as held when the bot has Administrator', () => {
    expect(
      botHasPermission(DiscordPermission.Administrator, DiscordPermission.ManageGuild),
    ).toBe(true);
    expect(
      botHasPermission(DiscordPermission.Administrator, DiscordPermission.ManageRoles),
    ).toBe(true);
  });

  it('does not report Administrator as held merely because other bits are', () => {
    expect(
      botHasPermission(GUARDIAN_TEST_PERMISSIONS, DiscordPermission.Administrator),
    ).toBe(false);
  });

  it('agrees with the bot snapshot getSelf produces', async () => {
    const { service } = harness();
    const self = await service.getSelf(TEST_GUILD_ID);
    expect(botHasPermission(self.permissions, DiscordPermission.ManageRoles)).toBe(true);
    expect(botHasPermission(self.permissions, DiscordPermission.ManageGuild)).toBe(false);
  });

  it('reads high bits correctly, where bigint handling usually breaks', () => {
    expect(
      botHasPermission(
        DiscordPermission.ModerateMembers,
        DiscordPermission.ModerateMembers,
      ),
    ).toBe(true);
    expect(
      botHasPermission(DiscordPermission.ManageRoles, DiscordPermission.ModerateMembers),
    ).toBe(false);
  });
});
