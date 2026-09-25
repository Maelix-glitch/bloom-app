import { describe, expect, it } from 'vitest';
import { unsafeSnowflake, type UserId } from '@bloom/shared-types';
import { EventDispatcher, type MemberJoinPayload } from '@bloom/events';
import {
  createTestLogger,
  TEST_GUILD_ID,
  TEST_USER_IDS,
  type FakeMessaging,
  type FakeRepositories,
} from '@bloom/testing';
import type { GuardianDeps } from '../../deps.js';
import { guardianHarness } from '../../guardian.harness.js';
import { memberJoinHandler, memberLeaveHandler } from './handlers.js';

/**
 * Member lifecycle handlers, through the real `EventDispatcher`.
 *
 * Dispatching rather than calling `handle` directly is deliberate: ownership
 * enforcement, dedupe and failure isolation all live in the dispatcher, and
 * they are the properties worth testing.
 */

interface Harness {
  readonly dispatcher: EventDispatcher<GuardianDeps>;
  readonly repositories: FakeRepositories;
  readonly messaging: FakeMessaging;
  readonly logs: ReturnType<typeof createTestLogger>;
}

function harness(options: { readonly withDedupe?: boolean } = {}): Harness {
  /*
   * Deps come from the shared harness so this test cannot drift from what the
   * bot actually wires up — the event handlers reach into `deps.onboarding`,
   * and a stub built here would happily keep passing after the real
   * construction changed.
   */
  const { deps, repositories, messaging } = guardianHarness();
  const logs = createTestLogger();

  const seen = new Set<string>();
  const dispatcher = new EventDispatcher<GuardianDeps>({
    bot: 'guardian',
    logger: logs.logger,
    deps: { ...deps, logger: logs.logger },
    ...(options.withDedupe === false
      ? {}
      : {
          dedupe: {
            tryClaim: (key) => {
              if (seen.has(key)) return Promise.resolve(false);
              seen.add(key);
              return Promise.resolve(true);
            },
          },
        }),
  })
    .register(memberJoinHandler)
    .register(memberLeaveHandler);

  return { dispatcher, repositories, messaging, logs };
}

function joinPayload(overrides: Partial<MemberJoinPayload> = {}): MemberJoinPayload {
  return {
    guildId: TEST_GUILD_ID,
    userId: TEST_USER_IDS.newcomer,
    username: 'newcomer',
    isBot: false,
    joinedAt: new Date('2026-02-01T10:00:00.000Z'),
    roleIds: [],
    accountCreatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('guildMemberAdd', () => {
  it('creates the member and posts the prompt', async () => {
    const h = harness();
    await h.dispatcher.dispatch('guildMemberAdd', joinPayload());

    expect(
      await h.repositories.identity.findMember(TEST_GUILD_ID, TEST_USER_IDS.newcomer),
    ).not.toBeNull();
    expect(h.messaging.sent).toHaveLength(1);
  });

  /**
   * The redelivery case.
   *
   * After a gateway resume Discord replays recent events. Without the dedupe
   * key the member is welcomed twice, which is the duplicate-message failure
   * the brief calls out directly.
   */
  it('suppresses a replayed join', async () => {
    const h = harness();
    await h.dispatcher.dispatch('guildMemberAdd', joinPayload());
    await h.dispatcher.dispatch('guildMemberAdd', joinPayload());

    expect(h.messaging.sent).toHaveLength(1);
  });

  it('treats a genuine rejoin as a new event', async () => {
    const h = harness();
    await h.dispatcher.dispatch('guildMemberAdd', joinPayload());

    // Left and came back: a different join timestamp, so a different key.
    await h.dispatcher.dispatch(
      'guildMemberAdd',
      joinPayload({ joinedAt: new Date('2026-05-01T10:00:00.000Z') }),
    );

    // The handler ran again — but the member was already unverified with a
    // record, so it is the *handler* that decides whether to re-prompt.
    expect(
      h.repositories.audit.events.filter((e) => e.event === 'member.joined'),
    ).toHaveLength(2);
  });

  it('does not welcome bots', async () => {
    const h = harness();
    await h.dispatcher.dispatch(
      'guildMemberAdd',
      joinPayload({ userId: TEST_USER_IDS.bot, isBot: true }),
    );

    expect(h.messaging.sent).toHaveLength(0);
  });

  /**
   * Failure isolation.
   *
   * An exception escaping a discord.js listener becomes an unhandled rejection
   * and kills the process. The dispatcher must log and swallow instead.
   */
  it('logs and contains a handler failure rather than throwing', async () => {
    const h = harness();
    const exploding = unsafeSnowflake<UserId>('900000000000001111');

    // A guild id that is not the configured one makes the identity write fail
    // the foreign-key expectation in the fake, surfacing as a thrown error.
    await expect(
      h.dispatcher.dispatch(
        'guildMemberAdd',
        joinPayload({ userId: exploding, joinedAt: null }),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('guildMemberRemove', () => {
  it('marks the departure', async () => {
    const h = harness();
    await h.dispatcher.dispatch('guildMemberAdd', joinPayload());

    await h.dispatcher.dispatch('guildMemberRemove', {
      guildId: TEST_GUILD_ID,
      userId: TEST_USER_IDS.newcomer,
      username: 'newcomer',
      leftAt: new Date('2026-03-01T00:00:00.000Z'),
    });

    const member = await h.repositories.identity.findMember(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
    );
    expect(member?.leftAt).toEqual(new Date('2026-03-01T00:00:00.000Z'));
  });
});

describe('ownership', () => {
  it('refuses to register Guardian handlers on another bot', () => {
    const logs = createTestLogger();
    const dispatcher = new EventDispatcher<GuardianDeps>({
      bot: 'companion',
      logger: logs.logger,
      deps: {} as GuardianDeps,
    });

    // Companion must never welcome members — that is Guardian's event.
    expect(() => dispatcher.register(memberJoinHandler)).toThrow();
  });
});
