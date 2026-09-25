import {
  CHANNEL_KEYS,
  ROLE_KEYS,
  unsafeSnowflake,
  type ChannelId,
  type ChannelKey,
  type GuildId,
  type RoleId,
  type RoleKey,
  type UserId,
} from '@bloom/shared-types';
import type { ChannelIdMap, PlatformConfig, RoleIdMap } from '@bloom/config';
import type { AuthorizationSubject } from '@bloom/permissions';

/**
 * Deterministic fixtures.
 *
 * Ids are fixed strings rather than random ones so a failing assertion prints
 * something recognisable, and so two runs of the same test are byte-identical.
 * They are still valid snowflakes (17–20 digits), because the validation layer
 * will reject anything else and a fixture that cannot pass validation is not a
 * useful fixture.
 */

export const TEST_GUILD_ID = unsafeSnowflake<GuildId>('900000000000000001');

export const TEST_USER_IDS = {
  founder: unsafeSnowflake<UserId>('900000000000001001'),
  administrator: unsafeSnowflake<UserId>('900000000000001002'),
  moderator: unsafeSnowflake<UserId>('900000000000001003'),
  betaTester: unsafeSnowflake<UserId>('900000000000001004'),
  member: unsafeSnowflake<UserId>('900000000000001005'),
  newcomer: unsafeSnowflake<UserId>('900000000000001006'),
  bot: unsafeSnowflake<UserId>('900000000000001999'),
} as const;

/**
 * Role ids and the positions they sit at.
 *
 * The ordering mirrors the documented hierarchy, with the bot above the two
 * roles it manages and below every staff role — which is what makes hierarchy
 * tests meaningful rather than tautological.
 */
export const TEST_ROLE_POSITIONS: Readonly<Record<RoleKey, number>> = {
  founder: 70,
  administrator: 60,
  moderator: 50,
  bloomBot: 40,
  betaTester: 30,
  earlyBloom: 20,
  bloomMember: 10,
};

export const TEST_ROLE_IDS: Readonly<Record<RoleKey, RoleId>> = Object.fromEntries(
  ROLE_KEYS.map((key, index) => [
    key,
    unsafeSnowflake<RoleId>(`90000000000002${String(index).padStart(4, '0')}`),
  ]),
) as Readonly<Record<RoleKey, RoleId>>;

export const TEST_CHANNEL_IDS: Readonly<Record<ChannelKey, ChannelId>> =
  Object.fromEntries(
    CHANNEL_KEYS.map((key, index) => [
      key,
      unsafeSnowflake<ChannelId>(`90000000000003${String(index).padStart(4, '0')}`),
    ]),
  ) as Readonly<Record<ChannelKey, ChannelId>>;

function allRoles(): RoleIdMap {
  return Object.fromEntries(
    ROLE_KEYS.map((key) => [key, TEST_ROLE_IDS[key]]),
  ) as RoleIdMap;
}

function allChannels(): ChannelIdMap {
  return Object.fromEntries(
    CHANNEL_KEYS.map((key) => [key, TEST_CHANNEL_IDS[key]]),
  ) as ChannelIdMap;
}

/**
 * A fully configured platform config.
 *
 * Deep-merging overrides would hide mistakes, so this takes a shallow override
 * per section: a test that wants one role unset says so explicitly.
 */
export function testConfig(overrides: Partial<PlatformConfig> = {}): PlatformConfig {
  return {
    runtime: {
      nodeEnv: 'test',
      environment: 'development',
      version: '0.0.0-test',
      // Not UTC: a fixture in UTC makes "forgot to apply the configured zone"
      // bugs invisible, because the wrong answer and the right one agree.
      timezone: 'Europe/London',
    },
    logging: { level: 'trace', pretty: false },
    database: {
      url: 'postgresql://bloom:not-a-real-password@localhost:5432/bloom_test',
      schema: 'bloom_discord',
      maxConnections: 1,
      idleTimeoutSeconds: 30,
      connectTimeoutSeconds: 10,
    },
    discord: { guildId: TEST_GUILD_ID, registrationScope: 'guild' },
    roles: allRoles(),
    channels: allChannels(),
    features: {
      scheduledMessages: false,
      rewards: true,
      githubIntegration: false,
      aiIntegration: false,
    },
    bots: {
      guardian: { token: 'test-guardian-token', clientId: '900000000000009001' },
      companion: { token: 'test-companion-token', clientId: '900000000000009002' },
      labs: { token: 'test-labs-token', clientId: '900000000000009003' },
    },
    ...overrides,
  };
}

export interface SubjectOptions {
  readonly userId?: UserId;
  readonly roles?: readonly RoleKey[];
  readonly permissions?: bigint;
  readonly isGuildOwner?: boolean;
  readonly extraRoleIds?: readonly RoleId[];
}

/**
 * Build an authorization subject.
 *
 * `highestRolePosition` is derived from the roles given rather than passed in,
 * so a test cannot accidentally construct a subject whose claimed position
 * contradicts its roles — which is precisely the inconsistency the production
 * code is designed to be safe against.
 */
export function testSubject(options: SubjectOptions = {}): AuthorizationSubject {
  const roleKeys = options.roles ?? [];
  const roleIds = [
    ...roleKeys.map((key) => TEST_ROLE_IDS[key]),
    ...(options.extraRoleIds ?? []),
  ];

  const highest = roleKeys.reduce(
    (max, key) => Math.max(max, TEST_ROLE_POSITIONS[key]),
    0, // @everyone
  );

  return {
    userId: options.userId ?? TEST_USER_IDS.member,
    guildId: TEST_GUILD_ID,
    roleIds,
    permissions: options.permissions ?? 0n,
    isGuildOwner: options.isGuildOwner ?? false,
    highestRolePosition: highest,
  };
}
