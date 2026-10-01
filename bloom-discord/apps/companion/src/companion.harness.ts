import type { PlatformConfig } from '@bloom/config';
import { CommandDispatcher, CommandRegistry } from '@bloom/commands';
import { DatabaseJobGate, JobSettingsService } from '@bloom/discord';
import { Scheduler } from '@bloom/events';
import {
  createTestLogger,
  fakeInvocation,
  fakeRepositories,
  FakeGuild,
  FakeJobLock,
  FakeMessaging,
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  testConfig,
  type FakeRepositories,
} from '@bloom/testing';
import type { Clock } from '@bloom/utils';
import type { CompanionDeps } from './deps.js';
import { companionCommands } from './commands.js';
import { createDailyCheckInJob } from './features/checkin/job.js';
import { AwardsService } from './features/awards/service.js';
import { CommunityService } from './features/community/service.js';
import { HighlightsService } from './features/highlights/service.js';
import { createWeeklyRecapJob } from './features/highlights/job.js';
import type { AwardDefinition } from './features/awards/definitions.js';
import { RewardsService } from './features/rewards/service.js';
import { ReferralConsumer } from './features/rewards/referral-consumer.js';

/**
 * The harness clock, unless a test supplies its own.
 *
 * A Thursday, mid-afternoon in Europe/London, deliberately not near midnight:
 * a default that sat at 23:55 would make every date-sensitive test pass or fail
 * depending on which side of the day boundary the runner happened to land on.
 */
const HARNESS_NOW = new Date('2026-03-12T14:00:00.000Z');

/**
 * A whole Companion, in memory.
 *
 * The same shape as `guardianHarness`, and deliberately not shared with it: the
 * two bots have different dependency containers, and a harness generic enough
 * to build either would be harder to read than two that each build one. What
 * *is* shared is everything underneath — the dispatcher, the scheduler, the
 * fakes and the job command surface are all the same code.
 *
 * Dispatching through the real `CommandDispatcher` with the real command set
 * matters for the same reason it does in Guardian: a test that called `execute`
 * directly would skip authorization entirely and prove nothing about who may
 * run what.
 */
export interface CompanionHarness {
  readonly dispatch: (
    options: Parameters<typeof fakeInvocation>[0],
  ) => Promise<ReturnType<typeof fakeInvocation>>;
  readonly deps: CompanionDeps;
  readonly repositories: FakeRepositories;
  readonly guild: FakeGuild;
  readonly messaging: FakeMessaging;
  readonly scheduler: Scheduler;
  readonly lock: FakeJobLock;
  readonly jobSettings: JobSettingsService;
  readonly rewards: RewardsService;
  readonly awards: AwardsService;
  readonly highlights: HighlightsService;
  readonly logs: ReturnType<typeof createTestLogger>['sink'];
}

export interface CompanionHarnessOptions {
  /**
   * Unset the check-in channel, so the prompt job has nowhere to post.
   * Explicit rather than inferred: it is a configuration mistake with real
   * consequences, so a test has to ask for it.
   */
  readonly checkInChannel?: null;
  /** Turn FEATURE_SCHEDULED_MESSAGES off. Defaults to on inside the harness. */
  readonly scheduledMessages?: false;
  /**
   * Turn FEATURE_REWARDS off. Defaults to on, because a harness that silently
   * awarded nothing would make every points assertion vacuously true.
   */
  readonly rewards?: false;
  /** Unset the small-wins channel, so a shared win has nowhere to go. */
  readonly smallWinsChannel?: null;
  /** Unset the milestones channel, so an earned award has nowhere to go. */
  readonly milestonesChannel?: null;
  /** Unset the challenges channel, so a new activity has nowhere to announce. */
  readonly challengesChannel?: null;
  /** Fix the clock. Rewards are date-sensitive, so tests need to own "today". */
  readonly now?: () => Date;
  /**
   * Replace the award definitions the service evaluates.
   *
   * The reason this exists: no shipped definition carries points, and that is
   * a product decision that should stay true. Proving the point-paying path
   * works therefore needs a definition that pays, and the only honest place
   * to put one is a test. Anything passed here is additional to nothing — it
   * replaces the real list outright, so a test that uses it is clearly not
   * describing production behaviour.
   */
  readonly awardDefinitions?: readonly AwardDefinition[];
}

