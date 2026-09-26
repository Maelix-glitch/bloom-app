import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type GuildId } from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import { createDatabase, type Database } from '../client.js';
import { PostgresIdentityRepository } from './identity.js';
import { PostgresJobRunRepository } from './jobs.js';

/**
 * The job lock, against a real PostgreSQL.
 *
 * This is the one piece of the scheduler that cannot be proven with a fake. The
 * mutual exclusion is not application logic — it is the partial unique index
 *
 *   job_runs_one_active_idx ON (job_key, COALESCE(guild_id, '')) WHERE status = 'running'
 *
 * and an in-memory fake asserting "one holder at a time" is really just
 * asserting that the fake was written that way. Only the database can tell us
 * whether two processes racing on the same key are actually serialised, because
 * only the database is the thing doing the serialising in production.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`, schema already migrated.
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000090001');
const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

describe('job lock (integration)', () => {
  let database: Database;
  let jobs: PostgresJobRunRepository;

  beforeAll(async () => {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL must be set for integration tests.');

    database = createDatabase({
      url,
      schema: SCHEMA,
      // Enough connections that the concurrent acquisitions below are genuinely
      // concurrent rather than queued behind a pool of one.
      maxConnections: 8,
      idleTimeoutSeconds: 5,
      connectTimeoutSeconds: 10,
      applicationName: 'bloom-integration-test',
      logger: createLogger({
        botName: 'platform',
        environment: 'development',
        version: '0.0.0-test',
        level: 'error',
        sink: new JsonLogSink(),
      }),
    });

    jobs = new PostgresJobRunRepository(database);

    const ping = await database.ping();
    if (!ping.ok) throw ping.error ?? new Error('Database unreachable.');

    await new PostgresIdentityRepository(database).upsertGuild({
      guildId: GUILD,
      name: 'Bloom Labs (integration)',
    });
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.job_runs WHERE guild_id = ${GUILD}`;
  });

  it('gives the lease to exactly one of two racing workers', async () => {
    const [first, second] = await Promise.all([
      jobs.acquire({
        jobKey: 'test.race',
        botName: 'guardian',
        guildId: GUILD,
        runnerId: 'worker-a',
        leaseSeconds: 60,
      }),
      jobs.acquire({
        jobKey: 'test.race',
        botName: 'guardian',
        guildId: GUILD,
        runnerId: 'worker-b',
        leaseSeconds: 60,
      }),
    ]);

    const winners = [first, second].filter((lease) => lease !== null);
    expect(winners).toHaveLength(1);

    // The loser is told "someone else has it", not handed an error. A scheduler
    // that has to distinguish a lost race from a broken database on every tick
    // will eventually get it wrong.
    expect(first === null || second === null).toBe(true);
  });

  /*
   * The scale-up case. Ten replicas of the same bot start within a second of
   * each other and every one of their timers fires at 09:00.
   */
  it('serialises ten simultaneous workers down to one run', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 10 }, (_unused, index) =>
        jobs.acquire({
          jobKey: 'test.stampede',
          botName: 'guardian',
          guildId: GUILD,
          runnerId: `worker-${String(index)}`,
          leaseSeconds: 60,
        }),
      ),
    );

    expect(attempts.filter((lease) => lease !== null)).toHaveLength(1);

    const [row] = await database.sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM ${database.sql(SCHEMA)}.job_runs
      WHERE job_key = 'test.stampede' AND guild_id = ${GUILD} AND status = 'running'
    `;
    expect(row?.count).toBe('1');
  });

  it('lets the next worker in once the holder completes', async () => {
    const held = await jobs.acquire({
      jobKey: 'test.sequential',
      botName: 'guardian',
      guildId: GUILD,
      runnerId: 'worker-a',
      leaseSeconds: 60,
    });
    expect(held).not.toBeNull();

    expect(
      await jobs.acquire({
        jobKey: 'test.sequential',
        botName: 'guardian',
        guildId: GUILD,
        runnerId: 'worker-b',
        leaseSeconds: 60,
      }),
    ).toBeNull();

    await jobs.complete(held?.runId ?? '', 'succeeded');

    const next = await jobs.acquire({
      jobKey: 'test.sequential',
      botName: 'guardian',
      guildId: GUILD,
      runnerId: 'worker-b',
      leaseSeconds: 60,
    });
    expect(next).not.toBeNull();
    // Attempts count up across holders, so a job failing on every replica in
    // turn is visible as one escalating sequence rather than a reset.
    expect(next?.attempt).toBe(2);
  });

  /*
   * The crash case. A worker takes the lease and its process dies, so `complete`
   * is never called. Without reclamation the job is blocked forever, which is
   * the failure mode that makes people distrust schedulers.
   */
  it('reclaims a lapsed lease so a crashed worker cannot block a job forever', async () => {
    const lease = await jobs.acquire({
      jobKey: 'test.crashed',
      botName: 'guardian',
      guildId: GUILD,
      runnerId: 'worker-that-died',
      // Clamped up to the 5s minimum by the repository, so expire it by hand
      // rather than making the suite sleep.
      leaseSeconds: 5,
    });
    expect(lease).not.toBeNull();

    await database.sql`
      UPDATE ${database.sql(SCHEMA)}.job_runs
      SET lease_expires_at = now() - interval '1 minute'
      WHERE id = ${lease?.runId ?? ''}
    `;

    const next = await jobs.acquire({
      jobKey: 'test.crashed',
      botName: 'guardian',
      guildId: GUILD,
      runnerId: 'worker-that-lived',
      leaseSeconds: 60,
    });
    expect(next).not.toBeNull();

    // The abandoned run is recorded, not silently deleted: "this job has died
    // three times this week" is the signal an operator needs. It is marked
    // `timed_out` rather than `failed`, which is a genuine distinction —
    // `failed` means the job ran and raised, `timed_out` means nobody ever
    // heard back, and they point at different problems.
    const summary = await jobs.lastRun('test.crashed', GUILD);
    expect(summary?.runnerId).toBe('worker-that-lived');

    const [dead] = await database.sql<{ status: string }[]>`
      SELECT status FROM ${database.sql(SCHEMA)}.job_runs WHERE id = ${lease?.runId ?? ''}
    `;
    expect(dead?.status).toBe('timed_out');
  });

  it('renewal keeps a lease out of reach of a competing worker', async () => {
    const lease = await jobs.acquire({
      jobKey: 'test.renewal',
      botName: 'guardian',
      guildId: GUILD,
      runnerId: 'long-runner',
      leaseSeconds: 5,
    });
    expect(lease).not.toBeNull();

    // Age it to the brink, as a slow job would.
    await database.sql`
      UPDATE ${database.sql(SCHEMA)}.job_runs
      SET lease_expires_at = now() - interval '1 second'
      WHERE id = ${lease?.runId ?? ''}
    `;

    expect(await jobs.renew(lease?.runId ?? '', 300)).toBe(true);

    // The heartbeat got there first, so the job is still exclusively held.
    expect(
      await jobs.acquire({
        jobKey: 'test.renewal',
        botName: 'guardian',
        guildId: GUILD,
        runnerId: 'would-be-thief',
        leaseSeconds: 60,
      }),
    ).toBeNull();
  });

  it('refuses to renew a lease that is already finished', async () => {
    const lease = await jobs.acquire({
      jobKey: 'test.renew_after_done',
      botName: 'guardian',
      guildId: GUILD,
      runnerId: 'worker-a',
      leaseSeconds: 60,
    });
    await jobs.complete(lease?.runId ?? '', 'succeeded');

    // `false`, not a throw: this is how the scheduler learns it has lost the
    // lease, and it must be able to tell that apart from a database outage.
    expect(await jobs.renew(lease?.runId ?? '', 60)).toBe(false);
  });

  it('keeps the same job key independent across guilds', async () => {
    const other = unsafeSnowflake<GuildId>('100000000000090002');
    await new PostgresIdentityRepository(database).upsertGuild({
      guildId: other,
      name: 'Another guild (integration)',
    });

    try {
      const first = await jobs.acquire({
        jobKey: 'test.per_guild',
        botName: 'guardian',
        guildId: GUILD,
        runnerId: 'worker-a',
        leaseSeconds: 60,
      });
      const second = await jobs.acquire({
        jobKey: 'test.per_guild',
        botName: 'guardian',
        guildId: other,
        runnerId: 'worker-b',
        leaseSeconds: 60,
      });

      // Both succeed: the index keys on (job_key, guild_id), so one community's
      // digest never blocks another's.
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    } finally {
      await database.sql`DELETE FROM ${database.sql(SCHEMA)}.job_runs WHERE guild_id = ${other}`;
    }
  });

  it('records the failure code and the operator hint for a failed run', async () => {
    const lease = await jobs.acquire({
      jobKey: 'test.failure',
      botName: 'guardian',
      guildId: GUILD,
      runnerId: 'worker-a',
      leaseSeconds: 60,
    });
    await jobs.complete(lease?.runId ?? '', 'failed', {
      errorCode: 'CHANNEL_NOT_FOUND',
      errorMessage: 'CHANNEL_MODERATION points at a deleted channel.',
    });

    const summary = await jobs.lastRun('test.failure', GUILD);
    expect(summary?.status).toBe('failed');
    expect(summary?.errorCode).toBe('CHANNEL_NOT_FOUND');
    expect(summary?.errorMessage).toContain('deleted channel');
    expect(summary?.durationMs).toBeGreaterThanOrEqual(0);
  });
});
