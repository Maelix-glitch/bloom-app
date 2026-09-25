import { beforeEach, describe, expect, it } from 'vitest';
import type { UserId } from '@bloom/shared-types';
import { CommandDispatcher, CommandRegistry } from '@bloom/commands';
import { DatabaseRateLimiter } from '@bloom/security';
import {
  createTestLogger,
  fakeInvocation,
  fakeRepositories,
  FakeGuild,
  FakeMessaging,
  FakeRoleService,
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_ROLE_POSITIONS,
  TEST_USER_IDS,
  testConfig,
  testSubject,
  type FakeRepositories,
} from '@bloom/testing';
import type { GuardianDeps } from '../../deps.js';
import { OnboardingService } from './service.js';
import { onboardingCommands } from './commands.js';

/**
 * Commands, exercised through the real dispatcher.
 *
 * Calling `execute` directly would skip authorization, which is the single most
 * important thing to test here — the dispatcher is where the policy is applied,
 * so a test that bypasses it proves nothing about who can run what.
 */

interface Harness {
  readonly dispatch: (
    options: Parameters<typeof fakeInvocation>[0],
  ) => Promise<ReturnType<typeof fakeInvocation>>;
  readonly repositories: FakeRepositories;
  readonly guild: FakeGuild;
  readonly roles: FakeRoleService;
}

function harness(): Harness {
  const config = testConfig();
  const guild = new FakeGuild().withStandardRoles();
  guild.withChannels(TEST_CHANNEL_IDS.welcome);

  const roles = new FakeRoleService(guild);
  const messaging = new FakeMessaging(guild);
  const repositories = fakeRepositories();
  const { logger } = createTestLogger();

  const deps: GuardianDeps = {
    config,
    logger,
    repositories,
    guilds: guild,
    roles,
    messaging,
    onboarding: new OnboardingService({
      config,
      repositories,
      roles,
      messaging,
      guilds: guild,
      logger,
    }),
    verifyLimiter: new DatabaseRateLimiter(
      repositories.cooldowns,
      TEST_GUILD_ID,
      'onboarding.verify',
      30,
    ),
  };

  const registry = new CommandRegistry<GuardianDeps>('guardian').registerAll(
    onboardingCommands,
  );
  const dispatcher = new CommandDispatcher<GuardianDeps>({
    bot: 'guardian',
    config,
    logger,
    registry,
    deps,
    telemetry: {
      record: () => Promise.resolve(),
    },
  });

  return {
    repositories,
    guild,
    roles,
    dispatch: async (options) => {
      const fake = fakeInvocation(options);
      await dispatcher.dispatch(fake.invocation);
      return fake;
    },
  };
}

async function seed(h: Harness, userId: UserId): Promise<void> {
  h.guild.withMember(userId);
  await h.repositories.identity.ensureMember({
    guildId: TEST_GUILD_ID,
    userId,
    username: `member-${userId.slice(-4)}`,
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('/verify', () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it('is available to a member holding no roles at all', async () => {
    await seed(h, TEST_USER_IDS.newcomer);

    const { responder } = await h.dispatch({
      commandName: 'verify',
      // No roles — an unverified member by definition. If the policy required
      // one, verification would be impossible.
      actor: testSubject({ userId: TEST_USER_IDS.newcomer, roles: [] }),
    });

    expect(responder.visibleText).toContain('You are verified');
    expect(h.roles.changes).toHaveLength(1);
  });

  it('always replies ephemerally', async () => {
    await seed(h, TEST_USER_IDS.newcomer);
    const { responder } = await h.dispatch({
      commandName: 'verify',
      actor: testSubject({ userId: TEST_USER_IDS.newcomer, roles: [] }),
    });

    expect(responder.deferredEphemeral).toBe(true);
    expect(responder.last?.ephemeral).toBe(true);
  });

  it('refuses a second attempt inside the cooldown window', async () => {
    await seed(h, TEST_USER_IDS.newcomer);
    const actor = testSubject({ userId: TEST_USER_IDS.newcomer, roles: [] });

    await h.dispatch({ commandName: 'verify', actor });
    const second = await h.dispatch({ commandName: 'verify', actor });

    expect(second.responder.visibleText.toLowerCase()).toContain('too quickly');
  });

  it('tells a verified-but-role-blocked member the truth', async () => {
    await seed(h, TEST_USER_IDS.newcomer);
    // Bot below the role it must grant.
    h.guild.withBotAtPosition(TEST_ROLE_POSITIONS.earlyBloom - 1);

    const { responder } = await h.dispatch({
      commandName: 'verify',
      actor: testSubject({ userId: TEST_USER_IDS.newcomer, roles: [] }),
    });

    // Not a success message, and not a bare failure either.
    expect(responder.visibleText).toContain('did not apply');
    expect(responder.visibleText).not.toContain('You are verified\n');
  });

  it('never leaks operator detail to the member', async () => {
    await seed(h, TEST_USER_IDS.newcomer);
    h.guild.withBotAtPosition(TEST_ROLE_POSITIONS.earlyBloom - 1);

    const { responder } = await h.dispatch({
      commandName: 'verify',
      actor: testSubject({ userId: TEST_USER_IDS.newcomer, roles: [] }),
    });

    const text = responder.visibleText;
    expect(text).not.toContain('Server Settings');
    expect(text).not.toContain('position');
    expect(text).not.toMatch(/at [A-Za-z]+\.ts:\d+/);
  });
});

describe('/guardian authorization', () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it('refuses a plain member', async () => {
    await seed(h, TEST_USER_IDS.member);

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommand: 'overview',
      actor: testSubject({ userId: TEST_USER_IDS.member, roles: ['bloomMember'] }),
    });

    // The member sees a refusal, not the overview.
    expect(responder.visibleText).not.toContain('Onboarding overview');
  });

  it('refuses a Beta Tester — testing access is not staff power', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommand: 'overview',
      actor: testSubject({ userId: TEST_USER_IDS.betaTester, roles: ['betaTester'] }),
    });

    expect(responder.visibleText).not.toContain('Onboarding overview');
  });

  it('allows a moderator', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommand: 'overview',
      actor: testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] }),
    });

    expect(responder.visibleText).toContain('Onboarding overview');
  });
});

