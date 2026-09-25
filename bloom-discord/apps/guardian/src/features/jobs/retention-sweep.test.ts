import { describe, expect, it } from 'vitest';
import { TEST_GUILD_ID } from '@bloom/testing';
import { PRUNABLE_TABLES, type PruneResult } from '@bloom/database';
import type { UserId } from '@bloom/shared-types';
import { guardianHarness, type GuardianHarness } from '../../guardian.harness.js';
import { createRetentionSweepJob } from './retention-sweep.js';

const STAFF = '900000000000000001' as UserId;

/**
 * These tests are about the *decision*, not the deletion.
 *
 * Whether the SQL removes the right rows is a claim about PostgreSQL and is
 * tested against a real one in `retention.integration.test.ts`. What is tested
 * here is everything around it: that the job is registered and schedulable,
 * that a quiet night is silent, that a destructive run is audited, that a
 * backlog is escalated, and that a failing database surfaces as a failed run
 * rather than a success.
 */

function result(
  overrides: Partial<Record<string, number>> = {},
  more = false,
): PruneResult {
  const deleted = Object.fromEntries(
    PRUNABLE_TABLES.map((table) => [table, overrides[table] ?? 0]),
  ) as PruneResult['deleted'];

  return {
    deleted,
    total: Object.values(deleted).reduce((sum, count) => sum + count, 0),
    more,
  };
}

function runJob(harness: GuardianHarness): Promise<void> {
  return harness.scheduler.runNow('platform.retention.prune');
}

describe('platform.retention.prune', () => {
  it('is registered, enabled and scheduled off the hour', () => {
    const harness = guardianHarness();
    const job = harness.scheduler
      .status()
      .find((entry) => entry.key === 'platform.retention.prune');

    expect(job).toBeDefined();
    expect(job?.enabled).toBe(true);
    expect(job?.schedule).toBe('20 4 * * *');
    expect(job?.nextRunAt).toBeInstanceOf(Date);
  });

  it('carries no guild, so platform-wide rows are in scope', () => {
    const harness = guardianHarness();
    const job = createRetentionSweepJob(harness.deps);

    // idempotency_keys and job_runs both hold rows with a null guild_id. A
    // guild-scoped sweep would leave exactly those growing forever.
    expect(job.guildId).toBeNull();
  });

  it('prunes with a bounded batch rather than an unbounded delete', async () => {
    const harness = guardianHarness();
    await runJob(harness);

    const call = harness.repositories.retention.pruneCalls[0];
    expect(call).toBeDefined();
    expect(call?.batchSize).toBeGreaterThan(0);
    expect(call?.policy).toBeDefined();
  });

  it('writes no audit row on a night with nothing to delete', async () => {
    const harness = guardianHarness();
    harness.repositories.retention.nextResult = result();

    await runJob(harness);

    // An audit log that gains an identical "deleted 0 rows" entry every
    // morning is a log people stop reading.
    expect(harness.repositories.audit.events).toHaveLength(0);
    expect(
      harness.logs.events.some((entry) => entry.event === 'jobs.retention.clear'),
    ).toBe(true);
  });

  it('audits a destructive run with per-table counts', async () => {
    const harness = guardianHarness();
    harness.repositories.retention.nextResult = result({
      idempotency_keys: 4_000,
      audit_events: 12,
    });

    await runJob(harness);

    const audited = harness.repositories.audit.events.find(
      (event) => event.event === 'platform.retention_pruned',
    );
    expect(audited).toBeDefined();
    expect(audited?.details).toMatchObject({
      total: 4_012,
      deleted_idempotency_keys: 4_000,
      deleted_audit_events: 12,
      more: false,
    });
  });

  it('attributes the audit row to nobody', async () => {
    const harness = guardianHarness();
    harness.repositories.retention.nextResult = result({ job_runs: 5 });

    await runJob(harness);

    const audited = harness.repositories.audit.events.find(
      (event) => event.event === 'platform.retention_pruned',
    );
    // Attributing scheduled work to a staff member would make the audit log
    // lie in the exact place it is consulted.
    expect(audited?.actorId).toBeNull();
    expect(audited?.source).toBe('platform.retention.prune');
  });

  it('records counts only, never what was deleted', async () => {
    const harness = guardianHarness();
    harness.repositories.retention.nextResult = result({ command_usage: 900 });

    await runJob(harness);

    const audited = harness.repositories.audit.events.find(
      (event) => event.event === 'platform.retention_pruned',
    );
    // Everything except the run id is a count or a flag. Nothing here can
    // carry a row identifier, an idempotency key or a member's words.
    const entries = Object.entries(audited?.details ?? {}).filter(
      ([name]) => name !== 'run_id',
    );
    expect(entries.length).toBeGreaterThan(0);
    expect(
      entries.every(
        ([, value]) => typeof value === 'number' || typeof value === 'boolean',
      ),
    ).toBe(true);
  });

  it('warns when a table hit the cap, so a backlog is visible', async () => {
    const harness = guardianHarness();
    harness.repositories.retention.nextResult = result({ idempotency_keys: 5_000 }, true);

    await runJob(harness);

    const warning = harness.logs.events.find(
      (entry) => entry.event === 'jobs.retention.backlog',
    );
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe('warn');
  });

  it('does not warn when the run cleared everything', async () => {
    const harness = guardianHarness();
    harness.repositories.retention.nextResult = result({ job_runs: 3 }, false);

    await runJob(harness);

    expect(
      harness.logs.events.some((entry) => entry.event === 'jobs.retention.backlog'),
    ).toBe(false);
  });

  it('records a failed run when the database refuses, rather than reporting success', async () => {
    const harness = guardianHarness();
    harness.repositories.retention.failWith = new Error('connection terminated');

    /*
     * The scheduler catches job failures by design — one bad night must not
     * take the whole scheduler down — so this does not reject. What matters is
     * that the failure is *recorded* rather than swallowed into a green run.
     */
    await runJob(harness);

    const status = harness.scheduler
      .status()
      .find((entry) => entry.key === 'platform.retention.prune');
    expect(status?.lastOutcome).toBe('failed');

    expect(
      harness.logs.events.some(
        (entry) => entry.event === 'job.platform.retention.prune.failed',
      ),
    ).toBe(true);

    // Nothing was deleted, so nothing may claim it was.
    expect(harness.repositories.audit.events).toHaveLength(0);
  });

  it('can be switched off per guild like every other scheduled job', async () => {
    const harness = guardianHarness();
    /*
     * A platform-wide job has no guild of its own, so its switch is recorded
     * against the home guild. Before that existed this job could not be turned
     * off at all without a redeployment — see DatabaseJobGate.
     */
    await harness.jobSettings.write(
      TEST_GUILD_ID,
      'platform.retention.prune',
      false,
      STAFF,
    );

    harness.repositories.retention.nextResult = result({ job_runs: 10 });
    await runJob(harness);

    // The gate is consulted on every tick; a disabled job does no work at all.
    expect(harness.repositories.retention.pruneCalls).toHaveLength(0);
  });
});
