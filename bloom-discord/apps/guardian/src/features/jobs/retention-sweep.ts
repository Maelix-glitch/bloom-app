import type { ScheduledJob, JobRunContext } from '@bloom/events';
import { DEFAULT_RETENTION_POLICY, type PruneResult } from '@bloom/database';
import type { GuardianDeps } from '../../deps.js';

/**
 * Nightly housekeeping on the platform's operational tables.
 *
 * Until this job existed, nothing in the system deleted anything. Two
 * repositories had a `pruneExpired` method, `idempotency_keys` had an
 * `expires_at` column, and the migration comment said keys "are pruned after
 * this" — but no caller existed, so every guarded operation, every cooldown,
 * every job run and every command invocation accumulated forever. That is not
 * a problem on day one and it is an incident in year two, which is exactly the
 * kind of thing that has to be fixed before launch rather than after.
 *
 * Owned by Guardian rather than shared. The work is platform-wide, so running
 * it in all three bots would mean three processes contending for the same rows
 * every night to do one table's worth of deletes. The lock would make that
 * safe, not sensible. Guardian is the natural owner: it is the highest-trust
 * bot and the one an operator already looks at when something platform-level
 * is wrong.
 */

/**
 * 04:20, in the configured timezone.
 *
 * Deliberately not on the hour. Everything else in the world is scheduled on
 * the hour, and a nightly delete that lands in the same minute as a backup, a
 * log rotation and two other cron jobs is how a quiet maintenance window turns
 * into a latency spike somebody has to investigate.
 */
const SCHEDULE = '20 4 * * *';

/**
 * Rows per table per run.
 *
 * Sized so a single run is short even on a table that has never been pruned.
 * When a backlog exceeds this the job reports `more` and the next night
 * continues; a first run after launch may take several nights to catch up, and
 * that is the intended behaviour rather than one enormous transaction.
 */
const BATCH_SIZE = 5_000;

/** Well above the realistic worst case for six bounded deletes. */
const LEASE_SECONDS = 600;

export interface RetentionSweepOptions {
  readonly batchSize?: number;
}

export function createRetentionSweepJob(
  deps: GuardianDeps,
  options: RetentionSweepOptions = {},
): ScheduledJob {
  const batchSize = options.batchSize ?? BATCH_SIZE;

  return {
    key: 'platform.retention.prune',
    description:
      'Deletes expired idempotency keys and cooldowns, and operational rows past their retention window.',
    schedule: SCHEDULE,
    /*
     * Always enabled.
     *
     * Unlike the digest jobs, this one has no channel to post to and nothing
     * to misconfigure — and an administrator turning off the only thing that
     * bounds table growth should be a deliberate act with a visible audit
     * entry, which the per-guild runtime switch already provides. There is no
     * reason for it to be off at boot.
     */
    enabled: true,
    leaseSeconds: LEASE_SECONDS,
    /*
     * Platform-wide, so it carries no guild.
     *
     * `idempotency_keys` and `job_runs` hold rows with a null `guild_id`, and
     * a guild-scoped sweep would leave exactly those rows — the platform's
     * own — growing forever.
     */
    guildId: null,
    run: (context) => sweep(deps, context, batchSize),
  };
}

async function sweep(
  deps: GuardianDeps,
  context: JobRunContext,
  batchSize: number,
): Promise<void> {
  const result = await deps.repositories.retention.prune({
    policy: DEFAULT_RETENTION_POLICY,
    batchSize,
  });

  /*
   * A night with nothing to delete is logged and nothing else.
   *
   * No audit row, because an audit log that gains an identical "deleted 0
   * rows" entry every morning is a log people stop reading. The run itself is
   * already recorded in `job_runs`, which is where "did it run" is answered.
   */
  if (result.total === 0) {
    context.logger.info('jobs.retention.clear', 'Nothing was past its retention window.');
    return;
  }

  /*
   * Audited, because this is the one scheduled job that destroys data.
   *
   * Counts only — the audit row says six thousand idempotency keys went, never
   * which ones. `actorId` stays null: nobody did this.
   */
  await deps.repositories.audit.append({
    guildId: deps.config.discord.guildId,
    botName: 'guardian',
    event: 'platform.retention_pruned',
    severity: 'info',
    actorId: null,
    source: context.jobKey,
    details: {
      run_id: context.runId,
      total: result.total,
      more: result.more,
      batch_size: batchSize,
      ...countsForAudit(result),
    },
  });

  context.logger.info(
    'jobs.retention.pruned',
    `Pruned ${String(result.total)} expired rows.`,
    {
      context: {
        total: result.total,
        more: result.more,
        ...countsForAudit(result),
      },
    },
  );

  /*
   * A backlog is reported at warn, not info.
   *
   * One night of catching up after launch is expected. Seeing this every
   * morning for a fortnight means the deletes are not keeping pace with the
   * inserts, and the batch size or the schedule needs to change — which an
   * operator will only know if the log says so.
   */
  if (result.more) {
    context.logger.warn(
      'jobs.retention.backlog',
      'At least one table hit the per-run cap; rows remain past their window.',
      { context: { batch_size: batchSize } },
    );
  }
}

/** Flattens per-table counts into the audit row's flat detail object. */
function countsForAudit(result: PruneResult): Record<string, number> {
  return Object.fromEntries(
    Object.entries(result.deleted).map(([table, count]) => [`deleted_${table}`, count]),
  );
}
