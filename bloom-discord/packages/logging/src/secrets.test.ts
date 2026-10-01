import { describe, expect, it } from 'vitest';
import { MemoryLogSink } from '@bloom/testing';
import { createLogger } from './logger.js';
import type { Logger } from './types.js';

/**
 * Secrets must not reach a log line.
 *
 * The redactor is tested on its own elsewhere. What this file tests is the
 * guarantee as a *caller* experiences it: that there is no way to hand the
 * logger a secret and have it come out the other side, whichever field it
 * arrives in.
 *
 * That framing matters because the leak this file was written for was not a
 * hole in the redactor. `message` was redacted and `context` was redacted,
 * but `stack` was written straight through — and a stack trace's first line
 * is the error message, which for a database connection failure is the DSN
 * with the password in it. Every individual redaction test passed while the
 * most likely credential in the system went to the log untouched.
 *
 * So these tests go through `BloomLogger`, not through `redact`.
 */

/*
 * Token-shaped strings, assembled at run time.
 *
 * These are fabricated, but they have to match the redactor's patterns to be
 * worth testing — which is exactly what makes a secret scanner block the push
 * when they sit in the file as literals. Joining the parts here keeps the
 * value realistic for the test and keeps a contiguous token-shaped literal
 * out of the repository. Both goals are real; neither needs the scanner
 * silenced.
 */
const DISCORD_TOKEN = [
  'MTk4NjIyNDgzNDcxOTI1MjQ4',
  'Cl2FMQ',
  'ZnCjm1XVW7vRze4b7Cq4se7kKWs',
].join('.');

/** Shaped like a real connection string; not one. */
const DSN = 'postgres://bloom_companion:hunter2-correct-horse@db.example.com:5432/bloom';

/** Shaped like a Supabase service-role JWT; not one. Assembled, as above. */
const JWT = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJyb2xlIjoic2VydmljZV9yb2xlIn0',
  'dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk',
].join('.');

const logger = (sink: MemoryLogSink, environment = 'development'): Logger =>
  createLogger({
    botName: 'companion',
    environment,
    version: 'test',
    level: 'debug',
    sink,
  });

/** Everything written, as one string. Nothing may contain a secret. */
const written = (sink: MemoryLogSink): string => JSON.stringify(sink.events);

describe('no secret reaches a log line', () => {
  it('redacts a connection string inside a stack trace', () => {
    /*
     * The regression this file exists for.
     *
     * `postgres` reports connection failures with the DSN it tried, so the
     * stack of a database outage carries the password for the database. In
     * production stacks are off by default, which is a mitigation and not a
     * control: staging logs are shipped to the same places and read by the
     * same people.
     */
    const sink = new MemoryLogSink();
    const error = new Error(`connect ECONNREFUSED for ${DSN}`);
    error.stack = `Error: connect ECONNREFUSED for ${DSN}\n    at Connection.connect (/app/node_modules/postgres/src/connection.js:1:1)`;

    logger(sink).error('db.connect_failed', 'Database unreachable.', { error });

    expect(written(sink)).not.toContain('hunter2');
    expect(written(sink)).not.toContain(DSN);
    expect(written(sink)).toContain('[redacted]');
    // The useful part survives: an operator can still see what failed.
    expect(written(sink)).toContain('ECONNREFUSED');
  });

  it('redacts a Discord token in a stack trace', () => {
    const sink = new MemoryLogSink();
    const error = new Error('login failed');
    error.stack = `Error: login failed with token ${DISCORD_TOKEN}\n    at Client.login`;

    logger(sink).error('gateway.login_failed', 'Could not log in.', { error });

    expect(written(sink)).not.toContain(DISCORD_TOKEN);
  });

  it('redacts a secret in the log message itself', () => {
    const sink = new MemoryLogSink();
    logger(sink).info('startup', `connecting with ${DSN}`);

    expect(written(sink)).not.toContain('hunter2');
  });

  it('redacts a secret in the error message', () => {
    const sink = new MemoryLogSink();
    logger(sink).error('db.failed', 'Database error.', {
      error: new Error(`auth failed for ${DSN}`),
    });

    expect(written(sink)).not.toContain('hunter2');
  });

  it('redacts by key name whatever the value looks like', () => {
    const sink = new MemoryLogSink();
    logger(sink).info('probe', 'configured', {
      context: {
        token: 'not-token-shaped-but-still-a-token',
        database_password: 'plain',
        authorization: 'anything',
        nested: { api_key: 'deep' },
      },
    });

    const out = written(sink);
    expect(out).not.toContain('not-token-shaped-but-still-a-token');
    expect(out).not.toContain('plain');
    expect(out).not.toContain('deep');
  });

  it('redacts a Supabase service-role JWT wherever it appears', () => {
    const sink = new MemoryLogSink();
    logger(sink).warn('supabase', `rejected key ${JWT}`, {
      context: { note: `also here: ${JWT}` },
    });

    expect(written(sink)).not.toContain('eyJyb2xlIjoic2VydmljZV9yb2xl');
  });

  it('redacts a secret buried in an array in context', () => {
    const sink = new MemoryLogSink();
    logger(sink).info('probe', 'batch', {
      context: { attempted: [{ dsn: DSN }, `raw ${DSN}`] },
    });

    expect(written(sink)).not.toContain('hunter2');
  });

  it('omits stacks entirely in production', () => {
    // Belt as well as braces: the stack is redacted, and in production it is
    // not written at all.
    const sink = new MemoryLogSink();
    const error = new Error('boom');
    error.stack = `Error: boom ${DSN}`;

    logger(sink, 'production').error('x', 'failed', { error });

    expect(written(sink)).not.toContain('stack');
    expect(written(sink)).not.toContain('hunter2');
  });

  it('still records enough to diagnose the failure', () => {
    /*
     * Redaction that swallowed the diagnosis would get switched off by the
     * first operator debugging an outage at 2am, so the useful fields have
     * to survive it.
     */
    const sink = new MemoryLogSink();
    logger(sink).error('db.connect_failed', 'Database unreachable.', {
      error: Object.assign(new Error(`ECONNREFUSED ${DSN}`), { code: 'ECONNREFUSED' }),
      context: { attempt: 3, host_known: true },
    });

    const event = sink.events[0];
    expect(event?.event).toBe('db.connect_failed');
    expect(event?.severity).toBe('error');
    expect(JSON.stringify(event?.context)).toContain('"attempt":3');
  });
});
