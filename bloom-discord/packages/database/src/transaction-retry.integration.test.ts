import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createLogger } from '@bloom/logging';
import { MemoryLogSink } from '@bloom/testing';
import { createDatabase, type Database } from './client.js';

/**
 * The transaction retry, against a real PostgreSQL.
 *
 * A deadlock cannot be simulated with a fake. It is produced by two real
 * transactions taking two real locks in opposite orders, and it is resolved
 * by PostgreSQL choosing a victim — which is precisely the behaviour under
 * test. A unit test here would be testing a mock's idea of a deadlock.
 *
 * Both halves matter:
 *
 *   • A conflicted transaction is retried and succeeds, so a member whose
 *     command collided with someone else's does not see a failure.
 *   • Everything else is *not* retried. A retry that fired on a connection
 *     error would be the dangerous kind: the transaction may have committed
 *     before the connection dropped, and running it again would apply it
 *     twice. That is the bug this test is here to prevent someone adding.
 */

const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

describe('transaction retry (integration)', () => {
  let database: Database;
  let sink: MemoryLogSink;

  beforeAll(async () => {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is required for integration tests.');

    sink = new MemoryLogSink();
    database = createDatabase({
      url,
      schema: SCHEMA,
      maxConnections: 6,
      idleTimeoutSeconds: 30,
      connectTimeoutSeconds: 10,
      applicationName: 'bloom-transaction-retry-test',
      logger: createLogger({
        botName: 'companion',
        environment: 'test',
        version: 'test',
        level: 'debug',
        sink,
      }),
    });

    await database.sql.unsafe(
      `CREATE TABLE IF NOT EXISTS ${SCHEMA}.retry_probe (id int PRIMARY KEY, n int NOT NULL)`,
    );
  }, 30_000);

  beforeEach(async () => {
    sink.events.length = 0;
    await database.sql.unsafe(`TRUNCATE ${SCHEMA}.retry_probe`);
    await database.sql.unsafe(
      `INSERT INTO ${SCHEMA}.retry_probe (id, n) VALUES (1, 0), (2, 0)`,
    );
  });

  afterAll(async () => {
    await database.sql.unsafe(`DROP TABLE IF EXISTS ${SCHEMA}.retry_probe`);
    await database.close();
  });

  it('retries a real deadlock and lets both transactions succeed', async () => {
    /*
     * Two transactions, two rows, opposite orders. One of them will be
     * chosen as the deadlock victim and rolled back; without the retry that
     * side fails and a member sees "something went wrong" for a collision
     * that cost nobody anything.
     */
    const hold = async (first: number, second: number): Promise<void> => {
      await database.transaction(async (tx) => {
        await tx.unsafe(
          `UPDATE ${SCHEMA}.retry_probe SET n = n + 1 WHERE id = ${String(first)}`,
        );
        // Long enough for the other transaction to take its first lock.
        await new Promise((resolve) => setTimeout(resolve, 120));
        await tx.unsafe(
          `UPDATE ${SCHEMA}.retry_probe SET n = n + 1 WHERE id = ${String(second)}`,
        );
      });
    };

    await Promise.all([hold(1, 2), hold(2, 1)]);

    // Four increments across two rows: both transactions committed in full.
    const rows = await database.sql.unsafe(
      `SELECT sum(n)::int AS total FROM ${SCHEMA}.retry_probe`,
    );
    expect(Number(rows[0]?.['total'])).toBe(4);

    // And it was a retry that made it work, not luck.
    const retried = sink.events.filter(
      (event) => event.event === 'database.transaction_retry',
    );
    expect(retried.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(retried[0]?.context)).toMatch(/40P01|40001/);
  }, 30_000);

  it('does not retry an error that is not a conflict', async () => {
    /*
     * A check violation is a bug in the caller, not contention. Retrying it
     * would turn one clear failure into three identical ones and delay the
     * answer by the backoff.
     */
    let attempts = 0;

    await expect(
      database.transaction(async (tx) => {
        attempts += 1;
        await tx.unsafe(`INSERT INTO ${SCHEMA}.retry_probe (id, n) VALUES (1, 0)`);
      }),
    ).rejects.toThrow();

    expect(attempts).toBe(1);
    expect(
      sink.events.filter((event) => event.event === 'database.transaction_retry'),
    ).toHaveLength(0);
  });

  it('gives up after a bounded number of attempts', async () => {
    /*
     * A permanently conflicting transaction must not retry forever: each
     * attempt holds a connection from a small pool, and an unbounded retry
     * under contention is how a brief spike becomes an outage.
     */
    let attempts = 0;

    await expect(
      database.transaction((): Promise<never> => {
        attempts += 1;
        const error = new Error('deadlock detected') as Error & { code?: string };
        error.code = '40P01';
        return Promise.reject(error);
      }),
    ).rejects.toThrow();

    // The initial attempt plus TRANSACTION_RETRIES.
    expect(attempts).toBe(3);
  });

  it('reports the original error once it stops retrying', async () => {
    await expect(
      database.transaction((): Promise<never> => {
        const error = new Error('serialization failure') as Error & { code?: string };
        error.code = '40001';
        return Promise.reject(error);
      }),
    ).rejects.toThrow(/40001|serialization|conflict/i);
  });
});
