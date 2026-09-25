import { describe, expect, it } from 'vitest';
import { bloomError } from '@bloom/shared-types';
import { FakeClock, FakeDedupe, createTestLogger } from '@bloom/testing';
import { EventDispatcher, type EventHandler } from './handler.js';
import {
  EVENT_OWNERSHIP,
  GATEWAY_EVENTS,
  canHandle,
  findOwnershipGaps,
} from './ownership.js';

interface Payload {
  readonly userId: string;
}

interface Deps {
  readonly calls: string[];
}

function handler(
  overrides: Partial<EventHandler<Payload, Deps>> = {},
): EventHandler<Payload, Deps> {
  return {
    event: 'guildMemberAdd',
    bot: 'guardian',
    name: 'test-handler',
    handle: (payload, deps) => {
      deps.calls.push(payload.userId);
      return Promise.resolve();
    },
    ...overrides,
  };
}

describe('EventDispatcher', () => {
  it('runs a registered handler', async () => {
    const deps: Deps = { calls: [] };
    const dispatcher = new EventDispatcher<Deps>({
      bot: 'guardian',
      logger: createTestLogger().logger,
      deps,
    }).register(handler());

    await dispatcher.dispatch('guildMemberAdd', { userId: 'u1' });
    expect(deps.calls).toEqual(['u1']);
  });

  /*
   * Ownership is the mechanism that stops three bots in one guild all reacting
   * to the same join. Enforced at registration so the failure is a startup
   * crash with an explanation, not a duplicate welcome in production.
   */
  it('refuses a handler for an event this bot does not own', () => {
    const dispatcher = new EventDispatcher<Deps>({
      bot: 'companion',
      logger: createTestLogger().logger,
      deps: { calls: [] },
    });

    expect(() => dispatcher.register(handler({ bot: 'companion' }))).toThrow(/guardian/i);
  });

  it('refuses a handler whose declared bot does not match the registry', () => {
    const dispatcher = new EventDispatcher<Deps>({
      bot: 'guardian',
      logger: createTestLogger().logger,
      deps: { calls: [] },
    });

    expect(() => dispatcher.register(handler({ bot: 'labs' }))).toThrow();
  });

  it('allows every bot to handle shared lifecycle events', () => {
    for (const bot of ['guardian', 'companion', 'labs'] as const) {
      const dispatcher = new EventDispatcher<Deps>({
        bot,
        logger: createTestLogger().logger,
        deps: { calls: [] },
      });

      expect(() =>
        dispatcher.register(handler({ bot, event: 'guildCreate', name: `${bot}-ready` })),
      ).not.toThrow();
    }
  });

  /*
   * An exception escaping an event listener becomes an unhandled rejection,
   * which terminates the process and disconnects the bot. One broken handler
   * must never take the gateway down, nor stop its siblings running.
   */
  it('isolates a failing handler from the others', async () => {
    const deps: Deps = { calls: [] };
    const logging = createTestLogger();

    const dispatcher = new EventDispatcher<Deps>({
      bot: 'guardian',
      logger: logging.logger,
      deps,
    })
      .register(
        handler({
          name: 'exploding',
          handle: () => Promise.reject(bloomError('INTERNAL_ERROR')),
        }),
      )
      .register(handler({ name: 'survivor' }));

    await expect(
      dispatcher.dispatch('guildMemberAdd', { userId: 'u1' }),
    ).resolves.toBeUndefined();
    expect(deps.calls).toEqual(['u1']);
    expect(logging.sink.has('event.guildMemberAdd.failed')).toBe(true);
  });

  /*
   * Discord replays events after a resume. Anything with a visible side effect
   * needs suppression, or a reconnect produces a second welcome message.
   */
  it('suppresses a redelivered event when the handler supplies a dedupe key', async () => {
    const deps: Deps = { calls: [] };
    const clock = new FakeClock();

    const dispatcher = new EventDispatcher<Deps>({
      bot: 'guardian',
      logger: createTestLogger().logger,
      deps,
      dedupe: new FakeDedupe(clock),
      dedupeTtlSeconds: 60,
    }).register(handler({ dedupeKey: (payload) => payload.userId }));

    await dispatcher.dispatch('guildMemberAdd', { userId: 'u1' });
    await dispatcher.dispatch('guildMemberAdd', { userId: 'u1' });
    await dispatcher.dispatch('guildMemberAdd', { userId: 'u2' });

    expect(deps.calls).toEqual(['u1', 'u2']);
  });

  it('allows the same key again once the suppression window lapses', async () => {
    const deps: Deps = { calls: [] };
    const clock = new FakeClock();

    const dispatcher = new EventDispatcher<Deps>({
      bot: 'guardian',
      logger: createTestLogger().logger,
      deps,
      dedupe: new FakeDedupe(clock),
      dedupeTtlSeconds: 60,
    }).register(handler({ dedupeKey: (payload) => payload.userId }));

    await dispatcher.dispatch('guildMemberAdd', { userId: 'u1' });
    clock.advanceSeconds(61);
    await dispatcher.dispatch('guildMemberAdd', { userId: 'u1' });

    expect(deps.calls).toEqual(['u1', 'u1']);
  });

  it('does nothing for an event with no handlers', async () => {
    const dispatcher = new EventDispatcher<Deps>({
      bot: 'guardian',
      logger: createTestLogger().logger,
      deps: { calls: [] },
    });

    await expect(dispatcher.dispatch('roleUpdate', {})).resolves.toBeUndefined();
  });
});

describe('event ownership map', () => {
  it('covers every gateway event the platform listens to', () => {
    for (const event of GATEWAY_EVENTS) {
      expect(EVENT_OWNERSHIP[event]).toBeDefined();
      expect(EVENT_OWNERSHIP[event].rationale.length).toBeGreaterThan(20);
    }
  });

  it('gives every member-affecting event exactly one owner', () => {
    for (const event of [
      'guildMemberAdd',
      'guildMemberRemove',
      'guildMemberUpdate',
      'guildBanAdd',
      'roleUpdate',
    ] as const) {
      expect(EVENT_OWNERSHIP[event].owner).toBe('guardian');
    }
  });

  it('never lets Companion or Labs act on member events', () => {
    for (const bot of ['companion', 'labs'] as const) {
      expect(canHandle(bot, 'guildMemberAdd')).toBe(false);
      expect(canHandle(bot, 'guildMemberUpdate')).toBe(false);
      expect(canHandle(bot, 'guildBanAdd')).toBe(false);
    }
  });

  it('has no event that is both owned and observed, which would be ambiguous', () => {
    expect(findOwnershipGaps()).toEqual([]);
  });
});
