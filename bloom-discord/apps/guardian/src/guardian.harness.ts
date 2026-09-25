import type { PlatformConfig } from '@bloom/config';
import { CommandDispatcher, CommandRegistry } from '@bloom/commands';
import { Scheduler } from '@bloom/events';
import { DatabaseRateLimiter, TokenBucketRateLimiter } from '@bloom/security';
import {
  createTestLogger,
  fakeInvocation,
  fakeRepositories,
  FakeChannelModerationService,
  FakeGuild,
  FakeJobLock,
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
import { createStaleCaseSweepJob } from './features/jobs/stale-case-sweep.js';

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
  /** The scheduler the harness built, with Guardian's real jobs registered. */
  readonly scheduler: Scheduler;
  readonly lock: FakeJobLock;
}

export interface GuardianHarnessOptions {
  /**
   * Unset the reports channel, to exercise the "stored but nobody was alerted"
   * path. Explicit rather than inferred: it is a configuration mistake with
   * real consequences, so a test has to ask for it.
   */
  readonly reportsChannel?: null;
  /**
   * Unset the moderation channel, so the stale-case job has nowhere to post.
   * Exercises the "registered but disabled" path.
   */
  readonly moderationChannel?: null;
  /** Turn FEATURE_SCHEDULED_MESSAGES off. Defaults to on inside the harness. */
  readonly scheduledMessages?: false;
}

export function guardianHarness(options: GuardianHarnessOptions = {}): GuardianHarness {
  // testConfig() already configures every channel, reports included.
  const base = testConfig();
  const config: PlatformConfig = {
    ...base,
    channels: {
      ...base.channels,
      ...(options.reportsChannel === null ? { reports: null } : {}),
      ...(options.moderationChannel === null ? { moderation: null } : {}),
    },
    // On by default: a harness where every job is switched off would make the
    // job tests pass without running anything.
    features: {
      ...base.features,
      scheduledMessages: options.scheduledMessages !== false,
    },
  };
  const guild = new FakeGuild().withStandardRoles();
  guild.withChannels(
    TEST_CHANNEL_IDS.welcome,
    TEST_CHANNEL_IDS.reports,
    TEST_CHANNEL_IDS.moderation,
  );

  const roles = new FakeRoleService(guild);
  const messaging = new FakeMessaging(guild);
  const moderation = new FakeModerationService(guild);
  const channels = new FakeChannelModerationService();
  const repositories = fakeRepositories();
  const { logger, sink } = createTestLogger();

  const lock = new FakeJobLock();
  const scheduler = new Scheduler({
    bot: 'guardian',
    logger,
    timezone: config.runtime.timezone,
    lock,
    ...(config.features.scheduledMessages ? {} : { globallyDisabled: true }),
  });

  const deps: GuardianDeps = {
    config,
    logger,
    repositories,
    scheduler,
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
    moderationLimiter: new TokenBucketRateLimiter({
      capacity: 10,
      refillPerSecond: 0.5,
    }),
    reportLimiter: new DatabaseRateLimiter(
      repositories.cooldowns,
      TEST_GUILD_ID,
      'moderation.report',
      60,
    ),
  };

  /*
   * The same registration `main.ts` performs, so the command tests inspect the
   * real job list rather than a fixture that can drift from it.
   */
  scheduler.register(createStaleCaseSweepJob(deps));

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
    scheduler,
    lock,
  };
}
