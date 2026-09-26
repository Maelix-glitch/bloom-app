import { describe, expect, it } from 'vitest';
import { bloomError, unsafeSnowflake, type GuildId } from '@bloom/shared-types';
import { newCorrelationId, withCorrelation } from '@bloom/utils';
import { MemoryLogSink } from '@bloom/testing';
import { createLogger } from './logger.js';

function setup(level: 'trace' | 'info' = 'trace'): {
  logger: ReturnType<typeof createLogger>;
  sink: MemoryLogSink;
} {
  const sink = new MemoryLogSink();
  const logger = createLogger({
    botName: 'guardian',
    environment: 'test',
    version: '1.2.3',
    level,
    sink,
  });
  return { logger, sink };
}

describe('createLogger', () => {
  it('stamps every line with bot, environment, version and a timestamp', () => {
    const { logger, sink } = setup();
    logger.info('test.event', 'A thing happened.');

    const event = sink.events[0];
    expect(event?.bot_name).toBe('guardian');
    expect(event?.environment).toBe('test');
    expect(event?.version).toBe('1.2.3');
    expect(event?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('honours the configured level', () => {
    const { logger, sink } = setup('info');
    logger.debug('test.debug', 'Should not appear.');
    logger.info('test.info', 'Should appear.');

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]?.event).toBe('test.info');
  });

  it('carries child bindings onto every line', () => {
    const { logger, sink } = setup();
    logger
      .child({ guild_id: unsafeSnowflake<GuildId>('900000000000000001') })
      .info('test.event', 'Bound.');

    expect(sink.events[0]?.guild_id).toBe('900000000000000001');
  });

  /*
   * Correlation is what makes a multi-step operation readable in an aggregator.
   * Taking it from ambient async context means callers never have to thread an
   * id through every function signature, and never forget to.
   */
  it('picks up the ambient correlation id', async () => {
    const { logger, sink } = setup();
    const correlationId = newCorrelationId();

    await withCorrelation(() => {
      logger.info('test.event', 'Inside a correlated scope.');
      return Promise.resolve();
    }, correlationId);

    expect(sink.events[0]?.correlation_id).toBe(correlationId);
  });

  /*
   * Redaction is mandatory, not opt-in. A caller who logs a whole config object
   * by mistake must not be able to leak a token, because that mistake is
   * inevitable and the consequence is a rotated credential at best.
   */
  it('redacts secrets in context regardless of how they arrive', () => {
    const { logger, sink } = setup();

    logger.info('test.event', 'Config loaded.', {
      context: {
        token: 'MTIzNDU2Nzg5MDEyMzQ1Njc4.GaBcDe.super-secret',
        DATABASE_URL: 'postgresql://bloom:hunter2@db:5432/postgres',
        nested: { authorization: 'Bearer abc123' },
        harmless: 'visible',
      },
    });

    const serialised = sink.serialised();
    expect(serialised).not.toContain('super-secret');
    expect(serialised).not.toContain('hunter2');
    expect(serialised).not.toContain('abc123');
    expect(serialised).toContain('visible');
  });

  it('records a Bloom error with its code and operator hint', () => {
    const { logger, sink } = setup();
    logger.error('test.failed', 'It failed.', {
      error: bloomError('ROLE_HIERARCHY_BLOCKED', {
        operatorHint: 'Move the bot role up.',
      }),
    });

    expect(sink.serialised()).toContain('ROLE_HIERARCHY_BLOCKED');
    expect(sink.serialised()).toContain('Move the bot role up.');
  });

  it('normalises an arbitrary thrown value', () => {
    const { logger, sink } = setup();
    logger.error('test.failed', 'Something threw a string.', { error: 'plain string' });

    expect(sink.events).toHaveLength(1);
    expect(sink.serialised()).toContain('plain string');
  });

  it('log() takes the severity at runtime, for the error boundary', () => {
    const { logger, sink } = setup();
    logger.log('warn', 'test.event', 'Chosen at runtime.');
    expect(sink.events[0]?.severity).toBe('warn');
  });

  it('startTimer measures and emits exactly one line', () => {
    const { logger, sink } = setup();
    const done = logger.startTimer('test.timed');
    done('Finished.');

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]?.duration_ms).toBeTypeOf('number');
    expect(sink.events[0]?.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('produces JSON-serialisable events', () => {
    const { logger, sink } = setup();
    logger.info('test.event', 'Serialisable.', { context: { count: 1, ok: true } });

    expect(() => JSON.stringify(sink.events[0])).not.toThrow();
  });
});
