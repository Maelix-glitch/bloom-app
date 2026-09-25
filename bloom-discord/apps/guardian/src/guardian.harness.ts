import { CommandDispatcher, CommandRegistry } from '@bloom/commands';
import { DatabaseRateLimiter } from '@bloom/security';
import {
  createTestLogger,
  fakeInvocation,
  fakeRepositories,
  FakeChannelModerationService,
  FakeGuild,
  FakeMessaging,
  FakeModerationService,
  FakeRoleService,
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  testConfig,
  type FakeRepositories,
} from '@bloom/testing';
import type { GuardianDeps } from './deps.js';
import { OnboardingService } from './features/onboarding/service.js';
import { ModerationActionService } from './features/moderation/service.js';
import { CaseService } from './features/moderation/case-service.js';
import { guardianCommands } from './commands.js';

/**
 * A whole Guardian, in memory.
 *
 * Shared by the onboarding and moderation command tests because both need the
 * same thing: the *real* `CommandDispatcher` with the *real* command set, so
 * authorization is genuinely exercised. A test that called `execute` directly
 * would skip the policy layer entirely and prove nothing about who may run
 * what.
 *
 * Not in `@bloom/testing`: that package cannot depend on an app without
 * inverting the dependency graph. It lives here, excluded from the build
 * alongside the tests it serves.
 */
export interface GuardianHarness {
  readonly dispatch: (
    options: Parameters<typeof fakeInvocation>[0],
  ) => Promise<ReturnType<typeof fakeInvocation>>;
  readonly deps: GuardianDeps;
  readonly repositories: FakeRepositories;
  readonly guild: FakeGuild;
  readonly roles: FakeRoleService;
  readonly messaging: FakeMessaging;
  readonly moderation: FakeModerationService;
  readonly channels: FakeChannelModerationService;
  readonly logs: ReturnType<typeof createTestLogger>['sink'];
}

export interface GuardianHarnessOptions {
  /**
   * Unset the reports channel, to exercise the "stored but nobody was alerted"
   * path. Explicit rather than inferred: it is a configuration mistake with
   * real consequences, so a test has to ask for it.
   */
  readonly reportsChannel?: null;
}

export function guardianHarness(
  options: GuardianHarnessOptions = {},
): GuardianHarness {
  // testConfig() already configures every channel, reports included.
  const base = testConfig();
  const config =
    options.reportsChannel === null
      ? { ...base, channels: { ...base.channels, reports: null } }
      : base;
  const guild = new FakeGuild().withStandardRoles();
  guild.withChannels(TEST_CHANNEL_IDS.welcome, TEST_CHANNEL_IDS.reports);

  const roles = new FakeRoleService(guild);
  const messaging = new FakeMessaging(guild);
  const moderation = new FakeModerationService(guild);
  const channels = new FakeChannelModerationService();
  const repositories = fakeRepositories();
  const { logger, sink } = createTestLogger();

  const deps: GuardianDeps = {
    config,
    logger,
    repositories,
    guilds: guild,
    roles,
    messaging,
    discordModeration: moderation,
    channelModeration: channels,
    onboarding: new OnboardingService({
      config,
      repositories,
      roles,
      messaging,
      guilds: guild,
      logger,
    }),
    moderation: new ModerationActionService({
      config,
      repositories,
      guilds: guild,
      discord: moderation,
      channels,
      messaging,
      logger,
    }),
    cases: new CaseService({ config, repositories, messaging, logger }),
    verifyLimiter: new DatabaseRateLimiter(
      repositories.cooldowns,
      TEST_GUILD_ID,
      'onboarding.verify',
      30,
    ),
    moderationLimiter: new DatabaseRateLimiter(
      repositories.cooldowns,
      TEST_GUILD_ID,
      'moderation.action',
      3,
    ),
    reportLimiter: new DatabaseRateLimiter(
      repositories.cooldowns,
      TEST_GUILD_ID,
      'moderation.report',
      60,
    ),
  };

  const registry = new CommandRegistry<GuardianDeps>('guardian').registerAll(
    guardianCommands,
  );

  const dispatcher = new CommandDispatcher<GuardianDeps>({
    bot: 'guardian',
    config,
    logger,
    registry,
    deps,
    telemetry: { record: () => Promise.resolve() },
  });

  return {
    async dispatch(options) {
      const fake = fakeInvocation(options);
      await dispatcher.dispatch(fake.invocation);
      return fake;
    },
    deps,
    repositories,
    guild,
    roles,
    messaging,
    moderation,
    channels,
    logs: sink,
  };
}
