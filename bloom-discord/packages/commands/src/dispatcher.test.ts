import { beforeEach, describe, expect, it } from 'vitest';
import { bloomError } from '@bloom/shared-types';
import {
  MemoryLogSink,
  TEST_USER_IDS,
  createTestLogger,
  fakeInvocation,
  testConfig,
  testSubject,
} from '@bloom/testing';
import { allowAnyone, requireRole } from '@bloom/permissions';
import type { BloomMessage } from '@bloom/embeds';
import { CommandRegistry, type BloomCommand } from './command.js';
import {
  CommandDispatcher,
  type CommandOutcome,
  type CommandTelemetry,
} from './dispatcher.js';
import type { CommandInvocation } from './invocation.js';
import type { SlashCommandSpec } from './spec.js';

interface Deps {
  readonly marker: string;
}

function spec(name: string): SlashCommandSpec {
  return { name, description: 'A test command.', guildOnly: true };
}

function command(overrides: Partial<BloomCommand<Deps>> = {}): BloomCommand<Deps> {
  return {
    spec: spec('guardian'),
    bot: 'guardian',
    policy: allowAnyone,
    execute: () => Promise.resolve({ content: 'ok' } satisfies BloomMessage),
    ...overrides,
  };
}

class RecordingTelemetry implements CommandTelemetry {
  public readonly entries: { outcome: CommandOutcome; errorCode: string | null }[] = [];

  public record(entry: {
    outcome: CommandOutcome;
    errorCode: string | null;
  }): Promise<void> {
    this.entries.push({ outcome: entry.outcome, errorCode: entry.errorCode });
    return Promise.resolve();
  }
}

