import { beforeEach, describe, expect, it } from 'vitest';
import { BloomError, type CorrelationId, type UserId } from '@bloom/shared-types';
import type { PlatformConfig } from '@bloom/config';
import {
  createTestLogger,
  fakeRepositories,
  FakeGuild,
  FakeMessaging,
  FakeRoleService,
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_ROLE_IDS,
  TEST_ROLE_POSITIONS,
  TEST_USER_IDS,
  testConfig,
  type FakeRepositories,
} from '@bloom/testing';
import { OnboardingService } from './service.js';

/**
 * The onboarding lifecycle.
 *
 * Everything here runs against the in-memory guild and repositories, so the
 * whole file executes in milliseconds and exercises the real service — the
 * transition table, the ordering guarantee, the hierarchy failure path and the
 * idempotency claim are all the production code paths.
 */

const CORRELATION = 'test-correlation' as CorrelationId;

interface Harness {
  readonly service: OnboardingService;
  readonly repositories: FakeRepositories;
  readonly guild: FakeGuild;
  readonly roles: FakeRoleService;
  readonly messaging: FakeMessaging;
  readonly logs: ReturnType<typeof createTestLogger>;
}

function harness(overrides: { readonly config?: PlatformConfig } = {}): Harness {
  const guild = new FakeGuild().withStandardRoles();
  guild.withChannels(TEST_CHANNEL_IDS.welcome);

  const roles = new FakeRoleService(guild);
  const messaging = new FakeMessaging(guild);
  const repositories = fakeRepositories();
  const logs = createTestLogger();

  const service = new OnboardingService({
    config: overrides.config ?? testConfig(),
    repositories,
    roles,
    messaging,
    guilds: guild,
    logger: logs.logger,
  });

  return { service, repositories, guild, roles, messaging, logs };
}

