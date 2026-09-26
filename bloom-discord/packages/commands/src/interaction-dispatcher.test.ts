import { describe, expect, it } from 'vitest';
import {
  createTestLogger,
  fakeModalSubmission,
  testConfig,
  testSubject,
  TEST_USER_IDS,
} from '@bloom/testing';
import { requireModerator } from '@bloom/permissions';
import { InteractionDispatcher, type ModalHandler } from './interaction-dispatcher.js';

/**
 * The component and modal error boundary.
 *
 * Same guarantee as the command dispatcher — an interaction never dies silently
 * — with one extra problem it does not have. A command is named by Discord and
 * always exists. A custom id is a string, delivered through an event every
 * application in the server receives, and may name a handler that was deployed
 * away last week.
 */

interface TestDeps {
  readonly calls: string[];
}

function handler(
  overrides: Partial<ModalHandler<TestDeps>> = {},
): ModalHandler<TestDeps> {
  return {
    bot: 'labs',
    feature: 'bug',
    action: 'submit',
    policy: () => ({ ok: true, value: undefined }),
    execute: (_invocation, deps, context) => {
      deps.calls.push(context.customId.argument ?? 'none');
      return Promise.resolve({ content: 'done' });
    },
    ...overrides,
  };
}

function build(handlers: readonly ModalHandler<TestDeps>[]): {
  dispatcher: InteractionDispatcher<TestDeps>;
  deps: TestDeps;
  logs: ReturnType<typeof createTestLogger>['sink'];
} {
  const { logger, sink } = createTestLogger();
  const deps: TestDeps = { calls: [] };
  return {
    dispatcher: new InteractionDispatcher<TestDeps>({
      bot: 'labs',
      config: testConfig(),
      logger,
      deps,
      modals: handlers,
    }),
    deps,
    logs: sink,
  };
}

describe('registration', () => {
  it('refuses two handlers on one route', () => {
    // Otherwise the winner is whichever was registered last, which is a
    // property of array order rather than of anything anyone decided.
    expect(() => build([handler(), handler()])).toThrow();
  });

  it('refuses a handler belonging to another bot', () => {
    expect(() => build([handler({ bot: 'guardian' })])).toThrow();
  });

  it('allows two actions in the same feature', () => {
    expect(() => build([handler(), handler({ action: 'cancel' })])).not.toThrow();
  });
});

describe('routing', () => {
  it('routes on the id and passes the argument through', async () => {
    const { dispatcher, deps } = build([handler()]);

    const fake = fakeModalSubmission({ customId: 'labs:bug:submit:app' });
    await dispatcher.dispatchModal(fake.invocation);

    expect(deps.calls).toEqual(['app']);
    expect(fake.responder.visibleText).toContain('done');
  });

  it('ignores another application’s component entirely', async () => {
    const { dispatcher, deps } = build([handler()]);

    const fake = fakeModalSubmission({ customId: 'someotherbot_modal_42' });
    await dispatcher.dispatchModal(fake.invocation);

    /*
     * Silence is the correct behaviour. Responding would mean interrupting an
     * interaction this bot has no part in, and logging at anything above debug
     * would fill the logs with other people's buttons.
     */
    expect(deps.calls).toEqual([]);
    expect(fake.responder.messages).toEqual([]);
    expect(fake.responder.deferred).toBe(false);
  });

  it('ignores a well-formed id addressed to a different Bloom bot', async () => {
    const { dispatcher, deps } = build([handler()]);

    const fake = fakeModalSubmission({ customId: 'companion:bug:submit:app' });
    await dispatcher.dispatchModal(fake.invocation);

    expect(deps.calls).toEqual([]);
    expect(fake.responder.messages).toEqual([]);
  });

  it('tells the member when the component is older than the deploy', async () => {
    const { dispatcher, logs } = build([handler()]);

    const fake = fakeModalSubmission({ customId: 'labs:bug:withdraw:7' });
    await dispatcher.dispatchModal(fake.invocation);

    // Addressed to this bot, and nothing answers to it. A member pressing a
    // button on a week-old reply deserves a sentence, not a dead interaction.
    expect(fake.responder.visibleText).toContain('older version');
    expect(logs.events.some((event) => event.event === 'interaction.unknown_route')).toBe(
      true,
    );
  });
});

describe('authorization', () => {
  it('re-checks the policy on submission', async () => {
    const { dispatcher, deps } = build([handler({ policy: requireModerator() })]);

    const fake = fakeModalSubmission({
      customId: 'labs:bug:submit:app',
      actor: testSubject({ userId: TEST_USER_IDS.member, roles: ['bloomMember'] }),
    });
    await dispatcher.dispatchModal(fake.invocation);

    /*
     * The reason this is not optional: Discord gives a modal fifteen minutes to
     * be submitted, and roles change in that window. A check performed only
     * when the form opened says nothing about now.
     */
    expect(deps.calls).toEqual([]);
    expect(fake.responder.visibleText).toContain('Not available to you');
  });

  it('lets an authorized caller through', async () => {
    const { dispatcher, deps } = build([handler({ policy: requireModerator() })]);

    const fake = fakeModalSubmission({
      customId: 'labs:bug:submit:app',
      actor: testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] }),
    });
    await dispatcher.dispatchModal(fake.invocation);

    expect(deps.calls).toEqual(['app']);
  });
});

describe('failure', () => {
  it('turns a thrown error into a message and a log line', async () => {
    const { dispatcher, logs } = build([
      handler({
        execute: () => Promise.reject(new Error('the database went away')),
      }),
    ]);

    const fake = fakeModalSubmission({ customId: 'labs:bug:submit:app' });
    await dispatcher.dispatchModal(fake.invocation);

    expect(fake.responder.messages).toHaveLength(1);
    expect(logs.events.some((event) => event.event === 'interaction.failed')).toBe(true);
    // The operator's text never reaches the member.
    expect(fake.responder.visibleText).not.toContain('database went away');
  });

  it('warns when a handler responds with nothing at all', async () => {
    const { dispatcher, logs } = build([
      handler({ defer: false, execute: () => Promise.resolve() }),
    ]);

    const fake = fakeModalSubmission({ customId: 'labs:bug:submit:app' });
    await dispatcher.dispatchModal(fake.invocation);

    // The member would see a spinner resolve into failure with nothing logged,
    // which is the hardest kind of bug to be told about.
    expect(logs.events.some((event) => event.event === 'interaction.no_response')).toBe(
      true,
    );
  });

  it('defers before slow work by default', async () => {
    const { dispatcher } = build([handler()]);

    const fake = fakeModalSubmission({ customId: 'labs:bug:submit:app' });
    await dispatcher.dispatchModal(fake.invocation);

    expect(fake.responder.deferredEphemeral).toBe(true);
  });
});