describe('CommandDispatcher', () => {
  let sink: MemoryLogSink;
  let telemetry: RecordingTelemetry;

  function dispatcher(registry: CommandRegistry<Deps>): CommandDispatcher<Deps> {
    const logging = createTestLogger();
    sink = logging.sink;
    telemetry = new RecordingTelemetry();

    return new CommandDispatcher<Deps>({
      bot: 'guardian',
      config: testConfig(),
      logger: logging.logger,
      registry,
      deps: { marker: 'test' },
      telemetry,
    });
  }

  function registryWith(...commands: BloomCommand<Deps>[]): CommandRegistry<Deps> {
    return new CommandRegistry<Deps>('guardian').registerAll(commands);
  }

  beforeEach(() => {
    sink = new MemoryLogSink();
  });

  it('runs an authorized command and sends its response', async () => {
    const dispatch = dispatcher(registryWith(command()));
    const { invocation, responder } = fakeInvocation({ commandName: 'guardian' });

    await dispatch.dispatch(invocation);

    expect(responder.messages).toHaveLength(1);
    expect(responder.messages[0]?.content).toBe('ok');
    expect(telemetry.entries[0]?.outcome).toBe('success');
  });

  it('defaults responses to ephemeral', async () => {
    const dispatch = dispatcher(registryWith(command()));
    const { invocation, responder } = fakeInvocation({ commandName: 'guardian' });

    await dispatch.dispatch(invocation);
    expect(responder.messages[0]?.ephemeral).toBe(true);
  });

  /*
   * The whole point of centralising authorization. The handler below would
   * happily run for anyone; it never gets the chance, because the dispatcher
   * evaluates the policy first.
   */
  it('refuses an unauthorized caller without executing the handler', async () => {
    let executed = false;
    const dispatch = dispatcher(
      registryWith(
        command({
          policy: requireRole('moderator'),
          execute: () => {
            executed = true;
            return Promise.resolve();
          },
        }),
      ),
    );

    const { invocation, responder } = fakeInvocation({
      commandName: 'guardian',
      actor: testSubject({ roles: ['bloomMember'] }),
    });

    await dispatch.dispatch(invocation);

    expect(executed).toBe(false);
    expect(telemetry.entries[0]?.outcome).toBe('authorization_denied');
    expect(responder.visibleText).toMatch(/not available to you/i);
  });

  it('refuses a caller from another guild', async () => {
    const dispatch = dispatcher(registryWith(command()));
    const actor = testSubject();
    const { invocation } = fakeInvocation({
      commandName: 'guardian',
      actor: { ...actor, guildId: '900000000000000999' as typeof actor.guildId },
    });

    await dispatch.dispatch(invocation);
    expect(telemetry.entries[0]?.errorCode).toBe('GUILD_MISMATCH');
  });

  it('defers before executing when the command asks for it', async () => {
    const dispatch = dispatcher(registryWith(command({ defer: true })));
    const { invocation, responder } = fakeInvocation({ commandName: 'guardian' });

    await dispatch.dispatch(invocation);

    expect(responder.deferred).toBe(true);
    expect(responder.messages).toHaveLength(1);
  });

  /*
   * A handler that throws must still produce a reply. "This interaction failed"
   * is what a member sees otherwise, with no indication whether to retry.
   */
  it('turns a thrown error into a member-safe reply', async () => {
    const dispatch = dispatcher(
      registryWith(
        command({
          execute: () =>
            Promise.reject(
              bloomError('DATABASE_UNAVAILABLE', {
                operatorHint: 'postgres://bloom:secret@db:5432 refused',
              }),
            ),
        }),
      ),
    );

    const { invocation, responder } = fakeInvocation({ commandName: 'guardian' });
    await dispatch.dispatch(invocation);

    expect(responder.messages).toHaveLength(1);
    expect(JSON.stringify(responder.messages)).not.toContain('secret');
    expect(telemetry.entries[0]?.outcome).toBe('system_error');
  });

  it('handles a non-Bloom error thrown by a handler', async () => {
    const dispatch = dispatcher(
      registryWith(
        command({
          execute: () => Promise.reject(new TypeError('undefined is not a function')),
        }),
      ),
    );

    const { invocation, responder } = fakeInvocation({ commandName: 'guardian' });
    await dispatch.dispatch(invocation);

    expect(responder.messages).toHaveLength(1);
    expect(responder.visibleText).not.toContain('undefined is not a function');
  });

  it('logs the operator detail even though the member never sees it', async () => {
    const dispatch = dispatcher(
      registryWith(
        command({
          execute: () =>
            Promise.reject(
              bloomError('INTERNAL_ERROR', { operatorHint: 'ledger row missing' }),
            ),
        }),
      ),
    );

    const { invocation } = fakeInvocation({ commandName: 'guardian' });
    await dispatch.dispatch(invocation);

    expect(sink.serialised()).toContain('ledger row missing');
  });

  it('reports a command with no registered handler instead of going silent', async () => {
    const dispatch = dispatcher(registryWith(command()));
    const { invocation, responder } = fakeInvocation({ commandName: 'unknown-command' });

    await dispatch.dispatch(invocation);

    expect(responder.messages).toHaveLength(1);
    expect(telemetry.entries[0]?.errorCode).toBe('NOT_IMPLEMENTED');
    expect(sink.has('command.unknown')).toBe(true);
  });

  it('warns when a handler returns nothing and never responds', async () => {
    const dispatch = dispatcher(
      registryWith(command({ execute: () => Promise.resolve() })),
    );
    const { invocation } = fakeInvocation({ commandName: 'guardian' });

    await dispatch.dispatch(invocation);
    expect(sink.has('command.no_response')).toBe(true);
  });

  /*
   * Telemetry is observability. If recording usage can fail a command, the
   * observability system becomes an availability risk.
   */
  it('does not fail a command when telemetry recording throws', async () => {
    const logging = createTestLogger();
    const dispatch = new CommandDispatcher<Deps>({
      bot: 'guardian',
      config: testConfig(),
      logger: logging.logger,
      registry: registryWith(command()),
      deps: { marker: 'test' },
      telemetry: { record: () => Promise.reject(new Error('telemetry down')) },
    });

    const { invocation, responder } = fakeInvocation({ commandName: 'guardian' });
    await dispatch.dispatch(invocation);

    expect(responder.messages[0]?.content).toBe('ok');
    expect(logging.sink.has('command.telemetry_failed')).toBe(true);
  });

  it('classifies a rate limit separately from a system error', async () => {
    const dispatch = dispatcher(
      registryWith(
        command({ execute: () => Promise.reject(bloomError('RATE_LIMITED')) }),
      ),
    );

    const { invocation } = fakeInvocation({ commandName: 'guardian' });
    await dispatch.dispatch(invocation);

    expect(telemetry.entries[0]?.outcome).toBe('rate_limited');
  });

  it('passes dependencies through to the handler', async () => {
    let seen: Deps | null = null;
    const dispatch = dispatcher(
      registryWith(
        command({
          execute: (_invocation: CommandInvocation, deps: Deps) => {
            seen = deps;
            return Promise.resolve();
          },
        }),
      ),
    );

    const { invocation } = fakeInvocation({ commandName: 'guardian' });
    await dispatch.dispatch(invocation);

    expect(seen).toEqual({ marker: 'test' });
  });
});

describe('CommandRegistry', () => {
  it('refuses two commands with the same name', () => {
    const registry = new CommandRegistry<Deps>('guardian').register(command());
    expect(() => registry.register(command())).toThrow(/unique/i);
  });

  it('refuses a command belonging to another bot', () => {
    const registry = new CommandRegistry<Deps>('guardian');
    expect(() => registry.register(command({ bot: 'companion' }))).toThrow(
      /Companion|companion/,
    );
  });

  it('exposes specs for the registrar', () => {
    const registry = new CommandRegistry<Deps>('guardian').register(command());
    expect(registry.specs().map((entry) => entry.name)).toEqual(['guardian']);
    expect(registry.size).toBe(1);
  });
});

describe('fixtures sanity', () => {
  it('uses distinct ids per persona, so a failing assertion is readable', () => {
    const ids = Object.values(TEST_USER_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