/** Put a member in the fake guild and in the database, as a join would. */
async function seed(h: Harness, userId: UserId = TEST_USER_IDS.newcomer): Promise<void> {
  h.guild.withMember(userId);
  await h.repositories.identity.ensureMember({
    guildId: TEST_GUILD_ID,
    userId,
    username: 'newcomer',
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('OnboardingService.verify', () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it('moves an unverified member to early_bloom and grants the role', async () => {
    await seed(h);

    const result = await h.service.verify({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      correlationId: CORRELATION,
    });

    expect(result).toEqual({ kind: 'verified', roleApplied: true });

    const member = await h.repositories.identity.findMember(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
    );
    expect(member?.onboardingState).toBe('early_bloom');
    expect(member?.verifiedAt).toBeInstanceOf(Date);

    expect(h.roles.changes).toEqual([
      {
        action: 'add',
        userId: TEST_USER_IDS.newcomer,
        roleId: TEST_ROLE_IDS.earlyBloom,
        reason: 'Verified via /verify',
      },
    ]);
  });

  it('writes an audit event and a history row', async () => {
    await seed(h);
    await h.service.verify({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      correlationId: CORRELATION,
    });

    expect(h.repositories.audit.has('onboarding.verified')).toBe(true);
    expect(h.repositories.audit.find('onboarding.verified')?.targetId).toBe(
      TEST_USER_IDS.newcomer,
    );

    const history = await h.repositories.onboarding.listTransitions(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
    );
    expect(history).toHaveLength(1);
    expect(history[0]?.toState).toBe('early_bloom');
    expect(history[0]?.trigger).toBe('self_verify');
  });

  it('is idempotent — a second call grants no second role', async () => {
    await seed(h);

    await h.service.verify({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      correlationId: CORRELATION,
    });
    const second = await h.service.verify({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      correlationId: CORRELATION,
    });

    expect(second.kind).toBe('already');
    expect(h.roles.changes).toHaveLength(1);
    expect(
      await h.repositories.onboarding.listTransitions(
        TEST_GUILD_ID,
        TEST_USER_IDS.newcomer,
      ),
    ).toHaveLength(1);
  });

  it('refuses a revoked member without explaining why', async () => {
    await seed(h);
    h.repositories.identity.setState(TEST_GUILD_ID, TEST_USER_IDS.newcomer, 'revoked');

    const result = await h.service.verify({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      correlationId: CORRELATION,
    });

    expect(result).toEqual({ kind: 'revoked' });
    // Still revoked, and no role was granted.
    expect(
      (await h.repositories.identity.findMember(TEST_GUILD_ID, TEST_USER_IDS.newcomer))
        ?.onboardingState,
    ).toBe('revoked');
    expect(h.roles.changes).toHaveLength(0);
  });

  it('reports the existing state when already onboarded', async () => {
    await seed(h);
    h.repositories.identity.setState(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
      'bloom_member',
    );

    const result = await h.service.verify({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      correlationId: CORRELATION,
    });

    expect(result).toEqual({ kind: 'already', state: 'bloom_member' });
  });

  it('records every attempt, including the refused ones', async () => {
    await seed(h);
    h.repositories.identity.setState(TEST_GUILD_ID, TEST_USER_IDS.newcomer, 'revoked');

    await h.service.verify({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      correlationId: CORRELATION,
    });

    expect(h.repositories.onboarding.attempts).toHaveLength(1);
    expect(h.repositories.onboarding.attempts[0]?.outcome).toBe('UNAUTHORIZED');
  });

  it('backfills a membership record when the member joined while Guardian was down', async () => {
    // In the guild, but never recorded — exactly what a deploy window produces.
    h.guild.withMember(TEST_USER_IDS.newcomer);

    const result = await h.service.verify({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      correlationId: CORRELATION,
    });

    expect(result).toEqual({ kind: 'verified', roleApplied: true });
    expect(
      (await h.repositories.identity.findMember(TEST_GUILD_ID, TEST_USER_IDS.newcomer))
        ?.onboardingState,
    ).toBe('early_bloom');
  });

  /**
   * The ordering guarantee, stated as a test.
   *
   * The bot role is moved below ✧ Early Bloom, so the grant is refused. The
   * member must still end up verified in the database: an unaudited role is a
   * worse outcome than a role that has not landed yet.
   */
  it('keeps the member verified when the role grant is blocked by hierarchy', async () => {
    await seed(h);
    h.guild.withBotAtPosition(TEST_ROLE_POSITIONS.earlyBloom - 1);

    const result = await h.service.verify({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      correlationId: CORRELATION,
    });

    expect(result).toEqual({ kind: 'verified', roleApplied: false });
    expect(
      (await h.repositories.identity.findMember(TEST_GUILD_ID, TEST_USER_IDS.newcomer))
        ?.onboardingState,
    ).toBe('early_bloom');
    expect(h.roles.changes).toHaveLength(0);

    // And it is loud about it, naming the fix.
    const failure = h.logs.sink.find('onboarding.role_failed');
    expect(failure).toBeDefined();
    expect(failure?.error_code).toBe('ROLE_HIERARCHY_BLOCKED');
  });

  it('records the verification even when no role id is configured', async () => {
    const config = testConfig();
    const h2 = harness({
      config: { ...config, roles: { ...config.roles, earlyBloom: null } },
    });
    await seed(h2);

    const result = await h2.service.verify({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      correlationId: CORRELATION,
    });

    expect(result).toEqual({ kind: 'verified', roleApplied: false });
    expect(h2.logs.sink.find('onboarding.role_unconfigured')).toBeDefined();
  });
});

describe('OnboardingService.completeOnboarding', () => {
  let h: Harness;
  beforeEach(async () => {
    h = harness();
    await seed(h);
  });

  it('swaps Early Bloom for Bloom Member', async () => {
    await h.service.verify({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      correlationId: CORRELATION,
    });
    h.roles.changes.length = 0;

    await h.service.completeOnboarding({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      actorId: TEST_USER_IDS.moderator,
      correlationId: CORRELATION,
    });

    const member = await h.repositories.identity.findMember(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
    );
    expect(member?.onboardingState).toBe('bloom_member');
    expect(member?.onboardingCompletedAt).toBeInstanceOf(Date);

    // Granted first, then removed — never the other way around.
    expect(h.roles.changes.map((c) => [c.action, c.roleId])).toEqual([
      ['add', TEST_ROLE_IDS.bloomMember],
      ['remove', TEST_ROLE_IDS.earlyBloom],
    ]);
  });

  it('refuses a member who has not verified', async () => {
    await expect(
      h.service.completeOnboarding({
        guildId: TEST_GUILD_ID,
        userId: TEST_USER_IDS.newcomer,
        actorId: TEST_USER_IDS.moderator,
        correlationId: CORRELATION,
      }),
    ).rejects.toSatisfy((e: unknown) => BloomError.isCode(e, 'INVALID_INPUT'));

    expect(h.roles.changes).toHaveLength(0);
  });

  it('refuses a member who is already a Bloom Member', async () => {
    h.repositories.identity.setState(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
      'bloom_member',
    );

    await expect(
      h.service.completeOnboarding({
        guildId: TEST_GUILD_ID,
        userId: TEST_USER_IDS.newcomer,
        actorId: TEST_USER_IDS.moderator,
        correlationId: CORRELATION,
      }),
    ).rejects.toSatisfy((e: unknown) => BloomError.isCode(e, 'DUPLICATE_OPERATION'));
  });

  it('records who completed it', async () => {
    h.repositories.identity.setState(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
      'early_bloom',
    );

    await h.service.completeOnboarding({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      actorId: TEST_USER_IDS.moderator,
      correlationId: CORRELATION,
    });

    expect(h.repositories.audit.find('onboarding.completed')?.actorId).toBe(
      TEST_USER_IDS.moderator,
    );
    const history = await h.repositories.onboarding.listTransitions(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
    );
    expect(history[0]?.actorId).toBe(TEST_USER_IDS.moderator);
    expect(history[0]?.trigger).toBe('staff_action');
  });
});

describe('OnboardingService.handleJoin', () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it('creates the record and posts the prompt, granting nothing', async () => {
    await h.service.handleJoin({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      username: 'newcomer',
      isBot: false,
      joinedAt: new Date('2026-02-01T00:00:00.000Z'),
      correlationId: CORRELATION,
    });

    const member = await h.repositories.identity.findMember(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
    );
    expect(member?.onboardingState).toBe('unverified');

    // Joining is not verifying.
    expect(h.roles.changes).toHaveLength(0);

    const posted = h.messaging.lastIn(TEST_CHANNEL_IDS.welcome);
    expect(posted?.content).toContain(TEST_USER_IDS.newcomer);
    expect(h.repositories.audit.has('member.joined')).toBe(true);
  });

  it('ignores bots', async () => {
    await h.service.handleJoin({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.bot,
      username: 'some-bot',
      isBot: true,
      joinedAt: new Date(),
      correlationId: CORRELATION,
    });

    expect(h.messaging.sent).toHaveLength(0);
    expect(
      await h.repositories.identity.findMember(TEST_GUILD_ID, TEST_USER_IDS.bot),
    ).toBeNull();
  });

  it('does not re-prompt a returning member who is already verified', async () => {
    await seed(h);
    h.repositories.identity.setState(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
      'bloom_member',
    );

    await h.service.handleJoin({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      username: 'newcomer',
      isBot: false,
      joinedAt: new Date(),
      correlationId: CORRELATION,
    });

    expect(h.messaging.sent).toHaveLength(0);
    // And their state survived the rejoin.
    expect(
      (await h.repositories.identity.findMember(TEST_GUILD_ID, TEST_USER_IDS.newcomer))
        ?.onboardingState,
    ).toBe('bloom_member');
  });

  it('warns rather than failing when no welcome channel is configured', async () => {
    const config = testConfig();
    const h2 = harness({
      config: { ...config, channels: { ...config.channels, welcome: null } },
    });

    await h2.service.handleJoin({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      username: 'newcomer',
      isBot: false,
      joinedAt: new Date(),
      correlationId: CORRELATION,
    });

    expect(h2.messaging.sent).toHaveLength(0);
    expect(h2.logs.sink.find('onboarding.no_welcome_channel')).toBeDefined();
    // The record still exists — the missing channel is not a reason to lose them.
    expect(
      await h2.repositories.identity.findMember(TEST_GUILD_ID, TEST_USER_IDS.newcomer),
    ).not.toBeNull();
  });
});

describe('OnboardingService.handleLeave', () => {
  it('marks the departure and keeps the lifecycle state', async () => {
    const h = harness();
    await seed(h);
    h.repositories.identity.setState(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
      'bloom_member',
    );

    await h.service.handleLeave({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      leftAt: new Date('2026-03-01T00:00:00.000Z'),
      correlationId: CORRELATION,
    });

    const member = await h.repositories.identity.findMember(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
    );
    expect(member?.leftAt).toEqual(new Date('2026-03-01T00:00:00.000Z'));
    // Leaving is not a way to launder a state.
    expect(member?.onboardingState).toBe('bloom_member');
    expect(
      h.repositories.audit.find('member.left')?.details?.['state_at_departure'],
    ).toBe('bloom_member');
  });

  it('ignores someone we never recorded', async () => {
    const h = harness();
    await h.service.handleLeave({
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      leftAt: new Date(),
      correlationId: CORRELATION,
    });
    expect(h.repositories.audit.events).toHaveLength(0);
  });
});

describe('OnboardingService.overview', () => {
  it('counts members in every state', async () => {
    const h = harness();
    await seed(h, TEST_USER_IDS.newcomer);
    await seed(h, TEST_USER_IDS.member);
    h.repositories.identity.setState(TEST_GUILD_ID, TEST_USER_IDS.member, 'early_bloom');

    expect(await h.service.overview(TEST_GUILD_ID)).toEqual({
      unverified: 1,
      early_bloom: 1,
      bloom_member: 0,
      revoked: 0,
    });
  });
});