describe('/guardian onboarding complete', () => {
  let h: Harness;
  beforeEach(async () => {
    h = harness();
    await seed(h, TEST_USER_IDS.newcomer);
  });

  it('promotes a verified member', async () => {
    h.repositories.identity.setState(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
      'early_bloom',
    );

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'onboarding',
      subcommand: 'complete',
      actor: testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] }),
      options: {
        users: {
          member: {
            id: TEST_USER_IDS.newcomer,
            username: 'newcomer',
            isBot: false,
          },
        },
      },
    });

    expect(responder.visibleText).toContain('Onboarding complete');
    expect(
      (await h.repositories.identity.findMember(TEST_GUILD_ID, TEST_USER_IDS.newcomer))
        ?.onboardingState,
    ).toBe('bloom_member');
  });

  it('refuses a bot target', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'onboarding',
      subcommand: 'complete',
      actor: testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] }),
      options: {
        users: {
          member: { id: TEST_USER_IDS.bot, username: 'a-bot', isBot: true },
        },
      },
    });

    expect(responder.visibleText).toContain('Bots do not go through onboarding');
  });
});

describe('/guardian roles audit', () => {
  it('reports correct placement', async () => {
    const h = harness();
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'roles',
      subcommand: 'audit',
      actor: testSubject({
        userId: TEST_USER_IDS.administrator,
        roles: ['administrator'],
      }),
    });

    expect(responder.visibleText).toContain('Role placement is correct');
  });

  it('reports the fix when the bot role is too low', async () => {
    const h = harness();
    h.guild.withBotAtPosition(TEST_ROLE_POSITIONS.earlyBloom - 1);

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'roles',
      subcommand: 'audit',
      actor: testSubject({
        userId: TEST_USER_IDS.administrator,
        roles: ['administrator'],
      }),
    });

    const text = responder.visibleText;
    expect(text).toContain('BOT_ROLE_TOO_LOW');
    // Staff-facing output is allowed — and required — to be actionable.
    expect(text).toContain('Server Settings');
  });
});

describe('/guardian status', () => {
  it('shows a member their own state', async () => {
    const h = harness();
    await seed(h, TEST_USER_IDS.moderator);
    h.repositories.identity.setState(
      TEST_GUILD_ID,
      TEST_USER_IDS.moderator,
      'bloom_member',
    );

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommand: 'status',
      actor: testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] }),
    });

    expect(responder.visibleText).toContain('Your status');
    expect(responder.visibleText).toContain('❋ Bloom Member');
  });

  it('explains a missing record instead of failing opaquely', async () => {
    const h = harness();
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommand: 'status',
      actor: testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] }),
    });

    expect(responder.visibleText).toContain('No record for that member');
  });
});

describe('command specs', () => {
  it('declares every command guild-only', () => {
    for (const command of onboardingCommands) {
      expect(command.spec.guildOnly).toBe(true);
    }
  });

  it('hides /guardian from members by default but leaves /verify visible', () => {
    const verify = onboardingCommands.find((c) => c.spec.name === 'verify');
    const guardian = onboardingCommands.find((c) => c.spec.name === 'guardian');

    expect(verify?.spec.defaultMemberPermissions).toBeUndefined();
    expect(guardian?.spec.defaultMemberPermissions).toBe('none');
  });

  it('defers every command that touches the database', () => {
    for (const command of onboardingCommands) {
      expect(command.defer).toBe(true);
    }
  });
});