export function companionHarness(
  options: CompanionHarnessOptions = {},
): CompanionHarness {
  const base = testConfig();
  const config: PlatformConfig = {
    ...base,
    channels: {
      ...base.channels,
      ...(options.checkInChannel === null ? { dailyCheckIn: null } : {}),
      ...(options.smallWinsChannel === null
        ? { smallWins: null }
        : { smallWins: TEST_CHANNEL_IDS.smallWins }),
      ...(options.milestonesChannel === null
        ? { milestones: null }
        : { milestones: TEST_CHANNEL_IDS.milestones }),
      ...(options.challengesChannel === null ? { challenges: null } : {}),
    },
    // On by default: a harness where every job is switched off would make the
    // job tests pass without running anything.
    features: {
      ...base.features,
      scheduledMessages: options.scheduledMessages !== false,
      rewards: options.rewards !== false,
    },
  };

  const guild = new FakeGuild().withStandardRoles();
  guild.withChannels(
    TEST_CHANNEL_IDS.dailyCheckIn,
    TEST_CHANNEL_IDS.welcome,
    TEST_CHANNEL_IDS.smallWins,
    TEST_CHANNEL_IDS.milestones,
    TEST_CHANNEL_IDS.achievements,
    // Community activities announce here. One post per activity, never per join.
    TEST_CHANNEL_IDS.challenges,
  );

  const messaging = new FakeMessaging(guild);
  const clock: Clock = options.now
    ? { now: () => options.now!().getTime(), date: () => options.now!() }
    : { now: () => HARNESS_NOW.getTime(), date: () => HARNESS_NOW };
  const repositories = fakeRepositories({ now: () => clock.date() });
  const { logger, sink } = createTestLogger();

  const lock = new FakeJobLock();
  const jobSettings = new JobSettingsService(repositories.settings, 'companion');
  const scheduler = new Scheduler({
    bot: 'companion',
    logger,
    timezone: config.runtime.timezone,
    lock,
    // The real gate over the fake settings repository, so a test that disables
    // a job exercises the same path production does.
    gate: new DatabaseJobGate(jobSettings, TEST_GUILD_ID),
    ...(config.features.scheduledMessages ? {} : { globallyDisabled: true }),
  });

  const rewards = new RewardsService({
    config,
    repositories,
    messaging,
    logger,
    clock,
  });

  const awards = new AwardsService({
    config,
    repositories,
    messaging,
    logger,
    rewards,
    ...(options.awardDefinitions ? { definitions: options.awardDefinitions } : {}),
  });

  const community = new CommunityService({
    config,
    repositories,
    messaging,
    logger,
    rewards,
    awards,
    now: () => clock.date(),
  });

  const highlights = new HighlightsService({
    config,
    repositories,
    now: () => clock.date(),
  });

  const referralConsumer = new ReferralConsumer({
    repositories,
    rewards,
    messaging,
    logger,
    now: () => clock.date(),
    workerId: 'companion:test',
  });

  const deps: CompanionDeps = {
    bot: 'companion',
    config,
    logger,
    repositories,
    guilds: guild,
    messaging,
    scheduler,
    jobSettings,
    rewards,
    awards,
    referralConsumer,
    community,
    highlights,
  };

  // The same registration `main.ts` performs, so the command tests inspect the
  // real job list rather than a fixture that can drift from it.
  scheduler.register(createDailyCheckInJob(deps));
  scheduler.register(createWeeklyRecapJob(deps));

  const registry = new CommandRegistry<CompanionDeps>('companion').registerAll(
    companionCommands,
  );

  const dispatcher = new CommandDispatcher<CompanionDeps>({
    bot: 'companion',
    config,
    logger,
    registry,
    deps,
    telemetry: { record: () => Promise.resolve() },
  });

  return {
    async dispatch(invocationOptions) {
      const fake = fakeInvocation(invocationOptions);
      await dispatcher.dispatch(fake.invocation);
      return fake;
    },
    deps,
    repositories,
    guild,
    messaging,
    scheduler,
    lock,
    jobSettings,
    rewards,
    awards,
    highlights,
    logs: sink,
  };
}
