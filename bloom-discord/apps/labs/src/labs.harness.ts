import type { PlatformConfig } from '@bloom/config';
import {
  CommandDispatcher,
  CommandRegistry,
  InteractionDispatcher,
} from '@bloom/commands';
import {
  createTestLogger,
  fakeInvocation,
  fakeModalSubmission,
  fakeRepositories,
  FakeGuild,
  FakeMessaging,
  TEST_CHANNEL_IDS,
  testConfig,
  type FakeRepositories,
} from '@bloom/testing';
import type { Clock } from '@bloom/utils';
import type { LabsDeps } from './deps.js';
import { labsCommands } from './commands.js';
import { intakeModalHandlers } from './features/intake/handlers.js';
import { IntakeService } from './features/intake/service.js';

/**
 * A whole Labs, in memory.
 *
 * Same shape as the Guardian and Companion harnesses, with one addition that
 * matters: `submit` drives the real `InteractionDispatcher`, so a modal test
 * exercises custom-id parsing, routing and the re-run of the authorization
 * policy — the three things that are easy to get wrong and invisible if a test
 * calls the handler directly.
 */

const HARNESS_NOW = new Date('2026-03-12T14:00:00.000Z');

export interface LabsHarness {
  readonly dispatch: (
    options: Parameters<typeof fakeInvocation>[0],
  ) => Promise<ReturnType<typeof fakeInvocation>>;
  /** Submit a modal, through the real dispatcher. */
  readonly submit: (
    options: Parameters<typeof fakeModalSubmission>[0],
  ) => Promise<ReturnType<typeof fakeModalSubmission>>;
  readonly deps: LabsDeps;
  readonly repositories: FakeRepositories;
  readonly guild: FakeGuild;
  readonly messaging: FakeMessaging;
  readonly intake: IntakeService;
  readonly logs: ReturnType<typeof createTestLogger>['sink'];
}

export interface LabsHarnessOptions {
  /** Unset the feedback channel, so a submission has nowhere to be announced. */
  readonly feedbackChannel?: null;
  /** Unset the bug channel. */
  readonly bugChannel?: null;
  readonly now?: () => Date;
}

export function labsHarness(options: LabsHarnessOptions = {}): LabsHarness {
  const base = testConfig();
  const config: PlatformConfig = {
    ...base,
    channels: {
      ...base.channels,
      ...(options.feedbackChannel === null
        ? { feedback: null }
        : { feedback: TEST_CHANNEL_IDS.feedback }),
      ...(options.bugChannel === null
        ? { bugReports: null }
        : { bugReports: TEST_CHANNEL_IDS.bugReports }),
    },
  };

  const guild = new FakeGuild().withStandardRoles();
  guild.withChannels(TEST_CHANNEL_IDS.feedback, TEST_CHANNEL_IDS.bugReports);

  const messaging = new FakeMessaging(guild);
  const clock: Clock = options.now
    ? { now: () => options.now!().getTime(), date: () => options.now!() }
    : { now: () => HARNESS_NOW.getTime(), date: () => HARNESS_NOW };
  const repositories = fakeRepositories({ now: () => clock.date() });
  const { logger, sink } = createTestLogger();

  const intake = new IntakeService({
    config,
    repositories,
    messaging,
    logger,
    clock,
  });

  const deps: LabsDeps = {
    bot: 'labs',
    config,
    logger,
    repositories,
    guilds: guild,
    messaging,
    intake,
  };

  const registry = new CommandRegistry<LabsDeps>('labs').registerAll(labsCommands);

  const dispatcher = new CommandDispatcher<LabsDeps>({
    bot: 'labs',
    config,
    logger,
    registry,
    deps,
    telemetry: { record: () => Promise.resolve() },
  });

  const interactions = new InteractionDispatcher<LabsDeps>({
    bot: 'labs',
    config,
    logger,
    deps,
    modals: intakeModalHandlers,
  });

  return {
    async dispatch(invocationOptions) {
      const fake = fakeInvocation(invocationOptions);
      await dispatcher.dispatch(fake.invocation);
      return fake;
    },
    async submit(modalOptions) {
      const fake = fakeModalSubmission(modalOptions);
      await interactions.dispatchModal(fake.invocation);
      return fake;
    },
    deps,
    repositories,
    guild,
    messaging,
    intake,
    logs: sink,
  };
}
